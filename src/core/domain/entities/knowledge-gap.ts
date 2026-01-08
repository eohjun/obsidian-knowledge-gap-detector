/**
 * Knowledge Gap Entity
 * Represents a detected gap in the user's knowledge base
 */

export type GapType = 'sparse_region' | 'undefined_concept' | 'weak_connection';
export type GapSeverity = 'minor' | 'moderate' | 'significant';

export interface KnowledgeGap {
  /** Unique identifier for this gap */
  id: string;

  /** Type of the knowledge gap */
  type: GapType;

  /** Human-readable title describing the gap */
  title: string;

  /** Detailed description of what this gap represents */
  description: string;

  /** Severity level of the gap */
  severity: GapSeverity;

  /** Suggested topics to explore to fill this gap */
  suggestedTopics: string[];

  /** Paths to existing notes related to this gap */
  relatedNotes: string[];

  /** When this gap was detected */
  detectedAt: Date;
}

/**
 * Create a new KnowledgeGap entity
 */
export function createKnowledgeGap(params: {
  id: string;
  type: GapType;
  title: string;
  description: string;
  severity: GapSeverity;
  suggestedTopics?: string[];
  relatedNotes?: string[];
}): KnowledgeGap {
  return {
    id: params.id,
    type: params.type,
    title: params.title,
    description: params.description,
    severity: params.severity,
    suggestedTopics: params.suggestedTopics || [],
    relatedNotes: params.relatedNotes || [],
    detectedAt: new Date(),
  };
}

/**
 * Calculate severity score (for sorting)
 */
export function getSeverityScore(severity: GapSeverity): number {
  switch (severity) {
    case 'significant': return 3;
    case 'moderate': return 2;
    case 'minor': return 1;
    default: return 0;
  }
}
