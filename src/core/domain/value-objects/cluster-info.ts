/**
 * Cluster Info Value Objects
 */

export interface ClusterStats {
  /** Cluster ID */
  clusterId: string;

  /** Number of notes in this cluster */
  noteCount: number;

  /** Average distance from centroid */
  avgDistanceFromCentroid: number;

  /** Maximum distance from centroid */
  maxDistanceFromCentroid: number;

  /** Cluster cohesion score (lower = more cohesive) */
  cohesion: number;

  /** Note IDs in this cluster */
  noteIds: string[];
}

export interface ClusterComparison {
  /** ID of first cluster */
  cluster1Id: string;

  /** ID of second cluster */
  cluster2Id: string;

  /** Distance between centroids */
  centroidDistance: number;

  /** Separation score (higher = more separated) */
  separation: number;

  /** Notes that are between the two clusters */
  bridgeNotes: string[];
}

/**
 * Calculate stats for a cluster
 */
export function calculateClusterStats(
  clusterId: string,
  centroid: number[],
  members: Map<string, number[]>,
  distanceFunction: (a: number[], b: number[]) => number
): ClusterStats {
  const noteIds = Array.from(members.keys());
  const distances: number[] = [];

  for (const [, vector] of members) {
    distances.push(distanceFunction(centroid, vector));
  }

  const avgDistance = distances.length > 0
    ? distances.reduce((a, b) => a + b, 0) / distances.length
    : 0;

  const maxDistance = distances.length > 0
    ? Math.max(...distances)
    : 0;

  // Cohesion is the average squared distance (variance-like)
  const cohesion = distances.length > 0
    ? distances.reduce((acc, d) => acc + d * d, 0) / distances.length
    : 0;

  return {
    clusterId,
    noteCount: noteIds.length,
    avgDistanceFromCentroid: avgDistance,
    maxDistanceFromCentroid: maxDistance,
    cohesion,
    noteIds,
  };
}

/**
 * Compare two clusters and calculate separation metrics
 */
export function compareCluster(
  cluster1Id: string,
  centroid1: number[],
  members1: Map<string, number[]>,
  cluster2Id: string,
  centroid2: number[],
  members2: Map<string, number[]>,
  distanceFunction: (a: number[], b: number[]) => number
): ClusterComparison {
  const centroidDistance = distanceFunction(centroid1, centroid2);

  // Find bridge notes (notes closer to the other cluster's centroid than their own)
  const bridgeNotes: string[] = [];

  for (const [noteId, vector] of members1) {
    const distToOwn = distanceFunction(vector, centroid1);
    const distToOther = distanceFunction(vector, centroid2);
    if (distToOther < distToOwn) {
      bridgeNotes.push(noteId);
    }
  }

  for (const [noteId, vector] of members2) {
    const distToOwn = distanceFunction(vector, centroid2);
    const distToOther = distanceFunction(vector, centroid1);
    if (distToOther < distToOwn) {
      bridgeNotes.push(noteId);
    }
  }

  // Separation score: centroid distance / (avg within-cluster distances)
  const stats1 = calculateClusterStats(cluster1Id, centroid1, members1, distanceFunction);
  const stats2 = calculateClusterStats(cluster2Id, centroid2, members2, distanceFunction);
  const avgWithinCluster = (stats1.avgDistanceFromCentroid + stats2.avgDistanceFromCentroid) / 2;
  const separation = avgWithinCluster > 0 ? centroidDistance / avgWithinCluster : centroidDistance;

  return {
    cluster1Id,
    cluster2Id,
    centroidDistance,
    separation,
    bridgeNotes,
  };
}

/**
 * Identify which clusters are potentially related (low separation)
 */
export function findRelatedClusters(
  comparisons: ClusterComparison[],
  separationThreshold: number = 2.0
): ClusterComparison[] {
  return comparisons.filter((c) => c.separation < separationThreshold);
}
