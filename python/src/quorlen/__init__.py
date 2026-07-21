import json
from pathlib import Path
from .scorer import TextWorthinessScorer
from .types import (
    LexiconConfig,
    QuorlenOptions,
    QuorlenResult,
    QuorlenResultHits,
    QuorlenResultMeta,
    IntensityTier,
    SignificanceTier
)

__version__ = "1.1.0"

def load_default_lexicon() -> LexiconConfig:
    """Load the default English significance lexicon bundled with the package."""
    dictionary_path = Path(__file__).parent / "dictionary.json"
    with open(dictionary_path, "r", encoding="utf-8") as f:
        return json.load(f)

__all__ = [
    "TextWorthinessScorer",
    "LexiconConfig",
    "QuorlenOptions",
    "QuorlenResult",
    "QuorlenResultHits",
    "QuorlenResultMeta",
    "IntensityTier",
    "SignificanceTier",
    "load_default_lexicon",
    "__version__"
]
