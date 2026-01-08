/**
 * Model Configurations
 * AI Provider 및 모델 설정
 */

import type { AIProviderType } from './ai-providers';

export interface ModelConfig {
  id: string;
  displayName: string;
  provider: AIProviderType;
  maxTokens: number;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Claude models
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    provider: 'claude',
    maxTokens: 16384,
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  'claude-opus-4-5-20251101': {
    id: 'claude-opus-4-5-20251101',
    displayName: 'Claude Opus 4.5',
    provider: 'claude',
    maxTokens: 32768,
    inputCostPer1M: 15.0,
    outputCostPer1M: 75.0,
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    provider: 'claude',
    maxTokens: 8192,
    inputCostPer1M: 0.8,
    outputCostPer1M: 4.0,
  },

  // OpenAI models
  'gpt-5.2': {
    id: 'gpt-5.2',
    displayName: 'GPT-5.2',
    provider: 'openai',
    maxTokens: 32768,
    inputCostPer1M: 1.75,
    outputCostPer1M: 14.0,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    provider: 'openai',
    maxTokens: 16384,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
  },

  // Gemini models
  'gemini-3-flash-preview': {
    id: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash',
    provider: 'gemini',
    maxTokens: 65536,
    inputCostPer1M: 0.5,
    outputCostPer1M: 3.0,
  },
  'gemini-3-pro-preview': {
    id: 'gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro',
    provider: 'gemini',
    maxTokens: 65536,
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    maxTokens: 8192,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.3,
  },

  // Grok models
  'grok-4-1-fast': {
    id: 'grok-4-1-fast',
    displayName: 'Grok 4.1 Fast',
    provider: 'grok',
    maxTokens: 16384,
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  'grok-4-1-fast-non-reasoning': {
    id: 'grok-4-1-fast-non-reasoning',
    displayName: 'Grok 4.1 Fast (Non-Reasoning)',
    provider: 'grok',
    maxTokens: 16384,
    inputCostPer1M: 0.6,
    outputCostPer1M: 4.0,
  },
};

/**
 * 프로바이더별 모델 목록 조회
 */
export function getModelsByProvider(provider: AIProviderType): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter((m) => m.provider === provider);
}

/**
 * 모델 설정 조회
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIGS[modelId];
}

/**
 * 비용 계산 유틸리티
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const config = MODEL_CONFIGS[modelId];
  if (!config || !config.inputCostPer1M || !config.outputCostPer1M) return 0;

  const inputCost = (inputTokens / 1_000_000) * config.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * config.outputCostPer1M;
  return inputCost + outputCost;
}

/**
 * OpenAI Reasoning 모델 여부 확인
 * gpt-5.x, o1, o3 시리즈는 max_completion_tokens 사용 필요
 */
export function isOpenAIReasoningModel(modelId: string): boolean {
  return (
    modelId.startsWith('gpt-5') ||
    modelId.startsWith('o1') ||
    modelId.startsWith('o3')
  );
}
