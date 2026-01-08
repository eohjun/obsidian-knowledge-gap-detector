/**
 * Gap Analyzer Interface
 * Main port for analyzing knowledge gaps
 */

import type { KnowledgeGap } from '../entities/knowledge-gap';
import type { SparseRegion } from '../entities/sparse-region';
import type { UndefinedConcept } from '../entities/undefined-concept';

export interface AnalyzeOptions {
  /** Number of clusters for K-means (default: auto) */
  clusterCount?: number;

  /** Minimum mentions for undefined concepts (default: 2) */
  minMentions?: number;

  /** Density threshold for sparse regions (default: 0.3) */
  sparsityThreshold?: number;

  /** Folders to exclude from analysis */
  excludeFolders?: string[];

  /** Whether to use LLM for topic inference */
  useLLM?: boolean;

  /** Maximum gaps to return */
  maxGaps?: number;
}

export interface GapAnalysisProgress {
  /** Current phase of analysis */
  phase: 'loading' | 'clustering' | 'analyzing_links' | 'generating_suggestions' | 'complete';

  /** Progress percentage (0-100) */
  progress: number;

  /** Current operation description */
  message: string;
}

export interface GapReport {
  /** When the analysis was performed */
  analyzedAt: Date;

  /** Total notes analyzed */
  totalNotesAnalyzed: number;

  /** Total embeddings available */
  totalEmbeddings: number;

  /** Detected sparse regions */
  sparseRegions: SparseRegion[];

  /** Detected undefined concepts */
  undefinedConcepts: UndefinedConcept[];

  /** Aggregated knowledge gaps */
  gaps: KnowledgeGap[];

  /** Analysis options used */
  options: AnalyzeOptions;
}

/**
 * Interface for the main gap analysis service
 */
export interface IGapAnalyzer {
  /**
   * Perform complete gap analysis
   */
  analyzeAll(options?: AnalyzeOptions): Promise<GapReport>;

  /**
   * Detect only sparse regions in embedding space
   */
  detectSparseRegions(options?: AnalyzeOptions): Promise<SparseRegion[]>;

  /**
   * Find only undefined concepts from link graph
   */
  findUndefinedConcepts(minMentions?: number): Promise<UndefinedConcept[]>;

  /**
   * Generate exploration suggestions for a specific gap
   */
  generateSuggestions(gap: KnowledgeGap): Promise<string[]>;

  /**
   * Subscribe to analysis progress updates
   */
  onProgress(callback: (progress: GapAnalysisProgress) => void): void;

  /**
   * Cancel ongoing analysis
   */
  cancel(): void;
}
