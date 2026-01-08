/**
 * K-Means Clustering Service Adapter
 * Pure TypeScript implementation of K-means clustering
 */

import type {
  IClusteringService,
  Cluster,
  ClusterResult,
  KMeansOptions,
  DBSCANOptions,
} from '../../core/domain/interfaces/clustering-service.interface';
import {
  cosineSimilarity,
  euclideanDistance,
  calculateCentroid,
} from '../../core/domain/utils/vector-math';

export class KMeansClusteringService implements IClusteringService {
  /**
   * Perform K-means clustering
   */
  kMeans(vectors: Map<string, number[]>, options: KMeansOptions): ClusterResult {
    const { k, maxIterations = 100, tolerance = 0.0001, useKMeansPlusPlus = true } = options;

    if (vectors.size === 0) {
      return { clusters: [], assignments: new Map() };
    }

    if (vectors.size < k) {
      // Not enough points for k clusters - create one cluster per point
      return this.createSinglePointClusters(vectors);
    }

    const vectorArray = Array.from(vectors.entries());
    const ids = vectorArray.map(([id]) => id);
    const points = vectorArray.map(([, vec]) => vec);

    // Initialize centroids
    let centroids: number[][];
    if (useKMeansPlusPlus) {
      centroids = this.kMeansPlusPlusInit(points, k);
    } else {
      centroids = this.randomInit(points, k);
    }

    let assignments = new Array(points.length).fill(0);
    let iterations = 0;
    let converged = false;

    while (iterations < maxIterations && !converged) {
      // Assignment step
      const newAssignments = points.map((point) =>
        this.findNearestCentroid(point, centroids)
      );

      // Check for convergence
      converged = this.assignmentsEqual(assignments, newAssignments);
      assignments = newAssignments;

      if (!converged) {
        // Update step
        const newCentroids = this.updateCentroids(points, assignments, k);

        // Check if centroids moved significantly
        const maxMove = this.maxCentroidMovement(centroids, newCentroids);
        if (maxMove < tolerance) {
          converged = true;
        }

        centroids = newCentroids;
      }

      iterations++;
    }

    // Build result
    const clusters: Cluster[] = [];
    const assignmentMap = new Map<string, string>();

    for (let i = 0; i < k; i++) {
      const members: string[] = [];
      const memberVectors: number[][] = [];

      for (let j = 0; j < assignments.length; j++) {
        if (assignments[j] === i) {
          members.push(ids[j]);
          memberVectors.push(points[j]);
        }
      }

      if (members.length > 0) {
        const clusterId = `cluster-${i}`;
        const variance = this.calculateVariance(memberVectors, centroids[i]);

        clusters.push({
          id: clusterId,
          centroid: centroids[i],
          members,
          variance,
        });

        for (const memberId of members) {
          assignmentMap.set(memberId, clusterId);
        }
      }
    }

    return {
      clusters,
      assignments: assignmentMap,
      iterations,
    };
  }

  /**
   * Perform DBSCAN clustering (density-based)
   */
  dbscan(vectors: Map<string, number[]>, options: DBSCANOptions): ClusterResult {
    const { eps, minPts } = options;

    const vectorArray = Array.from(vectors.entries());
    const ids = vectorArray.map(([id]) => id);
    const points = vectorArray.map(([, vec]) => vec);
    const n = points.length;

    // Track cluster assignments (-1 = noise, -2 = unvisited)
    const clusterAssignments = new Array(n).fill(-2);
    let currentCluster = 0;

    for (let i = 0; i < n; i++) {
      if (clusterAssignments[i] !== -2) continue;

      const neighbors = this.regionQuery(points, i, eps);

      if (neighbors.length < minPts) {
        clusterAssignments[i] = -1; // Noise
      } else {
        this.expandCluster(
          points,
          clusterAssignments,
          i,
          neighbors,
          currentCluster,
          eps,
          minPts
        );
        currentCluster++;
      }
    }

    // Build clusters
    const clusterMap = new Map<number, string[]>();
    const assignmentMap = new Map<string, string>();

    for (let i = 0; i < n; i++) {
      const cluster = clusterAssignments[i];
      if (cluster >= 0) {
        const members = clusterMap.get(cluster) || [];
        members.push(ids[i]);
        clusterMap.set(cluster, members);
        assignmentMap.set(ids[i], `cluster-${cluster}`);
      }
    }

    const clusters: Cluster[] = [];
    for (const [clusterId, members] of clusterMap) {
      const memberVectors = members.map((id) => vectors.get(id)!);
      const centroid = calculateCentroid(memberVectors);
      const variance = this.calculateVariance(memberVectors, centroid);

      clusters.push({
        id: `cluster-${clusterId}`,
        centroid,
        members,
        variance,
      });
    }

    return { clusters, assignments: assignmentMap };
  }

  /**
   * Calculate density of a cluster
   */
  calculateDensity(cluster: Cluster, allVectors: Map<string, number[]>): number {
    if (cluster.members.length === 0) return 0;

    // Calculate average distance from centroid
    let totalDistance = 0;
    for (const memberId of cluster.members) {
      const vector = allVectors.get(memberId);
      if (vector) {
        totalDistance += euclideanDistance(vector, cluster.centroid);
      }
    }

    const avgDistance = totalDistance / cluster.members.length;

    // Calculate global average distance for normalization
    const allPoints = Array.from(allVectors.values());
    const globalCentroid = calculateCentroid(allPoints);
    let globalAvgDistance = 0;
    for (const point of allPoints) {
      globalAvgDistance += euclideanDistance(point, globalCentroid);
    }
    globalAvgDistance /= allPoints.length;

    // Density is inverse of normalized distance (1 = dense, 0 = sparse)
    if (globalAvgDistance === 0) return 1;
    const normalizedDistance = avgDistance / globalAvgDistance;

    // Convert to density score (lower distance = higher density)
    return Math.max(0, Math.min(1, 1 - normalizedDistance / 2));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    return cosineSimilarity(a, b);
  }

  /**
   * Calculate euclidean distance between two vectors
   */
  euclideanDistance(a: number[], b: number[]): number {
    return euclideanDistance(a, b);
  }

  /**
   * Find optimal K using elbow method
   */
  findOptimalK(vectors: Map<string, number[]>, minK: number, maxK: number): number {
    const wcss: number[] = [];

    for (let k = minK; k <= maxK; k++) {
      const result = this.kMeans(vectors, { k, maxIterations: 50 });
      const totalWCSS = result.clusters.reduce(
        (sum, cluster) => sum + cluster.variance * cluster.members.length,
        0
      );
      wcss.push(totalWCSS);
    }

    // Find elbow point (maximum curvature)
    let maxCurvature = 0;
    let optimalK = minK;

    for (let i = 1; i < wcss.length - 1; i++) {
      // Calculate curvature using second derivative
      const curvature = Math.abs(
        wcss[i - 1] - 2 * wcss[i] + wcss[i + 1]
      );
      if (curvature > maxCurvature) {
        maxCurvature = curvature;
        optimalK = minK + i;
      }
    }

    return optimalK;
  }

  // Private helper methods

  private kMeansPlusPlusInit(points: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const n = points.length;

    // First centroid: random
    const firstIdx = Math.floor(Math.random() * n);
    centroids.push([...points[firstIdx]]);

    // Remaining centroids: weighted by distance
    for (let i = 1; i < k; i++) {
      const distances = points.map((point) => {
        const minDist = Math.min(
          ...centroids.map((c) => euclideanDistance(point, c))
        );
        return minDist * minDist; // Squared distance
      });

      const totalDistance = distances.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalDistance;

      for (let j = 0; j < n; j++) {
        random -= distances[j];
        if (random <= 0) {
          centroids.push([...points[j]]);
          break;
        }
      }
    }

    return centroids;
  }

  private randomInit(points: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const indices = new Set<number>();

    while (indices.size < k) {
      indices.add(Math.floor(Math.random() * points.length));
    }

    for (const idx of indices) {
      centroids.push([...points[idx]]);
    }

    return centroids;
  }

  private findNearestCentroid(point: number[], centroids: number[][]): number {
    let minDist = Infinity;
    let nearest = 0;

    for (let i = 0; i < centroids.length; i++) {
      const dist = euclideanDistance(point, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }

    return nearest;
  }

  private updateCentroids(
    points: number[][],
    assignments: number[],
    k: number
  ): number[][] {
    const dimensions = points[0].length;
    const newCentroids: number[][] = [];

    for (let i = 0; i < k; i++) {
      const clusterPoints = points.filter((_, idx) => assignments[idx] === i);

      if (clusterPoints.length > 0) {
        newCentroids.push(calculateCentroid(clusterPoints));
      } else {
        // Empty cluster - keep old centroid or reinitialize
        newCentroids.push(new Array(dimensions).fill(0));
      }
    }

    return newCentroids;
  }

  private assignmentsEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private maxCentroidMovement(old: number[][], updated: number[][]): number {
    let maxMove = 0;
    for (let i = 0; i < old.length; i++) {
      const move = euclideanDistance(old[i], updated[i]);
      if (move > maxMove) maxMove = move;
    }
    return maxMove;
  }

  private calculateVariance(points: number[][], centroid: number[]): number {
    if (points.length === 0) return 0;
    let totalSqDist = 0;
    for (const point of points) {
      const dist = euclideanDistance(point, centroid);
      totalSqDist += dist * dist;
    }
    return totalSqDist / points.length;
  }

  private createSinglePointClusters(vectors: Map<string, number[]>): ClusterResult {
    const clusters: Cluster[] = [];
    const assignments = new Map<string, string>();

    let i = 0;
    for (const [id, vector] of vectors) {
      const clusterId = `cluster-${i}`;
      clusters.push({
        id: clusterId,
        centroid: vector,
        members: [id],
        variance: 0,
      });
      assignments.set(id, clusterId);
      i++;
    }

    return { clusters, assignments };
  }

  private regionQuery(points: number[][], pointIdx: number, eps: number): number[] {
    const neighbors: number[] = [];
    for (let i = 0; i < points.length; i++) {
      if (euclideanDistance(points[pointIdx], points[i]) <= eps) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  private expandCluster(
    points: number[][],
    clusterAssignments: number[],
    pointIdx: number,
    neighbors: number[],
    clusterId: number,
    eps: number,
    minPts: number
  ): void {
    clusterAssignments[pointIdx] = clusterId;

    const queue = [...neighbors];
    while (queue.length > 0) {
      const currentIdx = queue.shift()!;

      if (clusterAssignments[currentIdx] === -1) {
        // Was noise, now border point
        clusterAssignments[currentIdx] = clusterId;
      }

      if (clusterAssignments[currentIdx] !== -2) continue;

      clusterAssignments[currentIdx] = clusterId;
      const currentNeighbors = this.regionQuery(points, currentIdx, eps);

      if (currentNeighbors.length >= minPts) {
        queue.push(...currentNeighbors);
      }
    }
  }
}
