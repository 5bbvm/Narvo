import { TextWorthinessScorer } from './src/index';
import lexiconData from './src/dictionary.json';

// Initialize the scoring engine with the dictionary configuration
// We cast lexiconData to any because the TypeScript compiler might complain about missing properties depending on its strictness settings, but it adheres to LexiconConfig
const scorer = new TextWorthinessScorer(lexiconData as any);

const sampleText = "I finally graduated college today! I'm completely ecstatic, this is a legendary triumph.";

// Score the text deterministically. Returns a NarvoResult object.
const result = scorer.score(sampleText);

// Log the generated scoring object to the console
console.log("======================================================");
console.log("📝 Text Worthiness Scoring Result");
console.log("======================================================");
console.log(`Sample Text: "${sampleText}"\n`);
console.log(`Computed Score Object:`);
console.log(JSON.stringify({
    text: sampleText,
    score: Number(result.score.toFixed(4)),
    lexicon: result.lexicon,
    structure: result.structure,
    hits: result.hits,
    meta: result.meta,
    tier: result.score >= 0.7 ? 'critical' : result.score >= 0.4 ? 'high' : result.score >= 0.2 ? 'medium' : 'low'
}, null, 2));
console.log("======================================================");
