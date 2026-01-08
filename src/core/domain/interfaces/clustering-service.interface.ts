/**
 * Clustering Service Interface
 * Port for clustering algorithms used in gap detection
 */

export interface Cluster {
  /** Cluster identifier */
  id: string;

  /** Centroid vector of this cluster */
  centroid: number[];

  /** Note IDs belonging to this cluster */
  members: string[];

  /** Intra-cluster distance variance */
  variance: number;
}

export interface ClusterResult {
  /** All clusters found */
  clusters: Cluster[];

  /** Mapping of noteId to cluster ID */
  assignments: Map<string, string>;

  /** Number of iterations until convergence (for K-means) */
  iterations?: number;

  /** Silhouette score for cluster quality */
  silhouetteScore?: number;
}

export interface KMeansOptions {
  /** Number of clusters */
  k: number;

  /** Maximum iterations */
  maxIterations?: number;

  /** Convergence threshold */
  tolerance?: number;

  /** Use K-means++ initialization */
  useKMeansPlusPlus?: boolean;
}

export interface DBSCANOptions {
  /** Epsilon - maximum distance between two points */
  eps: number;

  /** Minimum points to form a dense region */
  minPts: number;
}

/**
 * Interface for clustering services
 */
export interface IClusteringService {
  /**
   * Perform K-means clustering on vectors
   */
  kMeans(
    vectors: Map<string, number[]>,
    options: KMeansOptions
  ): ClusterResult;

  /**
   * Perform DBSCAN clustering on vectors
   */
  dbscan(
    vectors: Map<string, number[]>,
    options: DBSCANOptions
  ): ClusterResult;

  /**
   * Calculate density of a cluster relative to all vectors
   * Returns value between 0 (sparse) and 1 (dense)
   */
  calculateDensity(
    cluster: Cluster,
    allVectors: Map<string, number[]>
  ): number;

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number;

  /**
   * Calculate euclidean distance between two vectors
   */
  euclideanDistance(a: number[], b: number[]): number;

  /**
   * Find the optimal number of clusters using elbow method
   */
  findOptimalK(
    vectors: Map<string, number[]>,
    minK: number,
    maxK: number
  ): number;
}
