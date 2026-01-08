/**
 * Vector Math Utilities
 * Pure mathematical functions for vector operations
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calculate cosine distance (1 - cosine similarity)
 * Returns value between 0 and 2 (0 = identical)
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Calculate the centroid (mean) of multiple vectors
 */
export function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot calculate centroid of empty vector set');
  }

  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += vector[i];
    }
  }

  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= vectors.length;
  }

  return centroid;
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

/**
 * Add two vectors element-wise
 */
export function addVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  return a.map((v, i) => v + b[i]);
}

/**
 * Subtract vector b from vector a element-wise
 */
export function subtractVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  return a.map((v, i) => v - b[i]);
}

/**
 * Multiply vector by scalar
 */
export function scaleVector(vector: number[], scalar: number): number[] {
  return vector.map((v) => v * scalar);
}

/**
 * Calculate variance of distances from centroid
 */
export function calculateVariance(
  vectors: number[][],
  centroid: number[],
  distanceFunc: (a: number[], b: number[]) => number = euclideanDistance
): number {
  if (vectors.length === 0) return 0;

  const distances = vectors.map((v) => distanceFunc(v, centroid));
  const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
  const squaredDiffs = distances.map((d) => (d - mean) ** 2);

  return squaredDiffs.reduce((a, b) => a + b, 0) / distances.length;
}
