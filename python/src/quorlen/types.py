from typing import TypedDict, List, Dict, Any, Literal, Optional
from dataclasses import dataclass, field, asdict

IntensityTier = Literal['critical', 'high', 'medium']
SignificanceTier = Literal['Routine', 'Minor', 'Meaningful', 'Significant', 'Critical']

class AmplifierPatterns(TypedDict, total=False):
    superlatives: List[str]
    experiential: List[str]

class LexiconMetadata(TypedDict, total=False):
    version: str
    language: str
    description: str
    last_updated: str
    suffixes: List[str]
    negators: List[str]
    alpha: float

class LexiconCategory(TypedDict, total=False):
    weight_groups: Dict[str, List[str]]
    weight: IntensityTier
    words: List[str]
    description: str

class LexiconConfig(TypedDict, total=False):
    metadata: LexiconMetadata
    categories: Dict[str, LexiconCategory]
    amplifier_patterns: AmplifierPatterns

class QuorlenOptions(TypedDict, total=False):
    alpha: Optional[float]
    profile: Optional[Literal['standard', 'sensitive', 'strict']]

@dataclass
class QuorlenResultHits:
    critical: List[str] = field(default_factory=list)
    high: List[str] = field(default_factory=list)
    medium: List[str] = field(default_factory=list)

@dataclass
class QuorlenResultMeta:
    wordCount: int = 0
    uniqueWordCount: int = 0
    sentenceCount: int = 0
    lexicalDiversity: float = 0.0

@dataclass
class QuorlenResult:
    score: float
    tier: SignificanceTier
    lexicon: float
    structure: float
    hits: QuorlenResultHits
    meta: QuorlenResultMeta

    def to_dict(self) -> Dict[str, Any]:
        """Convert the result to a nested dictionary representation."""
        return asdict(self)
