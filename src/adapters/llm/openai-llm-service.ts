/**
 * OpenAI LLM Service Adapter — 공유 빌더/파서 사용
 * Provides LLM capabilities for gap analysis and topic inference
 *
 * 수정: fetch() → requestUrl(), 공유 빌더/파서 전환
 */

import { requestUrl } from 'obsidian';
import type {
  ILLMService,
  LLMResponse,
  TopicInferenceResult,
  ExplorationSuggestion,
} from '../../core/domain/interfaces/llm-service.interface';
import { buildOpenAIBody, parseOpenAIResponse } from 'obsidian-llm-shared';

interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenAILLMService implements ILLMService {
  private config: OpenAIConfig;

  constructor(config: Partial<OpenAIConfig> = {}) {
    this.config = {
      apiKey: config.apiKey || '',
      model: config.model || 'gpt-5-nano',
      maxTokens: config.maxTokens || 500,
      temperature: config.temperature || 0.7,
    };
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return this.config.apiKey.length > 0;
  }

  async inferTopic(noteTitles: string[], noteExcerpts?: string[]): Promise<TopicInferenceResult> {
    if (!this.isAvailable()) {
      return {
        topic: 'Unknown',
        confidence: 0,
        reasoning: 'LLM service not configured - API key missing',
      };
    }

    const systemPrompt = `You are a knowledge management expert analyzing a personal knowledge base.
Your task is to infer what topic or concept connects a group of notes.

Analyze the notes and determine:
1. What theme or topic connects these notes?
2. How confident are you in this inference?

Be concise. Return JSON format: {"topic": "topic name", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

    const excerptContext = noteExcerpts && noteExcerpts.length > 0
      ? `\n\nNote Excerpts:\n${noteExcerpts.map((e, i) => `${i + 1}. ${e.slice(0, 200)}`).join('\n')}`
      : '';

    const userPrompt = `Note Titles:
${noteTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}
${excerptContext}

What topic connects these notes? Return JSON.`;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          topic?: string;
          confidence?: number;
          reasoning?: string;
        };
        return {
          topic: parsed.topic || 'Unknown',
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
          reasoning: parsed.reasoning,
        };
      }

      return {
        topic: response.split('\n')[0].replace(/["']/g, '').trim() || 'Unknown',
        confidence: 0.5,
        reasoning: response,
      };
    } catch (error) {
      return {
        topic: 'Unknown',
        confidence: 0,
        reasoning: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async generateExplorationSuggestions(
    gapDescription: string,
    relatedNotes: string[],
    context?: string
  ): Promise<ExplorationSuggestion[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const systemPrompt = `You are a knowledge management expert helping expand a personal knowledge base.
Given a knowledge gap, suggest specific topics, questions, and subtopics to explore.

Return JSON array: [{"topic": "...", "questions": ["..."], "subtopics": ["..."], "rationale": "..."}]`;

    const relatedContext = relatedNotes.length > 0
      ? `\n\nRelated existing notes:\n${relatedNotes.slice(0, 10).map((n) => `- ${n}`).join('\n')}`
      : '';

    const additionalContext = context ? `\n\nAdditional context: ${context}` : '';

    const userPrompt = `Knowledge Gap: ${gapDescription}
${relatedContext}${additionalContext}

Suggest 2-3 exploration areas with questions and subtopics. Return JSON array.`;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          topic?: string;
          questions?: string[];
          subtopics?: string[];
          rationale?: string;
        }>;
        return parsed.map((item) => ({
          topic: item.topic || '',
          questions: item.questions || [],
          subtopics: item.subtopics || [],
          rationale: item.rationale || '',
        }));
      }

      return [{
        topic: gapDescription,
        questions: this.extractBullets(response),
        subtopics: [],
        rationale: response.slice(0, 200),
      }];
    } catch (error) {
      console.error('Failed to generate exploration suggestions:', error);
      return [];
    }
  }

  async describeUndefinedConcept(
    conceptName: string,
    contextNotes: string[]
  ): Promise<string> {
    if (!this.isAvailable()) {
      return `${conceptName} is a concept referenced in your notes that may warrant further exploration.`;
    }

    const systemPrompt = `You are a knowledge management expert helping create new notes.
Given a concept name and the notes that reference it, provide a brief description suitable for a new note.

Be concise (2-3 sentences). Focus on what this concept likely means based on context.`;

    const userPrompt = `Concept: "${conceptName}"

Referenced in these notes:
${contextNotes.slice(0, 10).map((n) => `- ${n}`).join('\n')}

Provide a brief description of what this concept might be about.`;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      return response.trim() || `${conceptName} is a concept referenced in your notes.`;
    } catch (error) {
      console.error('Failed to describe concept:', error);
      return `${conceptName} is a concept referenced in your notes that may warrant further exploration.`;
    }
  }

  async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'LLM service not configured - API key missing',
      };
    }

    const messages: OpenAIMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const body = buildOpenAIBody(messages, this.config.model, {
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const response = await requestUrl({
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = parseOpenAIResponse(response.json);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        content: result.text,
        usage: {
          promptTokens: result.usage.inputTokens,
          completionTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async callOpenAI(messages: OpenAIMessage[]): Promise<string> {
    const body = buildOpenAIBody(messages, this.config.model, {
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    const response = await requestUrl({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = parseOpenAIResponse(response.json);
    if (!result.success) {
      throw new Error(result.error || 'OpenAI API error');
    }

    return result.text;
  }

  private extractBullets(text: string): string[] {
    const bullets: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        const content = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim();
        if (content.length > 0) {
          bullets.push(content);
        }
      }
    }

    return bullets;
  }
}
