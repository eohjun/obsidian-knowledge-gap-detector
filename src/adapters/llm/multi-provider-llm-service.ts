/**
 * Multi-Provider LLM Service
 * Claude, OpenAI, Gemini, Grok 프로바이더 지원
 */

import { requestUrl } from 'obsidian';
import type { ILLMService } from '../../core/domain/interfaces/llm-service.interface';
import type {
  LLMResponse,
  TopicInferenceResult,
  ExplorationSuggestion,
} from '../../core/domain/interfaces/llm-service.interface';
import { AIProviderType, AI_PROVIDERS } from '../../core/domain/constants';

export interface MultiProviderLLMConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class MultiProviderLLMService implements ILLMService {
  private config: MultiProviderLLMConfig;

  constructor(config: MultiProviderLLMConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<MultiProviderLLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  isAvailable(): boolean {
    return this.config.apiKey.length > 0;
  }

  /**
   * API 키 유효성 테스트
   */
  async testApiKey(provider: AIProviderType, apiKey: string): Promise<boolean> {
    try {
      const providerConfig = AI_PROVIDERS[provider];
      const testConfig: MultiProviderLLMConfig = {
        provider,
        apiKey,
        model: providerConfig.defaultModel,
      };

      const response = await this.generateWithConfig(
        [{ role: 'user', content: 'Hello' }],
        testConfig,
        10
      );

      return response.success;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const messages: AIMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    return this.generateWithConfig(messages, this.config);
  }

  async inferTopic(
    noteTitles: string[],
    noteExcerpts?: string[]
  ): Promise<TopicInferenceResult> {
    const excerptInfo = noteExcerpts
      ? `\n\nNote excerpts:\n${noteExcerpts.slice(0, 5).join('\n---\n')}`
      : '';

    const prompt = `Based on these note titles from a knowledge base, infer the main topic or theme that connects them:

Note titles:
${noteTitles.slice(0, 10).join('\n')}${excerptInfo}

Respond with a JSON object:
{
  "topic": "inferred topic name",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    const response = await this.generate(prompt, 'You are a knowledge analyst. Respond only with valid JSON.');

    if (!response.success || !response.content) {
      return { topic: 'Unknown', confidence: 0, reasoning: response.error || 'Failed to infer topic' };
    }

    try {
      const parsed = JSON.parse(response.content);
      return {
        topic: parsed.topic || 'Unknown',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
      };
    } catch {
      return { topic: response.content.slice(0, 50), confidence: 0.3, reasoning: 'Could not parse response' };
    }
  }

  async generateExplorationSuggestions(
    gapDescription: string,
    relatedNotes: string[],
    context?: string
  ): Promise<ExplorationSuggestion[]> {
    const contextInfo = context ? `\n\nAdditional context: ${context}` : '';

    const prompt = `A knowledge gap has been detected in a personal knowledge base:

Gap description: ${gapDescription}

Related existing notes:
${relatedNotes.slice(0, 5).map((n) => `- ${n}`).join('\n')}${contextInfo}

Suggest 3-5 specific topics or questions to explore to fill this knowledge gap.

Respond with a JSON array:
[
  {
    "topic": "topic to explore",
    "questions": ["question 1", "question 2"],
    "subtopics": ["subtopic 1", "subtopic 2"],
    "rationale": "why this would help"
  }
]`;

    const response = await this.generate(prompt, 'You are a learning advisor. Respond only with valid JSON array.');

    if (!response.success || !response.content) {
      return [];
    }

    try {
      const parsed = JSON.parse(response.content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async describeUndefinedConcept(
    conceptName: string,
    contextNotes: string[]
  ): Promise<string> {
    const prompt = `The concept "[[${conceptName}]]" is referenced in a knowledge base but has no dedicated note.

It appears in these notes:
${contextNotes.slice(0, 5).map((n) => `- ${n}`).join('\n')}

Provide a brief description (2-3 sentences) of what this concept likely refers to and why it might be worth creating a dedicated note for it.`;

    const response = await this.generate(prompt, 'You are a knowledge curator. Be concise.');

    return response.success && response.content ? response.content : `A concept referenced but not yet defined: ${conceptName}`;
  }

  private async generateWithConfig(
    messages: AIMessage[],
    config: MultiProviderLLMConfig,
    maxTokens: number = 1024
  ): Promise<LLMResponse> {
    switch (config.provider) {
      case 'claude':
        return this.generateClaude(messages, config, maxTokens);
      case 'openai':
        return this.generateOpenAI(messages, config, maxTokens);
      case 'gemini':
        return this.generateGemini(messages, config, maxTokens);
      case 'grok':
        return this.generateGrok(messages, config, maxTokens);
      default:
        return { success: false, content: '', error: 'Unknown provider' };
    }
  }

  private async generateClaude(
    messages: AIMessage[],
    config: MultiProviderLLMConfig,
    maxTokens: number
  ): Promise<LLMResponse> {
    const { claudeMessages, systemPrompt } = this.convertToClaude(messages);

    const requestBody: Record<string, unknown> = {
      model: config.model,
      messages: claudeMessages,
      max_tokens: maxTokens,
    };

    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    try {
      const response = await requestUrl({
        url: `${AI_PROVIDERS.claude.endpoint}/messages`,
        method: 'POST',
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = response.json;

      if (data.error) {
        return { success: false, content: '', error: data.error.message };
      }

      const content = data.content
        ?.filter((block: { type: string }) => block.type === 'text')
        .map((block: { text: string }) => block.text)
        .join('') || '';

      return {
        success: true,
        content,
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        } : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async generateOpenAI(
    messages: AIMessage[],
    config: MultiProviderLLMConfig,
    maxTokens: number
  ): Promise<LLMResponse> {
    try {
      const response = await requestUrl({
        url: `${AI_PROVIDERS.openai.endpoint}/chat/completions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: maxTokens,
        }),
      });

      const data = response.json;

      if (data.error) {
        return { success: false, content: '', error: data.error.message };
      }

      const content = data.choices?.[0]?.message?.content || '';

      return {
        success: true,
        content,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async generateGemini(
    messages: AIMessage[],
    config: MultiProviderLLMConfig,
    maxTokens: number
  ): Promise<LLMResponse> {
    const contents = this.convertToGemini(messages);

    try {
      const url = `${AI_PROVIDERS.gemini.endpoint}/models/${config.model}:generateContent?key=${config.apiKey}`;

      const response = await requestUrl({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
          },
        }),
      });

      const data = response.json;

      if (data.error) {
        return { success: false, content: '', error: data.error.message };
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        success: true,
        content,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0,
        } : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async generateGrok(
    messages: AIMessage[],
    config: MultiProviderLLMConfig,
    maxTokens: number
  ): Promise<LLMResponse> {
    // Grok uses OpenAI-compatible API
    try {
      const response = await requestUrl({
        url: `${AI_PROVIDERS.grok.endpoint}/chat/completions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: maxTokens,
        }),
      });

      const data = response.json;

      if (data.error) {
        return { success: false, content: '', error: data.error.message };
      }

      const content = data.choices?.[0]?.message?.content || '';

      return {
        success: true,
        content,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private convertToClaude(messages: AIMessage[]): {
    claudeMessages: { role: 'user' | 'assistant'; content: string }[];
    systemPrompt: string | null;
  } {
    const claudeMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    let systemPrompt: string | null = null;

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        claudeMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { claudeMessages, systemPrompt };
  }

  private convertToGemini(messages: AIMessage[]): { role: string; parts: { text: string }[] }[] {
    const contents: { role: string; parts: { text: string }[] }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini doesn't have system role, prepend to first user message
        continue;
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Prepend system message to first user message if exists
    const systemMsg = messages.find((m) => m.role === 'system');
    if (systemMsg && contents.length > 0) {
      contents[0].parts[0].text = `${systemMsg.content}\n\n${contents[0].parts[0].text}`;
    }

    return contents;
  }

  private handleError(error: unknown): LLMResponse {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('429') || message.includes('rate')) {
      return { success: false, content: '', error: 'Rate limit exceeded. Please try again later.' };
    }
    if (message.includes('401') || message.includes('403')) {
      return { success: false, content: '', error: 'Invalid API key or unauthorized access.' };
    }
    if (message.includes('timeout')) {
      return { success: false, content: '', error: 'Request timed out. Please try again.' };
    }

    return { success: false, content: '', error: message };
  }
}
