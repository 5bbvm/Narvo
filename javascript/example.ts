import { TextWorthinessScorer } from './src/index';
import lexiconData from './src/dictionary.json';

const scorer = new TextWorthinessScorer(lexiconData as any);
const sampleText = "I got promoted to Senior Engineer today after five years with the company.";
const result = scorer.score(sampleText);

console.log("======================================================");
console.log("📝 Text Worthiness Scoring Result");
console.log("======================================================");
console.log(`Sample Text: "${sampleText}"\n`);
console.log(`Computed Score Object:`);
console.log(JSON.stringify({
    text: sampleText,
    score: result.score,
    tier: result.tier,
    lexicon: result.lexicon,
    structure: result.structure,
    hits: result.hits,
    meta: result.meta
}, null, 2));
console.log("======================================================");
