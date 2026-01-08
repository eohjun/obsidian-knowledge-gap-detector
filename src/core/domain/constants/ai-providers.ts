/**
 * AI Provider Constants
 * 다중 LLM 프로바이더 지원을 위한 설정
 */

export type AIProviderType = 'claude' | 'openai' | 'gemini' | 'grok';

export interface AIProviderConfig {
  id: AIProviderType;
  name: string;
  displayName: string;
  defaultModel: string;
  endpoint: string;
  apiKeyPrefix?: string;
}

export const AI_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    displayName: 'Anthropic Claude',
    defaultModel: 'claude-sonnet-4-5-20250929',
    endpoint: 'https://api.anthropic.com/v1',
    apiKeyPrefix: 'sk-ant-',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI GPT',
    defaultModel: 'gpt-5.2',
    endpoint: 'https://api.openai.com/v1',
    apiKeyPrefix: 'sk-',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    displayName: 'Google Gemini',
    defaultModel: 'gemini-3-flash-preview',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPrefix: 'AIza',
  },
  grok: {
    id: 'grok',
    name: 'Grok',
    displayName: 'xAI Grok',
    defaultModel: 'grok-4-1-fast',
    endpoint: 'https://api.x.ai/v1',
  },
};
