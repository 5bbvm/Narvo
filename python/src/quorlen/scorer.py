import math
import regex
from typing import List, Dict, Set, Optional, Callable
from .types import (
    LexiconConfig,
    QuorlenOptions,
    QuorlenResult,
    QuorlenResultHits,
    QuorlenResultMeta,
    IntensityTier,
    SignificanceTier
)

def escape_special_chars(s: str) -> str:
    """Escapes regex special characters without touching spaces or hyphens."""
    special_chars = r".*+?^${}()|[]\\"
    return "".join(f"\\{c}" if c in special_chars else c for c in s)

class TextWorthinessScorer:
    """Deterministic text significance and intensity evaluator."""

    def __init__(self, config: LexiconConfig, options: Optional[QuorlenOptions] = None):
        if options is None:
            options = {}

        self.stem_map: Dict[str, IntensityTier] = {}
        self.phrase_map: Dict[str, IntensityTier] = {}
        self.phrase_regex: Optional[regex.Pattern] = None
        
        # Maps each stem back to its original dictionary word for human-readable hit output
        self.stem_to_original: Dict[str, str] = {}
        
        self.superlative_pattern: Optional[regex.Pattern] = None
        self.experiential_pattern: Optional[regex.Pattern] = None
        self.negators: Set[str] = set()
        self.alpha: float = 4.0

        metadata = config.get("metadata", {})
        if "alpha" in metadata and metadata["alpha"] is not None:
            self.alpha = float(metadata["alpha"])
        if "alpha" in options and options["alpha"] is not None:
            self.alpha = float(options["alpha"])

        if "negators" in metadata and metadata["negators"]:
            for n in metadata["negators"]:
                lower = n.lower()
                self.negators.add(lower)

                # Track split contraction forms (e.g. "don't" -> "don" and "t")
                if "'" in lower:
                    parts = lower.split("'")
                    if len(parts) == 2 and parts[1] == "t":
                        self.negators.add(parts[0])

        suffixes = metadata.get("suffixes", [])
        self.stem_func = self._create_stemmer(suffixes)
        self._parse_lexicon(config)

        amp_patterns = config.get("amplifier_patterns", {})
        superlatives = amp_patterns.get("superlatives", [])
        if superlatives:
            escaped = [escape_special_chars(s) for s in superlatives]
            self.superlative_pattern = regex.compile(
                rf"\b({'|'.join(escaped)})\b", regex.IGNORECASE
            )

        experiential = amp_patterns.get("experiential", [])
        if experiential:
            # Replaces spaces with \s+ to match multiline or extra spaces
            escaped = [
                regex.sub(r"\s+", lambda m: r"\s+", escape_special_chars(s)) for s in experiential
            ]
            self.experiential_pattern = regex.compile(
                rf"(?<=^|[^\p{{L}}])({'|'.join(escaped)})(?=[^\p{{L}}]|$)",
                regex.IGNORECASE | regex.UNICODE
            )

    def _create_stemmer(self, suffixes: List[str]) -> Callable[[str], str]:
        sorted_suffixes = sorted(suffixes, key=len, reverse=True)
        
        def is_vowel(c: str) -> bool:
            return c in "aeiou"

        def is_consonant(c: str) -> bool:
            return len(c) == 1 and "a" <= c <= "z" and not is_vowel(c)

        def stem(word: str) -> str:
            w = word.lower()

            # Suffix transforms
            if w.endswith("ies") and len(w) > 4:
                return w[:-3] + "y"
            if w.endswith("ied") and len(w) > 4:
                return w[:-3] + "y"
            if w.endswith("ying") and len(w) > 4:
                base = w[:-4]
                if len(base) >= 2:
                    return base + "y"

            for suf in sorted_suffixes:
                if w.endswith(suf) and len(w) - len(suf) >= 3:
                    base = w[:-len(suf)]

                    # Consonant doubling (e.g. running -> run)
                    if (
                        len(base) >= 3
                        and base[-1] == base[-2]
                        and is_consonant(base[-1])
                        and base[-1] not in ("s", "l", "f", "z")
                    ):
                        return base[:-1]

                    # Silent-e restoration (e.g. hoping -> hope)
                    if suf in ("ing", "ed") and len(base) >= 3:
                        last_char = base[-1]
                        second_last = base[-2]
                        third_last = base[-3]
                        if (
                            is_consonant(last_char)
                            and is_vowel(second_last)
                            and is_consonant(third_last)
                            and last_char not in ("w", "x", "y")
                        ):
                            return base + "e"

                    return base
            return w

        return stem

    def _parse_lexicon(self, config: LexiconConfig) -> None:
        critical: Dict[str, None] = {}
        high: Dict[str, None] = {}
        medium: Dict[str, None] = {}
        categories = config.get("categories", {})

        for cat in categories.values():
            if "weight_groups" in cat:
                wg = cat["weight_groups"]
                if "critical" in wg:
                    for w in wg["critical"]:
                        critical[w] = None
                if "high" in wg:
                    for w in wg["high"]:
                        high[w] = None
                if "medium" in wg:
                    for w in wg["medium"]:
                        medium[w] = None

            if "weight" in cat and "words" in cat:
                weight = cat["weight"]
                words = cat["words"]
                if weight == "critical":
                    for w in words:
                        critical[w] = None
                elif weight == "high":
                    for w in words:
                        high[w] = None
                elif weight == "medium":
                    for w in words:
                        medium[w] = None

        def add_set(word_set: Dict[str, None], tier: IntensityTier) -> None:
            for original_word in word_set:
                w = original_word.lower()
                if " " in w or "-" in w:
                    existing = self.phrase_map.get(w)
                    if not existing or tier == "critical" or (tier == "high" and existing == "medium"):
                        self.phrase_map[w] = tier
                else:
                    stem = self.stem_func(original_word)
                    existing = self.stem_map.get(stem)
                    if not existing or tier == "critical" or (tier == "high" and existing == "medium"):
                        self.stem_map[stem] = tier
                        self.stem_to_original[stem] = w

                    exact_existing = self.stem_map.get(w)
                    if not exact_existing or tier == "critical" or (tier == "high" and exact_existing == "medium"):
                        self.stem_map[w] = tier
                        self.stem_to_original[w] = w

        add_set(medium, "medium")
        add_set(high, "high")
        add_set(critical, "critical")

        self.phrase_regex = self._build_phrase_regex(self.phrase_map)

    def _build_phrase_regex(self, phrase_map: Dict[str, IntensityTier]) -> Optional[regex.Pattern]:
        phrases = list(phrase_map.keys())
        if not phrases:
            return None

        # Sort longer phrases first to match them first
        phrases.sort(key=len, reverse=True)

        escaped = []
        for p in phrases:
            strict_escaped = escape_special_chars(p)
            escaped.append(regex.sub(r"(\\?-|\s)+", lambda m: r"[\s\-]+", strict_escaped))

        pattern_str = rf"(?<=^|[^\p{{L}}])({'|'.join(escaped)})(?=[^\p{{L}}]|$)"
        return regex.compile(pattern_str, regex.IGNORECASE | regex.UNICODE)

    def _is_negated(self, index: int, words: List[str]) -> bool:
        start = max(0, index - 3)
        for i in range(start, index):
            if words[i] in self.negators:
                return True
        return False

    def _find_word_in_processed(self, processed_text: str, word: str) -> int:
        escaped_word = escape_special_chars(word)
        pattern = regex.compile(
            rf"(?<=^|[^\p{{L}}]){escaped_word}(?=[^\p{{L}}]|$)",
            regex.IGNORECASE | regex.UNICODE
        )
        match = pattern.search(processed_text)
        return match.start() if match else -1

    def score(self, text: str) -> QuorlenResult:
        """Evaluates the worthiness and intensity of a text segment."""
        empty_result = QuorlenResult(
            score=0.0,
            tier="Routine",
            lexicon=0.0,
            structure=0.0,
            hits=QuorlenResultHits(),
            meta=QuorlenResultMeta()
        )

        if not text or not isinstance(text, str) or not text.strip():
            return empty_result

        lower_text = text.lower()
        words_raw = regex.findall(r"\p{L}+", lower_text)
        word_count = len(words_raw)
        char_count = len(text)

        if word_count == 0:
            return empty_result

        unique_words = set(words_raw)
        unique_word_count = len(unique_words)
        lexical_diversity = unique_word_count / word_count

        hit_critical: List[str] = []
        hit_high: List[str] = []
        hit_medium: List[str] = []
        raw_lexicon_score = 0.0

        hit_phrases: Set[str] = set()
        processed_text = lower_text

        # Match multi-word phrases
        if self.phrase_regex:
            for match in self.phrase_regex.finditer(lower_text):
                matched_str = match.group(0)
                phrase = regex.sub(r"[\s\-]+", " ", matched_str.lower())
                tier = self.phrase_map.get(phrase)

                if tier and phrase not in hit_phrases:
                    hit_phrases.add(phrase)

                    index_in_text = match.start()
                    text_before = lower_text[max(0, index_in_text - 20):index_in_text]
                    words_before = regex.findall(r"\p{L}+", text_before)
                    is_neg = any(w in self.negators for w in words_before[-3:])

                    if is_neg:
                        if tier == "critical":
                            tier = "high"
                        elif tier == "high":
                            tier = "medium"
                        else:
                            tier = None

                    if tier == "critical":
                        hit_critical.append(phrase)
                        raw_lexicon_score += 0.5
                    elif tier == "high":
                        hit_high.append(phrase)
                        raw_lexicon_score += 0.3
                    elif tier == "medium":
                        hit_medium.append(phrase)
                        raw_lexicon_score += 0.1

            # Replace matched phrases with spaces
            processed_text = self.phrase_regex.sub(lambda m: " " * len(m.group(0)), lower_text)

        # Match individual words
        word_hit_set: Set[str] = set()

        for i, raw_word in enumerate(words_raw):
            stem = self.stem_func(raw_word)
            tier = self.stem_map.get(stem) or self.stem_map.get(raw_word)

            if tier and stem not in word_hit_set:
                word_index = self._find_word_in_processed(processed_text, raw_word)
                if word_index == -1:
                    continue

                word_hit_set.add(stem)

                if self._is_negated(i, words_raw):
                    if tier == "critical":
                        tier = "high"
                    elif tier == "high":
                        tier = "medium"
                    else:
                        tier = None

                display_word = (
                    self.stem_to_original.get(stem)
                    or self.stem_to_original.get(raw_word)
                    or raw_word
                )

                if tier == "critical":
                    hit_critical.append(display_word)
                    raw_lexicon_score += 0.5
                elif tier == "high":
                    hit_high.append(display_word)
                    raw_lexicon_score += 0.3
                elif tier == "medium":
                    hit_medium.append(display_word)
                    raw_lexicon_score += 0.1

        # Amplifier scores
        if self.superlative_pattern:
            superlative_matches = self.superlative_pattern.findall(text)
            if superlative_matches:
                raw_lexicon_score += min(0.12, len(superlative_matches) * 0.04)

        if self.experiential_pattern:
            experiential_matches = self.experiential_pattern.findall(text)
            if experiential_matches:
                raw_lexicon_score += min(0.15, len(experiential_matches) * 0.05)

        exclamation_count = text.count("!")
        if exclamation_count > 0:
            raw_lexicon_score += min(0.10, exclamation_count * 0.03)

        # Standard scaling normalization
        lexicon_score = (
            raw_lexicon_score / math.sqrt(raw_lexicon_score * raw_lexicon_score + self.alpha)
            if raw_lexicon_score > 0
            else 0.0
        )

        # Structure & Complexity metrics
        structure_score = 0.0
        structure_score += lexical_diversity * 0.4

        if char_count >= 300:
            structure_score += 0.20
        elif char_count >= 150:
            structure_score += 0.10
        elif char_count >= 60:
            structure_score += 0.05

        sentence_count = len([s for s in regex.split(r"[.!?]+", text) if s.strip()])
        avg_words_per_sentence = word_count / max(sentence_count, 1)

        if avg_words_per_sentence > 4:
            structure_score += 0.10
        if sentence_count > 1:
            structure_score += 0.10

        has_numbers = bool(regex.search(r"\d", text))
        has_proper_nouns = bool(
            regex.search(r"[^.!?¡¿]\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{2,}", text)
        )
        has_punctuation = bool(regex.search(r"[?…]", text))
        has_quotes = bool(regex.search(r"[\"\']", text))

        if has_numbers:
            structure_score += 0.05
        if has_proper_nouns:
            structure_score += 0.05
        if has_punctuation:
            structure_score += 0.05
        if has_quotes:
            structure_score += 0.05

        structure_score = min(1.0, structure_score)

        # Blended total score
        lexical_weight = 0.80
        structure_weight = 0.20
        total_score = (lexicon_score * lexical_weight) + (structure_score * structure_weight)

        final_score = round(min(max(total_score, 0.0), 1.0), 4)
        tier = self._calculate_tier(final_score)

        return QuorlenResult(
            score=final_score,
            tier=tier,
            lexicon=round(lexicon_score, 4),
            structure=round(structure_score, 4),
            hits=QuorlenResultHits(
                critical=hit_critical,
                high=hit_high,
                medium=hit_medium
            ),
            meta=QuorlenResultMeta(
                wordCount=word_count,
                uniqueWordCount=unique_word_count,
                sentenceCount=sentence_count,
                lexicalDiversity=round(lexical_diversity, 4)
            )
        )

    def _calculate_tier(self, score: float) -> SignificanceTier:
        if score >= 0.70:
            return "Critical"
        if score >= 0.45:
            return "Significant"
        if score >= 0.25:
            return "Meaningful"
        if score >= 0.15:
            return "Minor"
        return "Routine"
