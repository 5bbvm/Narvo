import { TextWorthinessScorer } from 'quorlen';
import lexiconData from 'quorlen/dist/dictionary.json';

const scorer = new TextWorthinessScorer(lexiconData as any);

interface TestSample {
    category: string;
    description: string;
    text: string;
}

const testSamples: TestSample[] = [
    // ═══════════════════════════════════════════════════════════════════
    // CATEGORY 1: ROUTINE — Absolute zero-importance chatter
    // ═══════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════
    // CATEGORY 2: MINOR — Low-importance notices and status messages
    // ═══════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════
    // CATEGORY 3: MEANINGFUL — Single clear milestone, moderate impact
    // ═══════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════
    // CATEGORY 4: SIGNIFICANT — Multi-trigger or high-impact events
    // ═══════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════
    // CATEGORY 5: CRITICAL — Life-altering, extreme emergencies
    // ═══════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════
    // EDGE CASES: Tricky / boundary-testing samples
    // ═══════════════════════════════════════════════════════════════════
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

console.log("==================================================================================");
console.log("📊 QUORLEN SIGNIFICANCE ENGINE - EXPANDED BENCHMARK RUN");
console.log("==================================================================================\n");

testSamples.forEach((sample, idx) => {
    const result = scorer.score(sample.text);
    console.log(`[Sample #${idx + 1}] Category: ${sample.category}`);
    console.log(`Description: ${sample.description}`);
    console.log(`Input Text: "${sample.text}"`);
    console.log(`Output Result Object:`);
    console.log(JSON.stringify(result, null, 2));
    console.log("----------------------------------------------------------------------------------");
});

console.log("\n==================================================================================");
console.log("SUMMARY BENCHMARK TABLE");
console.log("==================================================================================");
console.table(testSamples.map((s, i) => {
    const res = scorer.score(s.text);
    return {
        "#": i + 1,
        "Expected": s.category.split(" ")[0].replace("Edge:", "Edge"),
        "Text": s.text.length > 50 ? s.text.substring(0, 47) + "..." : s.text,
        "Words": res.meta.wordCount,
        "Score": res.score,
        "Tier": res.tier,
        "Lex": res.lexicon,
        "Struct": res.structure,
        "Hits": [...res.hits.critical, ...res.hits.high, ...res.hits.medium].join(", ") || "(none)"
    };
}));

// --- BOUNDARY DISTRIBUTION ANALYSIS ---
console.log("\n==================================================================================");
console.log("TIER DISTRIBUTION ANALYSIS");
console.log("==================================================================================");

const tierGroups: Record<string, { count: number; scores: number[]; samples: string[] }> = {};
testSamples.forEach((s, i) => {
    const res = scorer.score(s.text);
    const tier = res.tier;
    if (!tierGroups[tier]) tierGroups[tier] = { count: 0, scores: [], samples: [] };
    tierGroups[tier].count++;
    tierGroups[tier].scores.push(res.score);
    tierGroups[tier].samples.push(`#${i + 1}`);
});

for (const [tier, data] of Object.entries(tierGroups)) {
    const min = Math.min(...data.scores);
    const max = Math.max(...data.scores);
    const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    console.log(`\n  Tier: ${tier}`);
    console.log(`  Count: ${data.count}`);
    console.log(`  Score Range: ${min.toFixed(4)} – ${max.toFixed(4)}`);
    console.log(`  Average Score: ${avg.toFixed(4)}`);
    console.log(`  Samples: ${data.samples.join(", ")}`);
}

// --- MISCLASSIFICATION CHECK ---
console.log("\n==================================================================================");
console.log("MISCLASSIFICATION CHECK (Expected vs Actual Tier)");
console.log("==================================================================================");

const expectedMap: Record<string, string[]> = {
    "Routine": ["Routine"],
    "Minor": ["Minor"],
    "Meaningful": ["Meaningful"],
    "Significant": ["Significant"],
    "Critical": ["Critical"],
};

let mismatches = 0;
testSamples.forEach((s, i) => {
    const res = scorer.score(s.text);
    const expected = s.category.split(" ")[0].replace("Edge:", "").trim();
    if (expected === "Edge") return; // Skip edge cases in mismatch report
    const actualTier = res.tier;
    const isMatch = expectedMap[expected]?.includes(actualTier);
    if (!isMatch) {
        mismatches++;
        console.log(`  ❌ #${i + 1}: Expected "${expected}" → Got "${actualTier}" (Score: ${res.score})`);
        console.log(`     Text: "${s.text.substring(0, 60)}..."`);
    }
});

if (mismatches === 0) {
    console.log("  ✅ All non-edge samples classified correctly!");
} else {
    console.log(`\n  Total mismatches: ${mismatches}`);
}

console.log("\n==================================================================================");
