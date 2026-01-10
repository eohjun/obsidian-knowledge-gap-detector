/**
 * Knowledge Gap Detector Plugin Settings
 */

import { AIProviderType, AI_PROVIDERS } from '../core/domain/constants';
import type { GapReport } from '../core/domain/interfaces/gap-analyzer.interface';
import type { KnowledgeGap } from '../core/domain/entities/knowledge-gap';
import type { SparseRegion } from '../core/domain/entities/sparse-region';
import type { UndefinedConcept } from '../core/domain/entities/undefined-concept';
import type { AnalyzeOptions } from '../core/domain/interfaces/gap-analyzer.interface';

/**
 * Serialized version of GapReport for persistence
 * Date objects are stored as ISO strings
 */
export interface SerializedGapReport {
  analyzedAt: string; // ISO date string
  totalNotesAnalyzed: number;
  totalEmbeddings: number;
  sparseRegions: SparseRegion[];
  undefinedConcepts: UndefinedConcept[];
  gaps: KnowledgeGap[];
  options: AnalyzeOptions;
}

/**
 * Serialize GapReport for storage
 */
export function serializeGapReport(report: GapReport): SerializedGapReport {
  return {
    ...report,
    analyzedAt: report.analyzedAt.toISOString(),
  };
}

/**
 * Deserialize GapReport from storage
 */
export function deserializeGapReport(serialized: SerializedGapReport): GapReport {
  return {
    ...serialized,
    analyzedAt: new Date(serialized.analyzedAt),
  };
}

/**
 * AI 설정 인터페이스
 */
export interface AISettings {
  /** 현재 선택된 프로바이더 */
  provider: AIProviderType;
  /** 프로바이더별 API 키 */
  apiKeys: Partial<Record<AIProviderType, string>>;
  /** 프로바이더별 선택된 모델 */
  models: Record<AIProviderType, string>;
  /** LLM 기반 제안 활성화 */
  enabled: boolean;
}

/**
 * 플러그인 설정 인터페이스
 */
export interface KnowledgeGapSettings {
  /** AI 설정 */
  ai: AISettings;

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

  /** Last analysis report (persisted for reload) */
  lastReport: SerializedGapReport | null;
}

export const DEFAULT_SETTINGS: KnowledgeGapSettings = {
  ai: {
    provider: 'openai',
    apiKeys: {},
    models: {
      claude: AI_PROVIDERS.claude.defaultModel,
      openai: AI_PROVIDERS.openai.defaultModel,
      gemini: AI_PROVIDERS.gemini.defaultModel,
      grok: AI_PROVIDERS.grok.defaultModel,
    },
    enabled: true,
  },
  clusterCount: 10,
  minMentionsForUndefined: 2,
  sparseDensityThreshold: 0.3,
  excludeFolders: ['06_Meta', '09_Embedded', 'templates', '.obsidian'],
  autoAnalyze: false,
  analyzeIntervalDays: 7,
  lastAnalyzedAt: null,
  maxGapsInReport: 50,
  useKMeansPlusPlus: true,
  lastReport: null,
};
