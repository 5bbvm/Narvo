<h1 align="center">Quorlen</h1>

<p align="center">
  <strong>A lightweight engine that estimates the importance of text.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/pypi/v/quorlen.svg" alt="PyPI Version" />
  <img src="https://img.shields.io/badge/Python-%3E%3D%203.8-blue.svg" alt="Python Version" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License MIT" />
</p>

---

## Why Quorlen Exists

In natural language processing, we are often tasked with analyzing user communications, logs, or documents. Traditional sentiment analysis categorizes text along emotional axes:
- **Sentiment Analysis** answers: *"How does this text feel?"* (Positive, Negative, Neutral)
- **Quorlen** answers: *"How much does this text matter?"* (Significance, Importance, Impact)

These are fundamentally different questions. 

A sentiment analyzer might score a tragedy and a minor daily inconvenience similarly because both contain negative words. Conversely, it might score a life-changing wedding announcement and a trivial compliment similarly because both contain positive words. 

Quorlen filters out the noise. It isolates routine chatter from pivotal events, helping you focus resources on text containing high-impact milestones, crises, or material announcements.

---

## Significance vs. Sentiment

Quorlen scores text on a scale from `0.0` (trivial/no significance) to `1.0` (critical significance). Each score is automatically classified into a **Significance Tier** for easy consumption. Notice how sentiment polarity does not dictate the importance score:

| Input Text | Sentiment | Score | Tier | Primary Triggers Matched |
| :--- | :--- | :---: | :---: | :--- |
| `"I ate breakfast."` | Neutral | **`0.0800`** | `Routine` | *None (routine action)* |
| `"The server returned a 500 error."` | Negative | **`0.1100`** | `Routine` | *None (standard log)* |
| `"I got promoted today."` | Positive | **`0.3019`** | `Meaningful` | `promoted` *(critical milestone)* |
| `"My father passed away."` | Negative | **`0.3019`** | `Meaningful` | `passed away` *(critical milestone)* |
| `"We're getting married next week."` | Positive | **`0.3319`** | `Meaningful` | `married` *(critical milestone)* |
| `"A catastrophic earthquake hit the coast, causing widespread devastation and forcing emergency evacuations."` | Negative | **`0.6528`** | `Significant` | `earthquake` *(critical)*, `emergency` *(critical)*, `catastrophic` *(high)*, `devastation` *(high)* |
| `""The biopsy came back positive for malignant cancer," the doctor said. We are devastated."` | Negative | **`0.7107`** | `Critical` | `biopsy` *(critical)*, `malignant` *(critical)*, `cancer` *(critical)*, `devastated` *(high)* |

---

## Key Features

- **Minimal Dependencies**: Pure Python implementation with a single lightweight dependency ([`regex`](https://pypi.org/project/regex/) for robust Unicode support). No machine learning frameworks, no network calls.
- **Deterministic Evaluation**: 100% reproducible results. Identical text produces identical scores.
- **Morphological Stemmer**: A built-in morphological stemmer handles pluralizations, verb tenses, and suffix modifications dynamically (e.g., `graduated` and `graduation` map to the same root).
- **Phrase and Suffix Matching**: Matches complex multi-word idioms (e.g., `passed away`, `fell in love`, `gave up`) alongside single-word triggers.
- **Amplifiers and Intensifiers**: Detects superlatives, experiential structures (e.g., `first ever`, `never felt`), and exclamation marks to scale significance appropriately.
- **Context-Aware Negation**: Identifies negators (e.g., `not`, `don't`, `never`) within a three-word window and de-escalates the importance score to avoid false positives.
- **Syntactic Complexity Metrics**: Integrates structural features—such as lexical diversity, sentence count, proper nouns, numbers, quotes, and character length—into the final blended score.

---

## Target Use Cases

Quorlen is built for modern developers designing content-rich applications, AI pipelines, and workflow automation:

- **LLM and RAG Cost Reduction**: Filter out low-significance conversational chatter, logs, or system instructions before passing text to embeddings or LLM contexts.
- **Summarization & Keyphrase Extraction**: Prioritize sentences containing major milestone updates or critical information before feeding text to a summarizer.
- **Notification Routing**: Route notifications dynamically. Bubble up messages with high significance scores (e.g., legal warnings, support issues) while silencing daily updates.
- **CRM and Customer Support**: Automatically flag and escalate incoming support tickets referencing high-importance events (e.g., bankruptcy, lawsuits, medical emergencies).
- **Productivity & Note-Taking Applications**: Extract meaningful notes, journals, or highlights automatically by scoring entry significance.

---

## Installation

### From PyPI
```bash
pip install quorlen
```

### Local Development (Contributing)
1. Clone the repository and navigate to the Python directory:
   ```bash
   cd python
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install package and dev dependencies:
   ```bash
   pip install -e ".[dev]"
   ```
4. Run the test suite:
   ```bash
   pytest
   ```

---

## Quick Start

```python
from quorlen import TextWorthinessScorer, load_default_lexicon

# Load the default English significance lexicon config
lexicon_config = load_default_lexicon()

# Initialize the scorer with the lexicon configuration
scorer = TextWorthinessScorer(lexicon_config)

text = "I finally graduated college today! I'm completely ecstatic, this is a legendary triumph."
result = scorer.score(text)

print(f"Significance Score: {result.score}")          # ~0.7944
print(f"Significance Tier:  {result.tier}")           # "Critical"
print(f"Lexicon Hits:       {result.hits}")
print(f"Text Word Count:    {result.meta.wordCount}")
```

---

## Significance Tiers

Every `QuorlenResult` includes a `tier` field that classifies the numerical `score` into a named significance tier. These tiers are calculated automatically and provide a human-readable classification that is more accurate than hardcoded thresholds:

| Tier | Score Range | Description | Example |
| :--- | :---: | :--- | :--- |
| **`Routine`** | `0.00` – `0.14` | Trivial daily chatter, greetings, system logs, or transactional instructions with no significance. | `"I am heading out for a walk now."` |
| **`Minor`** | `0.15` – `0.24` | Low-importance updates with a single weak keyword hit, mild notices, or slightly notable observations. | `"The database backup finished at 3am."` |
| **`Meaningful`** | `0.25` – `0.44` | Single clear milestone markers — career changes, personal announcements, or moderate-impact events. | `"I got promoted today."` |
| **`Significant`** | `0.45` – `0.69` | Multi-trigger high-impact events — natural disasters, corporate crises, accidents with injuries. | `"A catastrophic earthquake hit the coast, causing widespread devastation."` |
| **`Critical`** | `0.70` – `1.00` | Extreme emergencies containing dense critical triggers — medical diagnoses, mass disasters, terror events. | `"The biopsy came back positive for malignant cancer."` |

```python
result = scorer.score("My father passed away.")
print(result.tier) # "Meaningful"

if result.tier in ('Critical', 'Significant'):
    # Escalate notification
    pass
```

---

## API Reference

### Class: `TextWorthinessScorer`

The main execution engine of Quorlen.

#### Constructor

```python
def __init__(self, config: LexiconConfig, options: Optional[QuorlenOptions] = None)
```

- **Purpose**: Creates an instance of the scoring engine loaded with a custom or default lexicon and operational options.
- **Parameters**:
  - `config`: `LexiconConfig` — Dictionaries containing categories, words, and weights. Can be loaded using `load_default_lexicon()`.
  - `options` (Optional): `QuorlenOptions` — TypedDict of fine-tuning settings.
- **Example**:
  ```python
  from quorlen import TextWorthinessScorer, load_default_lexicon

  config = load_default_lexicon()
  scorer = TextWorthinessScorer(config, {"alpha": 3.0})
  ```

#### Method: `score`

```python
def score(self, text: str) -> QuorlenResult
```

- **Purpose**: Parses, stems, analyzes, and returns a detailed significance score for the provided string.
- **Parameters**:
  - `text`: `str` — The input text to score.
- **Return Value**: `QuorlenResult` — The score breakdown, hits, and text metadata.
- **Example**:
  ```python
  result = scorer.score("The team won the championship!")
  print(result.score) # e.g. 0.5421
  ```

---

### Types and Helpers

#### `load_default_lexicon() -> LexiconConfig`
Loads and returns the default English significance lexicon bundled with the package.

```python
from quorlen import load_default_lexicon
config = load_default_lexicon()
```

#### `LexiconConfig`
TypedDict defining the dictionary config schema containing lexical categories and weights.
- **Properties**:
  - `metadata` (Optional): Metadata block defining suffix lists for stemmer, negator sets, and the `alpha` normalization factor.
  - `categories`: Key-value map grouping words and phrases under relevance weights (`critical`, `high`, `medium`).
  - `amplifier_patterns` (Optional): List of superlative and experiential strings used for score scaling.

#### `QuorlenOptions`
TypedDict for fine-tuning configuration parameters.
- **Properties**:
  - `alpha` (Optional): Overrides the default mathematical constant (`alpha`) used in sigmoid scaling of lexicon scores. A lower alpha scales small scores up faster.

#### `SignificanceTier`
A `Literal` type representing the named significance classification.
- **Values**: `'Routine'` | `'Minor'` | `'Meaningful'` | `'Significant'` | `'Critical'`

#### `QuorlenResult`
Dataclass representing the output returned by the `score()` method.
- **Properties**:
  - `score` (`float`): The final blended significance score `[0.0, 1.0]` combining lexicon matches and structural complexity.
  - `tier` (`SignificanceTier`): The named significance tier automatically calculated from the score — `Routine`, `Minor`, `Meaningful`, `Significant`, or `Critical`.
  - `lexicon` (`float`): The lexicon-specific sub-score `[0.0, 1.0]` representing matched words, phrases, and amplifiers.
  - `structure` (`float`): The structural complexity sub-score `[0.0, 1.0]` based on punctuation, quotes, diversity, and length metrics.
  - `hits` (`QuorlenResultHits`): Categorized lists of matched words/phrases.
  - `meta` (`QuorlenResultMeta`): Extracted metadata from the text analysis.
- **Methods**:
  - `to_dict() -> dict`: Returns a standard nested dictionary representation of the result.

#### `QuorlenResultHits`
Dataclass categorizing matched trigger terms.
- **Properties**:
  - `critical` (`List[str]`): List of matched critical-weight words/phrases.
  - `high` (`List[str]`): List of matched high-weight words/phrases.
  - `medium` (`List[str]`): List of matched medium-weight words/phrases.

#### `QuorlenResultMeta`
Dataclass containing extracted text-level metadata.
- **Properties**:
  - `wordCount` (`int`): Total number of words in the input text.
  - `uniqueWordCount` (`int`): Number of distinct words.
  - `sentenceCount` (`int`): Number of sentences detected.
  - `lexicalDiversity` (`float`): Ratio of unique words to total words.

---

## Technical & Performance Characteristics

### Complexity & Execution Speed
Quorlen is optimized for speed and high-throughput environments:
- **Time Complexity**: $O(N)$ where $N$ is the number of characters. Morphological stemming and phrase matching are performed via unified regex maps and direct hash lookups, avoiding nested loops.
- **Space Complexity**: $O(K)$ where $K$ is the dictionary lexicon size. 
- **Memory Footprint**: Negligible. The default configuration uses less than 1MB of RAM in execution.

### Deterministic Architecture
Because Quorlen is entirely deterministic, it offers distinct advantages over LLM-based significance filters:
- **Reproducibility**: Identical text inputs will *always* result in the same numerical score down to the decimal point.
- **Zero Latency Spikes**: Execution is synchronous and local, typically completing in sub-millisecond durations.
- **Offline Reliability**: Run in serverless functions, embedded devices, or background workers without internet or API key access.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.

---
<p align="center">Built with ❤️ by Muthana ALMaiah</p>
