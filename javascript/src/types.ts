export type IntensityTier = 'critical' | 'high' | 'medium';
export type SignificanceTier = 'Routine' | 'Minor' | 'Meaningful' | 'Significant' | 'Critical';

export interface LexiconConfig {
    metadata?: {
        version?: string;
        language?: string;
        description?: string;
        last_updated?: string;
        suffixes?: string[];
        negators?: string[];
        alpha?: number;
    };
    categories?: Record<string, any>;
    amplifier_patterns?: {
        superlatives?: string[];
        experiential?: string[];
    };
}

export interface QuorlenOptions {
    /** Override the default alpha normalization constant */
    alpha?: number;
    /** Apply a specific profile (for future use) */
    profile?: 'standard' | 'sensitive' | 'strict';
}

export interface QuorlenResult {
    /** Final blended score [0, 1] */
    score: number;
    
    /** Significance tier calculated from score thresholds */
    tier: SignificanceTier;
    
    /** Lexicon sub-score [0, 1] */
    lexicon: number;
    
    /** Structural complexity sub-score [0, 1] */
    structure: number;
    
    /** Categorized lists of matched words/phrases */
    hits: {
        critical: string[];
        high: string[];
        medium: string[];
    };
    
    /** Extracted metadata from the text analysis */
    meta: {
        wordCount: number;
        uniqueWordCount: number;
        sentenceCount: number;
        lexicalDiversity: number;
    };
}
