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
    name: 'Anthropic Claude',
    displayName: 'Claude',
    defaultModel: 'claude-sonnet-4-5-20250929',
    endpoint: 'https://api.anthropic.com/v1',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1',
    apiKeyPrefix: 'sk-',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    displayName: 'Gemini',
    defaultModel: 'gemini-2.0-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPrefix: 'AIza',
  },
  grok: {
    id: 'grok',
    name: 'xAI Grok',
    displayName: 'Grok',
    defaultModel: 'grok-3-mini-fast',
    endpoint: 'https://api.x.ai/v1',
  },
};
