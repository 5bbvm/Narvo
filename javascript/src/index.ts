import { LexiconConfig, NarvoOptions, NarvoResult, IntensityTier } from './types';

// Re-export all public types so consumers can import them from the package root
export { LexiconConfig, NarvoOptions, NarvoResult, IntensityTier } from './types';

/**
 * A pure, standalone scoring module with ZERO dependencies.
 *
 * Evaluates the "worthiness" or significance of text using a deterministic
 * lexicon-based approach with morphological stemming. Returns a structured
 * result with score decomposition, matched words, and text metadata.
 *
 * Usage:
 * ```ts
 * import { TextWorthinessScorer } from 'narvo';
 * import lexiconData from './dictionary.json';
 *
 * const scorer = new TextWorthinessScorer(lexiconData);
 * const result = scorer.score("I finally graduated college today!");
 * console.log(result.score);        // 0.0 – 1.0
 * console.log(result.hits.critical); // ["graduated", "college"]
 * ```
 */
export class TextWorthinessScorer {
    private stemMap = new Map<string, IntensityTier>();
    private phraseMap = new Map<string, IntensityTier>();
    private phraseRegex: RegExp | null = null;
    private stemFunc: (word: string) => string;

    // Maps each stem back to its original dictionary word for human-readable hit output
    private stemToOriginal = new Map<string, string>();

    private superlativePattern: RegExp | null = null;
    private experientialPattern: RegExp | null = null;

    private negators = new Set<string>();
    private alpha: number = 4.0;

    constructor(config: LexiconConfig, options: NarvoOptions = {}) {
        if (config.metadata?.alpha !== undefined) this.alpha = config.metadata.alpha;
        if (options.alpha !== undefined) this.alpha = options.alpha;

        if (config.metadata?.negators) {
            for (const n of config.metadata.negators) {
                const lower = n.toLowerCase();
                this.negators.add(lower);
                // For contractions like "don't", also register the split form
                // since \p{L}+ tokenizer splits on apostrophe: "don't" → ["don", "t"]
                // We register "don" so that "don" followed by "t" can be checked
                if (lower.includes("'")) {
                    const parts = lower.split("'");
                    if (parts.length === 2 && parts[1] === 't') {
                        this.negators.add(parts[0]);
                    }
                }
            }
        }

        this.stemFunc = this.createStemmer(config.metadata?.suffixes || []);
        this.parseLexicon(config);

        // Build amplifier patterns from config (Issue 9: moved out of hardcoded class)
        if (config.amplifier_patterns?.superlatives && config.amplifier_patterns.superlatives.length > 0) {
            const escaped = config.amplifier_patterns.superlatives.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            this.superlativePattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
        }
        if (config.amplifier_patterns?.experiential && config.amplifier_patterns.experiential.length > 0) {
            // Experiential phrases can contain spaces (e.g., "first ever"),
            // so we don't use \b which fails at word boundaries inside multi-word patterns.
            // Instead, use lookahead/lookbehind for non-letter boundaries.
            const escaped = config.amplifier_patterns.experiential.map(s =>
                s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
            );
            this.experientialPattern = new RegExp(`(?<=^|[^\\p{L}])(${escaped.join('|')})(?=[^\\p{L}]|$)`, 'giu');
        }
    }

    // ========================================================================
    // STEMMER — Lightweight morphological stemmer with zero dependencies
    // ========================================================================

    private createStemmer(suffixes: string[]): (word: string) => string {
        const sortedSuffixes = [...suffixes].sort((a, b) => b.length - a.length);

        // Common English vowels for morphological rule checks
        const isVowel = (c: string) => 'aeiou'.includes(c);
        const isConsonant = (c: string) => c >= 'a' && c <= 'z' && !isVowel(c);

        return (word: string): string => {
            let w = word.toLowerCase();

            // Rule 1: -ies → y (worries → worry, but not "series")
            if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';

            // Rule 2: -ied → y (carried → carry)
            if (w.endsWith('ied') && w.length > 4) return w.slice(0, -3) + 'y';

            // Rule 3: -ying → y+stem (dying → dy is too short, so skip; trying → try)
            if (w.endsWith('ying') && w.length > 4) {
                const base = w.slice(0, -4);
                if (base.length >= 2) return base + 'y';
            }

            // Apply suffix stripping with morphological corrections
            for (const suf of sortedSuffixes) {
                if (w.endsWith(suf) && w.length - suf.length >= 3) {
                    const base = w.slice(0, -suf.length);

                    // Rule 4: Consonant doubling (running → run, sitting → sit)
                    // Exceptions: 'ss', 'll', 'ff', 'zz' are natural doubles, don't reduce
                    if (base.length >= 3
                        && base[base.length - 1] === base[base.length - 2]
                        && isConsonant(base[base.length - 1])
                        && !['s', 'l', 'f', 'z'].includes(base[base.length - 1])) {
                        return base.slice(0, -1);
                    }

                    // Rule 5: Silent-e restoration (hoping → hop + e = hope, caring → car + e = care)
                    // Heuristic: if base ends in a single consonant preceded by a single vowel,
                    // and the suffix was "ing" or "ed", restore the silent 'e'.
                    if ((suf === 'ing' || suf === 'ed') && base.length >= 3) {
                        const lastChar = base[base.length - 1];
                        const secondLast = base[base.length - 2];
                        const thirdLast = base[base.length - 3];
                        if (isConsonant(lastChar)
                            && isVowel(secondLast)
                            && isConsonant(thirdLast)
                            // Don't restore 'e' for short bases that end in common non-silent-e patterns
                            && !['w', 'x', 'y'].includes(lastChar)) {
                            return base + 'e';
                        }
                    }

                    return base;
                }
            }
            return w;
        };
    }

    // ========================================================================
    // LEXICON PARSING
    // ========================================================================

    private parseLexicon(jsonData: LexiconConfig): void {
        const critical = new Set<string>();
        const high = new Set<string>();
        const medium = new Set<string>();

        const categories = jsonData.categories || {};

        for (const catKey in categories) {
            const cat = categories[catKey];

            // Handle Variant A: weight_groups
            if (cat.weight_groups) {
                if (cat.weight_groups.critical) cat.weight_groups.critical.forEach((w: string) => critical.add(w));
                if (cat.weight_groups.high) cat.weight_groups.high.forEach((w: string) => high.add(w));
                if (cat.weight_groups.medium) cat.weight_groups.medium.forEach((w: string) => medium.add(w));
            }

            // Handle Variant B: weight + words
            if (cat.weight && cat.words) {
                const weight = cat.weight as IntensityTier;
                cat.words.forEach((w: string) => {
                    if (weight === 'critical') critical.add(w);
                    else if (weight === 'high') high.add(w);
                    else if (weight === 'medium') medium.add(w);
                });
            }
        }

        const addSet = (wordSet: Set<string>, tier: IntensityTier): void => {
            wordSet.forEach(originalWord => {
                const w = originalWord.toLowerCase();
                if (w.includes(' ') || w.includes('-')) {
                    // Multi-word phrase — store as phrase
                    const existing = this.phraseMap.get(w);
                    if (!existing || tier === 'critical' || (tier === 'high' && existing === 'medium')) {
                        this.phraseMap.set(w, tier);
                    }
                } else {
                    // Single word — store both stem and exact form
                    const stem = this.stemFunc(originalWord);
                    const existing = this.stemMap.get(stem);
                    if (!existing || tier === 'critical' || (tier === 'high' && existing === 'medium')) {
                        this.stemMap.set(stem, tier);
                        // Track the original dictionary word for this stem
                        this.stemToOriginal.set(stem, w);
                    }

                    const exactExisting = this.stemMap.get(w);
                    if (!exactExisting || tier === 'critical' || (tier === 'high' && exactExisting === 'medium')) {
                        this.stemMap.set(w, tier);
                        this.stemToOriginal.set(w, w);
                    }
                }
            });
        };

        // Order matters: medium first so higher tiers overwrite
        addSet(medium, 'medium');
        addSet(high, 'high');
        addSet(critical, 'critical');

        this.phraseRegex = this.buildPhraseRegex(this.phraseMap);
    }

    private buildPhraseRegex(phraseMap: Map<string, IntensityTier>): RegExp | null {
        const phrases = Array.from(phraseMap.keys());
        if (phrases.length === 0) return null;

        // Sort longest first so greedy alternation matches the longest phrase
        phrases.sort((a, b) => b.length - a.length);

        const escaped = phrases.map(p => {
            const strictEscaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return strictEscaped.replace(/(\\?-|\s)+/g, '[\\s\\-]+');
        });
        return new RegExp(`(?<=^|[^\\p{L}])(${escaped.join('|')})(?=[^\\p{L}]|$)`, 'giu');
    }

    // ========================================================================
    // NEGATION DETECTION
    // ========================================================================

    /**
     * Checks if the word at `index` in the `words` array is negated
     * by looking back up to 3 words for a negator.
     * 
     * Handles contractions: since `\p{L}+` splits "don't" into ["don", "t"],
     * we check if any of the preceding words is a known negator stem
     * (e.g., "don" from "don't").
     */
    private isNegated(index: number, words: string[]): boolean {
        const start = Math.max(0, index - 3);
        for (let i = start; i < index; i++) {
            if (this.negators.has(words[i])) return true;
        }
        return false;
    }

    // ========================================================================
    // MAIN SCORING ENGINE
    // ========================================================================

    /**
     * Deterministic scoring mechanism.
     * Takes raw text and returns a structured NarvoResult.
     *
     * @param text The raw text to process
     * @returns NarvoResult with score [0, 1], sub-scores, matched words, and metadata
     */
    public score(text: string): NarvoResult {
        const emptyResult: NarvoResult = {
            score: 0, lexicon: 0, structure: 0,
            hits: { critical: [], high: [], medium: [] },
            meta: { wordCount: 0, uniqueWordCount: 0, sentenceCount: 0, lexicalDiversity: 0 }
        };

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return emptyResult;
        }

        const lowerText = text.toLowerCase();
        const wordsRaw = lowerText.match(/\p{L}+/gu) || [];
        const wordCount = wordsRaw.length;
        const charCount = text.length;

        if (wordCount === 0) {
            return emptyResult;
        }

        const uniqueWords = new Set(wordsRaw);
        const uniqueWordCount = uniqueWords.size;
        const lexicalDiversity = uniqueWordCount / wordCount;

        // ==========================================
        // COMPONENT 1: LEXICON SCORING (80% weight)
        // ==========================================
        const hitCritical: string[] = [];
        const hitHigh: string[] = [];
        const hitMedium: string[] = [];
        let rawLexiconScore = 0;

        const hitPhrases = new Set<string>();
        let processedText = lowerText;

        // --- Phase 1: Match multi-word phrases first ---
        if (this.phraseRegex) {
            const phraseMatches = lowerText.matchAll(this.phraseRegex);
            for (const match of phraseMatches) {
                const phrase = match[0].toLowerCase().replace(/[\s\-]+/g, ' ');
                let tier = this.phraseMap.get(phrase);

                if (tier && !hitPhrases.has(phrase)) {
                    hitPhrases.add(phrase);

                    // Negation check for phrases: inspect the text immediately before the match
                    const indexInText = match.index || 0;
                    const textBefore = lowerText.substring(Math.max(0, indexInText - 20), indexInText);
                    const wordsBefore = textBefore.match(/\p{L}+/gu) || [];
                    const isNeg = wordsBefore.slice(-3).some(w => this.negators.has(w));

                    if (isNeg) {
                        if (tier === 'critical') tier = 'high';
                        else if (tier === 'high') tier = 'medium';
                        else tier = undefined;
                    }

                    if (tier === 'critical') { hitCritical.push(phrase); rawLexiconScore += 0.5; }
                    else if (tier === 'high') { hitHigh.push(phrase); rawLexiconScore += 0.3; }
                    else if (tier === 'medium') { hitMedium.push(phrase); rawLexiconScore += 0.1; }
                }
            }
            // Erase matched phrases so their constituent words aren't double-counted
            processedText = lowerText.replace(this.phraseRegex, (m) => ' '.repeat(m.length));
        }

        // --- Phase 2: Match individual words against stem map ---
        const wordHitSet = new Set<string>();

        for (let i = 0; i < wordsRaw.length; i++) {
            const rawWord = wordsRaw[i];

            // Check if this word position was erased by a phrase match
            // by checking character offset in the processed text
            // We use a simpler approach: check if the stem produces a hit
            const stem = this.stemFunc(rawWord);
            let tier = this.stemMap.get(stem) || this.stemMap.get(rawWord);

            if (tier && !wordHitSet.has(stem)) {
                // Verify this word wasn't part of an erased phrase
                // Quick check: does the processed text still contain this word at approximately the right position?
                const wordIndex = this.findWordInProcessed(processedText, rawWord, i, wordsRaw);
                if (wordIndex === -1) continue;

                wordHitSet.add(stem);

                // Apply negation downgrade
                if (this.isNegated(i, wordsRaw)) {
                    if (tier === 'critical') tier = 'high';
                    else if (tier === 'high') tier = 'medium';
                    else tier = undefined;
                }

                // Use the original dictionary word (not the stem) for the hit list
                const displayWord = this.stemToOriginal.get(stem) || this.stemToOriginal.get(rawWord) || rawWord;

                if (tier === 'critical') { hitCritical.push(displayWord); rawLexiconScore += 0.5; }
                else if (tier === 'high') { hitHigh.push(displayWord); rawLexiconScore += 0.3; }
                else if (tier === 'medium') { hitMedium.push(displayWord); rawLexiconScore += 0.1; }
            }
        }

        // --- Phase 3: Amplifier bonuses (graduated, not step-functions) ---
        if (this.superlativePattern) {
            const matches = text.match(this.superlativePattern) || [];
            if (matches.length > 0) {
                rawLexiconScore += Math.min(0.12, matches.length * 0.04);
            }
        }

        if (this.experientialPattern) {
            const matches = text.match(this.experientialPattern) || [];
            if (matches.length > 0) {
                rawLexiconScore += Math.min(0.15, matches.length * 0.05);
            }
        }

        const exclamationCount = (text.match(/!/g) || []).length;
        if (exclamationCount > 0) {
            rawLexiconScore += Math.min(0.10, exclamationCount * 0.03);
        }

        // Apply VADER-inspired normalization: x / sqrt(x² + α)
        // This creates a smooth, diminishing-returns curve that naturally saturates toward 1.0
        const lexiconScore = rawLexiconScore > 0
            ? rawLexiconScore / Math.sqrt(rawLexiconScore * rawLexiconScore + this.alpha)
            : 0;

        // ==========================================
        // COMPONENT 2: STRUCTURAL COMPLEXITY (20%)
        // ==========================================
        let structureScore = 0;

        // Lexical Diversity (TTR) — penalizes repetitive text, rewards varied vocabulary
        structureScore += lexicalDiversity * 0.4;

        // Text length tiers (reduced from original to prevent over-contribution)
        if (charCount >= 300) structureScore += 0.20;
        else if (charCount >= 150) structureScore += 0.10;
        else if (charCount >= 60) structureScore += 0.05;

        // Sentence structure signals
        const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);

        if (avgWordsPerSentence > 4) structureScore += 0.10;
        if (sentenceCount > 1) structureScore += 0.10;

        // Complexity markers
        const hasNumbers = /\d/.test(text);
        const hasProperNouns = /[^.!?¡¿]\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{2,}/u.test(text);
        const hasPunctuation = /[?…]/.test(text);
        const hasQuotes = /["']/.test(text);

        if (hasNumbers) structureScore += 0.05;
        if (hasProperNouns) structureScore += 0.05;
        if (hasPunctuation) structureScore += 0.05;
        if (hasQuotes) structureScore += 0.05;

        structureScore = Math.min(1.0, structureScore);

        // ==========================================
        // FINAL BLEND — Fixed 80/20 weights (Issue 4: no dynamic shifting)
        // ==========================================
        const lexicalWeight = 0.80;
        const structureWeight = 0.20;

        const totalScore = (lexiconScore * lexicalWeight) + (structureScore * structureWeight);

        return {
            score: Math.min(Math.max(totalScore, 0), 1),
            lexicon: Number(lexiconScore.toFixed(4)),
            structure: Number(structureScore.toFixed(4)),
            hits: {
                critical: hitCritical,
                high: hitHigh,
                medium: hitMedium
            },
            meta: {
                wordCount,
                uniqueWordCount,
                sentenceCount,
                lexicalDiversity: Number(lexicalDiversity.toFixed(4))
            }
        };
    }

    /**
     * Checks whether a word at position `wordIndex` in the original text
     * still exists in the processedText (i.e., wasn't erased by a phrase match).
     * Returns the character index if found, -1 if erased.
     */
    private findWordInProcessed(processedText: string, word: string, _wordIndex: number, _allWords: string[]): number {
        // Simple approach: check if the word appears in processed text as a standalone word
        const regex = new RegExp(`(?<=^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^\\p{L}]|$)`, 'iu');
        const match = processedText.match(regex);
        return match ? (match.index ?? 0) : -1;
    }
}
