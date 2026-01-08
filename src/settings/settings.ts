/**
 * Knowledge Gap Detector Plugin Settings
 */

export interface KnowledgeGapSettings {
  /** OpenAI API Key for LLM-based suggestions */
  openaiApiKey: string;

  /** LLM model to use */
  llmModel: string;

  /** Number of clusters for K-means (affects sparse region detection) */
  clusterCount: number;

  /** Minimum mentions for undefined concept to be included */
  minMentionsForUndefined: number;

  /** Density threshold for sparse regions (0-1, lower = sparser) */
  sparseDensityThreshold: number;

  /** Folders to exclude from analysis */
  excludeFolders: string[];

  /** Enable automatic periodic analysis */
  autoAnalyze: boolean;

  /** Analysis interval in days (for auto-analyze) */
  analyzeIntervalDays: number;

  /** Last analysis timestamp */
  lastAnalyzedAt: number | null;

  /** Maximum gaps to show in report */
  maxGapsInReport: number;

  /** Use K-means++ initialization */
  useKMeansPlusPlus: boolean;

  /** Show LLM-generated suggestions */
  enableLLMSuggestions: boolean;
}

export const DEFAULT_SETTINGS: KnowledgeGapSettings = {
  openaiApiKey: '',
  llmModel: 'gpt-4o-mini',
  clusterCount: 10,
  minMentionsForUndefined: 2,
  sparseDensityThreshold: 0.3,
  excludeFolders: ['06_Meta', '09_Embedded', 'templates', '.obsidian'],
  autoAnalyze: false,
  analyzeIntervalDays: 7,
  lastAnalyzedAt: null,
  maxGapsInReport: 50,
  useKMeansPlusPlus: true,
  enableLLMSuggestions: true,
};
