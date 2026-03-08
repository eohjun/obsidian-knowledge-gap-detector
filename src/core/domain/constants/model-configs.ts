/**
 * Model Configurations
 * Re-exports from obsidian-llm-shared (single source of truth)
 */

export {
  type AIProviderType,
  type AIProviderConfig,
  type ModelConfig,
  AI_PROVIDERS,
  MODEL_CONFIGS,
  getModelsByProvider,
  getModelConfig,
  getProviderConfig,
  isReasoningModel,
  getEffectiveMaxTokens,
  getThinkingConfig,
  calculateCost,
} from 'obsidian-llm-shared';

/**
 * Backward-compatibility alias
 * @deprecated Use isReasoningModel from obsidian-llm-shared instead
 */
import { isReasoningModel } from 'obsidian-llm-shared';
export const isOpenAIReasoningModel = isReasoningModel;
