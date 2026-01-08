/**
 * Suggest Exploration Use Case
 * Generates exploration suggestions for knowledge gaps using LLM
 */

import type {
  ILLMService,
  ExplorationSuggestion,
} from '../../domain/interfaces/llm-service.interface';
import type { KnowledgeGap } from '../../domain/entities/knowledge-gap';
import type { SparseRegion } from '../../domain/entities/sparse-region';
import type { UndefinedConcept } from '../../domain/entities/undefined-concept';

export class SuggestExplorationUseCase {
  constructor(private llmService: ILLMService) {}

  /**
   * Generate exploration suggestions for a knowledge gap
   */
  async execute(gap: KnowledgeGap): Promise<ExplorationSuggestion[]> {
    if (!this.llmService.isAvailable()) {
      return this.generateFallbackSuggestions(gap);
    }

    return this.llmService.generateExplorationSuggestions(
      gap.description,
      gap.relatedNotes,
      this.buildContext(gap)
    );
  }

  /**
   * Infer topic for a sparse region based on nearest notes
   */
  async inferTopicForRegion(
    _region: SparseRegion,
    noteTitles: string[]
  ): Promise<string | undefined> {
    if (!this.llmService.isAvailable()) {
      return undefined;
    }

    const result = await this.llmService.inferTopic(noteTitles);
    return result.topic;
  }

  /**
   * Generate content suggestion for an undefined concept
   */
  async suggestContentForConcept(
    concept: UndefinedConcept
  ): Promise<string | undefined> {
    if (!this.llmService.isAvailable()) {
      return undefined;
    }

    return this.llmService.describeUndefinedConcept(
      concept.name,
      concept.mentionedIn
    );
  }

  private buildContext(gap: KnowledgeGap): string {
    const contextParts: string[] = [];

    contextParts.push(`Gap Type: ${gap.type}`);
    contextParts.push(`Severity: ${gap.severity}`);

    if (gap.relatedNotes.length > 0) {
      contextParts.push(`Related Notes: ${gap.relatedNotes.slice(0, 5).join(', ')}`);
    }

    if (gap.suggestedTopics.length > 0) {
      contextParts.push(`Initial Suggestions: ${gap.suggestedTopics.join(', ')}`);
    }

    return contextParts.join('\n');
  }

  private generateFallbackSuggestions(gap: KnowledgeGap): ExplorationSuggestion[] {
    // Generate basic suggestions without LLM
    const suggestions: ExplorationSuggestion[] = [];

    switch (gap.type) {
      case 'sparse_region':
        suggestions.push({
          topic: gap.title,
          questions: [
            'What are the key concepts in this area?',
            'How does this relate to your existing knowledge?',
            'What resources could help you learn more?',
          ],
          subtopics: gap.suggestedTopics.slice(0, 3),
          rationale: 'This area has fewer notes compared to other parts of your knowledge base.',
        });
        break;

      case 'undefined_concept':
        suggestions.push({
          topic: gap.title,
          questions: [
            `What is ${gap.title}?`,
            `Why is ${gap.title} mentioned in your notes?`,
            `How does ${gap.title} connect to your existing knowledge?`,
          ],
          subtopics: [],
          rationale: 'This concept is frequently referenced but not yet documented.',
        });
        break;

      case 'weak_connection':
        suggestions.push({
          topic: gap.title,
          questions: [
            'What bridges these isolated concepts?',
            'Are there hidden relationships to explore?',
          ],
          subtopics: gap.suggestedTopics,
          rationale: 'This area could benefit from better connections to other knowledge.',
        });
        break;
    }

    return suggestions;
  }
}
