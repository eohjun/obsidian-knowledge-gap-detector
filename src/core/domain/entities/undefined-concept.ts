/**
 * Undefined Concept Entity
 * Represents a concept that is frequently mentioned but has no dedicated note
 */

export interface UndefinedConcept {
  /** The link text (e.g., "Machine Learning" from [[Machine Learning]]) */
  name: string;

  /** Number of times this concept is mentioned across the vault */
  mentionCount: number;

  /** Paths to notes that mention this concept */
  mentionedIn: string[];

  /** Other concepts frequently mentioned alongside this one */
  relatedConcepts: string[];

  /** LLM-suggested content outline for this concept (optional) */
  suggestedContent?: string;
}

/**
 * Create a new UndefinedConcept entity
 */
export function createUndefinedConcept(params: {
  name: string;
  mentionCount: number;
  mentionedIn: string[];
  relatedConcepts?: string[];
  suggestedContent?: string;
}): UndefinedConcept {
  return {
    name: params.name,
    mentionCount: params.mentionCount,
    mentionedIn: params.mentionedIn,
    relatedConcepts: params.relatedConcepts || [],
    suggestedContent: params.suggestedContent,
  };
}

/**
 * Check if a concept is significant enough to be considered a gap
 */
export function isSignificantConcept(
  concept: UndefinedConcept,
  minMentions: number = 2
): boolean {
  return concept.mentionCount >= minMentions;
}

/**
 * Get the top N undefined concepts by mention count
 */
export function getTopUndefinedConcepts(
  concepts: UndefinedConcept[],
  n: number
): UndefinedConcept[] {
  return [...concepts]
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, n);
}

/**
 * Group undefined concepts by the notes they appear in
 */
export function groupByMentionSource(
  concepts: UndefinedConcept[]
): Map<string, UndefinedConcept[]> {
  const grouped = new Map<string, UndefinedConcept[]>();

  for (const concept of concepts) {
    for (const notePath of concept.mentionedIn) {
      const existing = grouped.get(notePath) || [];
      existing.push(concept);
      grouped.set(notePath, existing);
    }
  }

  return grouped;
}
