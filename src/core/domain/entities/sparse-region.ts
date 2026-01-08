/**
 * Sparse Region Entity
 * Represents a low-density region in the embedding space where knowledge is lacking
 */

export interface NoteDistance {
  /** Path to the note */
  notePath: string;

  /** Distance from the region centroid (lower = closer) */
  distance: number;
}

export interface SparseRegion {
  /** Unique identifier for this region */
  id: string;

  /** Centroid vector of this region in embedding space */
  centroid: number[];

  /** Density score (0-1, lower = sparser) */
  density: number;

  /** Notes nearest to this region's centroid */
  nearestNotes: NoteDistance[];

  /** Topic inferred by LLM based on nearest notes (optional) */
  inferredTopic?: string;

  /** Notes at the boundary of this region */
  boundaryNotes: string[];

  /** Number of notes in this cluster */
  noteCount: number;
}

/**
 * Create a new SparseRegion entity
 */
export function createSparseRegion(params: {
  id: string;
  centroid: number[];
  density: number;
  nearestNotes: NoteDistance[];
  boundaryNotes?: string[];
  noteCount: number;
  inferredTopic?: string;
}): SparseRegion {
  return {
    id: params.id,
    centroid: params.centroid,
    density: params.density,
    nearestNotes: params.nearestNotes,
    boundaryNotes: params.boundaryNotes || [],
    noteCount: params.noteCount,
    inferredTopic: params.inferredTopic,
  };
}

/**
 * Check if a region is considered sparse (density below threshold)
 */
export function isSparse(region: SparseRegion, threshold: number = 0.3): boolean {
  return region.density < threshold;
}

/**
 * Get the top N nearest notes from a sparse region
 */
export function getTopNearestNotes(region: SparseRegion, n: number): NoteDistance[] {
  return [...region.nearestNotes]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n);
}
