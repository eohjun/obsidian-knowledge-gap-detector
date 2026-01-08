/**
 * Detect Sparse Regions Use Case
 * Identifies low-density regions in the embedding space
 */

import type {
  IEmbeddingReader,
  NoteEmbedding,
} from '../../domain/interfaces/embedding-reader.interface';
import type {
  IClusteringService,
  KMeansOptions,
  Cluster,
} from '../../domain/interfaces/clustering-service.interface';
import type { SparseRegion, NoteDistance } from '../../domain/entities/sparse-region';
import { createSparseRegion } from '../../domain/entities/sparse-region';

export interface SparseDetectionOptions {
  /** Number of clusters for K-means (default: auto-calculated) */
  clusterCount?: number;

  /** Density threshold below which a region is considered sparse (default: 0.3) */
  sparsityThreshold?: number;

  /** Maximum sparse regions to return (default: 10) */
  maxRegions?: number;

  /** Folders to exclude from analysis */
  excludeFolders?: string[];
}

export class DetectSparseRegionsUseCase {
  constructor(
    private embeddingReader: IEmbeddingReader,
    private clusteringService: IClusteringService
  ) {}

  async execute(options: SparseDetectionOptions = {}): Promise<SparseRegion[]> {
    const {
      clusterCount,
      sparsityThreshold = 0.3,
      maxRegions = 10,
      excludeFolders = [],
    } = options;

    // 1. Load all embeddings
    const embeddings = await this.embeddingReader.readAllEmbeddings();
    if (embeddings.size === 0) {
      return [];
    }

    // 2. Filter out excluded folders
    const filteredEmbeddings = this.filterExcludedFolders(embeddings, excludeFolders);
    if (filteredEmbeddings.size < 3) {
      // Need at least 3 notes to cluster
      return [];
    }

    // 3. Convert to vector map for clustering
    const vectors = new Map<string, number[]>();
    for (const [noteId, embedding] of filteredEmbeddings) {
      vectors.set(noteId, embedding.vector);
    }

    // 4. Determine optimal K if not specified
    const k = clusterCount || this.calculateOptimalK(vectors.size);

    // 5. Perform K-means clustering
    const clusterOptions: KMeansOptions = {
      k,
      maxIterations: 100,
      tolerance: 0.0001,
      useKMeansPlusPlus: true,
    };

    const clusterResult = this.clusteringService.kMeans(vectors, clusterOptions);

    // 6. Calculate density for each cluster and identify sparse regions
    const sparseRegions: SparseRegion[] = [];

    for (const cluster of clusterResult.clusters) {
      const density = this.clusteringService.calculateDensity(cluster, vectors);

      if (density < sparsityThreshold) {
        // This is a sparse region
        const nearestNotes = this.findNearestNotes(cluster, filteredEmbeddings);
        const boundaryNotes = this.findBoundaryNotes(cluster, filteredEmbeddings);

        const region = createSparseRegion({
          id: cluster.id,
          centroid: cluster.centroid,
          density,
          nearestNotes,
          boundaryNotes,
          noteCount: cluster.members.length,
        });

        sparseRegions.push(region);
      }
    }

    // 7. Sort by density (sparsest first) and limit
    return sparseRegions
      .sort((a, b) => a.density - b.density)
      .slice(0, maxRegions);
  }

  private filterExcludedFolders(
    embeddings: Map<string, NoteEmbedding>,
    excludeFolders: string[]
  ): Map<string, NoteEmbedding> {
    if (excludeFolders.length === 0) {
      return embeddings;
    }

    const filtered = new Map<string, NoteEmbedding>();
    for (const [noteId, embedding] of embeddings) {
      const shouldExclude = excludeFolders.some((folder) =>
        embedding.notePath.startsWith(folder)
      );
      if (!shouldExclude) {
        filtered.set(noteId, embedding);
      }
    }
    return filtered;
  }

  private calculateOptimalK(noteCount: number): number {
    // Rule of thumb: sqrt(n/2), with min 3 and max 20
    const k = Math.round(Math.sqrt(noteCount / 2));
    return Math.max(3, Math.min(20, k));
  }

  private findNearestNotes(
    cluster: Cluster,
    embeddings: Map<string, NoteEmbedding>
  ): NoteDistance[] {
    const distances: NoteDistance[] = [];

    for (const noteId of cluster.members) {
      const embedding = embeddings.get(noteId);
      if (embedding) {
        const distance = this.clusteringService.euclideanDistance(
          embedding.vector,
          cluster.centroid
        );
        distances.push({
          notePath: embedding.notePath,
          distance,
        });
      }
    }

    return distances.sort((a, b) => a.distance - b.distance);
  }

  private findBoundaryNotes(
    cluster: Cluster,
    embeddings: Map<string, NoteEmbedding>
  ): string[] {
    // Boundary notes are those furthest from the centroid
    const distances = this.findNearestNotes(cluster, embeddings);
    const boundaryCount = Math.min(3, Math.ceil(distances.length * 0.2));
    return distances
      .slice(-boundaryCount)
      .map((d) => d.notePath);
  }
}
