/**
 * Model Configurations
 * 모델별 설정 및 메타데이터
 */

import type { AIProviderType } from './ai-providers';

export interface ModelConfig {
  id: string;
  displayName: string;
  provider: AIProviderType;
  inputCostPer1M: number;
  outputCostPer1M: number;
  maxInputTokens: number;
  maxOutputTokens: number;
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Claude Models
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    provider: 'claude',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    maxInputTokens: 200000,
    maxOutputTokens: 16384,
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    provider: 'claude',
    inputCostPer1M: 0.8,
    outputCostPer1M: 4.0,
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
  },

  // OpenAI Models
  'gpt-4o': {
    id: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini (Recommended)',
    provider: 'openai',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    provider: 'openai',
    inputCostPer1M: 10.0,
    outputCostPer1M: 30.0,
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
  },

  // Gemini Models
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.3,
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    provider: 'gemini',
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.0,
    maxInputTokens: 2000000,
    maxOutputTokens: 8192,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    provider: 'gemini',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.3,
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,
  },

  // Grok Models
  'grok-3-mini-fast': {
    id: 'grok-3-mini-fast',
    displayName: 'Grok 3 Mini Fast',
    provider: 'grok',
    inputCostPer1M: 0.3,
    outputCostPer1M: 0.5,
    maxInputTokens: 131072,
    maxOutputTokens: 131072,
  },
  'grok-3-fast': {
    id: 'grok-3-fast',
    displayName: 'Grok 3 Fast',
    provider: 'grok',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    maxInputTokens: 131072,
    maxOutputTokens: 131072,
  },
};

/**
 * 프로바이더별 모델 목록 조회
 */
export function getModelsByProvider(provider: AIProviderType): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter((m) => m.provider === provider);
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
  if (!config) return 0;

  const inputCost = (inputTokens / 1_000_000) * config.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * config.outputCostPer1M;
  return inputCost + outputCost;
}
