/**
 * LLM Service Interface
 * Port for LLM-based analysis and suggestions
 */

export interface LLMResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Generated content */
  content?: string;

  /** Error message if failed */
  error?: string;

  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TopicInferenceResult {
  /** Inferred topic name */
  topic: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Explanation of why this topic was inferred */
  reasoning?: string;
}

export interface ExplorationSuggestion {
  /** Suggested topic to explore */
  topic: string;

  /** Questions to consider */
  questions: string[];

  /** Potential subtopics */
  subtopics: string[];

  /** Why this exploration is valuable */
  rationale: string;
}

/**
 * Interface for LLM-based analysis services
 */
export interface ILLMService {
  /**
   * Infer a topic from a list of note titles/excerpts
   */
  inferTopic(noteTitles: string[], noteExcerpts?: string[]): Promise<TopicInferenceResult>;

  /**
   * Generate exploration suggestions for a knowledge gap
   */
  generateExplorationSuggestions(
    gapDescription: string,
    relatedNotes: string[],
    context?: string
  ): Promise<ExplorationSuggestion[]>;

  /**
   * Generate a description for an undefined concept
   */
  describeUndefinedConcept(
    conceptName: string,
    contextNotes: string[]
  ): Promise<string>;

  /**
   * Simple text generation
   */
  generate(prompt: string, systemPrompt?: string): Promise<LLMResponse>;

  /**
   * Check if the LLM service is available
   */
  isAvailable(): boolean;
}
