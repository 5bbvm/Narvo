const { TextWorthinessScorer } = require('../dist/index.js');
const lexiconData = require('../dist/dictionary.json');
const fs = require('fs');
const path = require('path');

const scorer = new TextWorthinessScorer(lexiconData);

const testSamples = [
    {
        category: "Routine",
        description: "Minimal sentence (2 words)",
        text: "Hello there."
    },
    {
        category: "Routine",
        description: "Simple 3-word daily action",
        text: "I ate breakfast."
    },
    {
        category: "Routine",
        description: "6-word routine evening statement",
        text: "I am going to sleep now."
    },
    {
        category: "Routine",
        description: "Short greeting / small talk",
        text: "Hey, how are you doing today?"
    },
    {
        category: "Routine",
        description: "8-word routine daily chatter",
        text: "I walked to the store and came back."
    },
    {
        category: "Routine",
        description: "Simple acknowledgment response",
        text: "OK sounds good, see you later."
    },
    {
        category: "Routine",
        description: "Routine transactional instruction",
        text: "Please send me the file when you can."
    },
    {
        category: "Routine",
        description: "Long repetitive daily monologue (40 words, no significance)",
        text: "I ate breakfast, then went to work, then came back home, then went for a walk same as yesterday, I am eating dinner now, I will go to bed after dinner but maybe i will read a book before sleeping."
    },
    {
        category: "Minor",
        description: "Standard 500 error log",
        text: "The server returned a 500 error."
    },
    {
        category: "Minor",
        description: "Routine weather notice",
        text: "Light rain is expected this afternoon across the central district."
    },
    {
        category: "Minor",
        description: "Simple system log entry",
        text: "The database backup finished at 3am with no issues."
    },
    {
        category: "Minor",
        description: "Mild complaint without substance",
        text: "The coffee machine was broken again this morning."
    },
    {
        category: "Minor",
        description: "Traffic update",
        text: "There is heavy traffic on the highway due to road construction."
    },
    {
        category: "Minor",
        description: "Casual food opinion",
        text: "The pasta was decent but nothing special."
    },
    {
        category: "Minor",
        description: "Basic schedule change",
        text: "The meeting has been moved from 2pm to 4pm tomorrow."
    },
    {
        category: "Meaningful",
        description: "Short job promotion (4 words)",
        text: "I got promoted today."
    },
    {
        category: "Meaningful",
        description: "Short marriage announcement (6 words)",
        text: "We're getting married next week."
    },
    {
        category: "Meaningful",
        description: "Bereavement short statement (4 words)",
        text: "My father passed away."
    },
    {
        category: "Meaningful",
        description: "Job change medium statement",
        text: "I started my new role as Lead Architect today after a long interview process."
    },
    {
        category: "Meaningful",
        description: "Baby announcement",
        text: "We just found out we are expecting a baby."
    },
    {
        category: "Meaningful",
        description: "Retirement announcement",
        text: "After 30 years of service, I am officially retiring next month."
    },
    {
        category: "Meaningful",
        description: "Moving to new country",
        text: "We are moving to Canada next year for a fresh start."
    },
    {
        category: "Meaningful",
        description: "Got accepted to university",
        text: "I just got accepted into Harvard, I can not believe it."
    },
    {
        category: "Significant",
        description: "Natural disaster with emergency",
        text: "A catastrophic earthquake hit the coast, causing widespread devastation and forcing emergency evacuations."
    },
    {
        category: "Significant",
        description: "Corporate bankruptcy",
        text: "The company filed for bankruptcy yesterday after failing to secure vital funding from major venture capital investors."
    },
    {
        category: "Significant",
        description: "Lawsuit announcement",
        text: "The government is filing a massive lawsuit against the corporation for fraud and environmental violations."
    },
    {
        category: "Significant",
        description: "Severe weather emergency",
        text: "A deadly tornado ripped through the town, destroying homes and leaving hundreds without shelter."
    },
    {
        category: "Significant",
        description: "Major accident with injuries",
        text: "A devastating car accident on the freeway left three people critically injured and caused a major pile-up."
    },
    {
        category: "Critical",
        description: "Cancer diagnosis with emotional weight",
        text: "\"The biopsy came back positive for malignant cancer,\" the doctor said. We are devastated."
    },
    {
        category: "Critical",
        description: "Industrial catastrophe with many triggers",
        text: "A sudden catastrophic explosion engulfed the chemical plant, leaving dozens critically injured, forcing immediate emergency evacuations, and triggering a severe hazardous material disaster alert."
    },
    {
        category: "Critical",
        description: "Graduation celebration with superlatives and amplifiers",
        text: "I finally graduated college today! I'm completely ecstatic, this is a legendary triumph."
    },
    {
        category: "Critical",
        description: "Terror attack report",
        text: "A horrific terrorist bombing at the airport killed dozens of civilians and left hundreds critically wounded in what officials are calling a catastrophic act of war."
    },
    {
        category: "Critical",
        description: "Major medical emergency with multiple hits",
        text: "She suffered a massive heart attack and was rushed to the emergency room where doctors performed an emergency surgery to save her life."
    },
    {
        category: "Edge: Routine (system log with false positive words)",
        description: "System log with 'complete', 'job', 'worker' — should be routine",
        text: "The worker process completed job #4028 in 14ms."
    },
    {
        category: "Edge: Minor (office status with 'support' and 'resolved')",
        description: "Office update with medium-weight words that should still be minor",
        text: "The team reviewed the weekly maintenance log and cleared 15 resolved support tickets from the queue."
    },
    {
        category: "Edge: Routine (negated milestone)",
        description: "Negated milestone — should drop significance",
        text: "I did not get promoted this time."
    },
    {
        category: "Edge: Meaningful (negated critical)",
        description: "Negated critical word — should still be somewhat meaningful",
        text: "The earthquake did not cause any major damage to the buildings in our area."
    },
    {
        category: "Edge: Routine (emoji-heavy casual)",
        description: "Casual message with emoji indicators but no real significance",
        text: "Had a great day at the beach with friends!"
    },
    {
        category: "Edge: Meaningful (short with exclamation)",
        description: "Very short but impactful with exclamation",
        text: "I won the lottery!"
    },
    {
        category: "Edge: Critical (dense multi-hit short)",
        description: "Short sentence packed with critical keywords",
        text: "The earthquake caused a catastrophic explosion and a deadly fire."
    }
];

const results = testSamples.map(sample => {
    const res = scorer.score(sample.text);
    return {
        text: sample.text,
        category: sample.category,
        description: sample.description,
        score: res.score,
        tier: res.tier,
        lexicon: res.lexicon,
        structure: res.structure,
        hits: res.hits,
        meta: res.meta
    };
});

const outputPath = path.join(__dirname, '../../python/tests/expected_results.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
console.log(`Successfully generated ${outputPath}`);
