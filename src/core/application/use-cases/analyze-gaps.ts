/**
 * Analyze Gaps Use Case
 * Main orchestrator for complete gap analysis
 */

import type { IEmbeddingReader } from '../../domain/interfaces/embedding-reader.interface';
import type { ILinkGraphReader } from '../../domain/interfaces/link-graph-reader.interface';
import type { IClusteringService } from '../../domain/interfaces/clustering-service.interface';
import type { ILLMService } from '../../domain/interfaces/llm-service.interface';
import type {
  AnalyzeOptions,
  GapReport,
  GapAnalysisProgress,
} from '../../domain/interfaces/gap-analyzer.interface';
import type { KnowledgeGap, GapSeverity } from '../../domain/entities/knowledge-gap';
import { createKnowledgeGap } from '../../domain/entities/knowledge-gap';
import type { SparseRegion } from '../../domain/entities/sparse-region';
import type { UndefinedConcept } from '../../domain/entities/undefined-concept';
import { DetectSparseRegionsUseCase } from './detect-sparse-regions';
import { FindUndefinedConceptsUseCase } from './find-undefined-concepts';
import { SuggestExplorationUseCase } from './suggest-exploration';
import { extractNoteTitle } from '../../domain/utils/note-id';

export class AnalyzeGapsUseCase {
  private progressCallback?: (progress: GapAnalysisProgress) => void;
  private cancelled = false;

  private detectSparseRegions: DetectSparseRegionsUseCase;
  private findUndefinedConcepts: FindUndefinedConceptsUseCase;
  private suggestExploration: SuggestExplorationUseCase;

  constructor(
    private embeddingReader: IEmbeddingReader,
    linkGraphReader: ILinkGraphReader,
    clusteringService: IClusteringService,
    private llmService: ILLMService
  ) {
    this.detectSparseRegions = new DetectSparseRegionsUseCase(
      embeddingReader,
      clusteringService
    );
    this.findUndefinedConcepts = new FindUndefinedConceptsUseCase(linkGraphReader);
    this.suggestExploration = new SuggestExplorationUseCase(llmService);
  }

  onProgress(callback: (progress: GapAnalysisProgress) => void): void {
    this.progressCallback = callback;
  }

  cancel(): void {
    this.cancelled = true;
  }

  async execute(options: AnalyzeOptions = {}): Promise<GapReport> {
    this.cancelled = false;

    const {
      clusterCount,
      minMentions = 2,
      sparsityThreshold = 0.3,
      excludeFolders = [],
      useLLM = true,
      maxGaps = 50,
    } = options;

    // Phase 1: Loading
    this.reportProgress('loading', 0, 'Loading embeddings...');
    const isAvailable = await this.embeddingReader.isAvailable();
    if (!isAvailable) {
      throw new Error('Vault Embeddings data not found. Please ensure Vault Embeddings plugin is installed and has indexed your vault.');
    }

    const embeddingCount = await this.embeddingReader.getEmbeddingCount();
    this.reportProgress('loading', 20, `Found ${embeddingCount} embedded notes`);

    if (this.cancelled) return this.createEmptyReport(options);

    // Phase 2: Clustering
    this.reportProgress('clustering', 25, 'Analyzing embedding clusters...');
    const sparseRegions = await this.detectSparseRegions.execute({
      clusterCount,
      sparsityThreshold,
      excludeFolders,
    });
    this.reportProgress('clustering', 50, `Found ${sparseRegions.length} sparse regions`);

    if (this.cancelled) return this.createEmptyReport(options);

    // Phase 3: Link Analysis
    this.reportProgress('analyzing_links', 55, 'Analyzing link graph...');
    const undefinedConcepts = await this.findUndefinedConcepts.execute({
      minMentions,
      excludeFolders,
    });
    this.reportProgress('analyzing_links', 70, `Found ${undefinedConcepts.length} undefined concepts`);

    if (this.cancelled) return this.createEmptyReport(options);

    // Phase 4: Generate Suggestions (if LLM available)
    let enrichedRegions = sparseRegions;
    let enrichedConcepts = undefinedConcepts;

    if (useLLM && this.llmService.isAvailable()) {
      this.reportProgress('generating_suggestions', 75, 'Generating topic suggestions...');

      // Infer topics for sparse regions
      enrichedRegions = await this.enrichSparseRegions(sparseRegions);
      this.reportProgress('generating_suggestions', 85, 'Enriching concepts...');

      // Generate content suggestions for top undefined concepts
      enrichedConcepts = await this.enrichUndefinedConcepts(
        undefinedConcepts.slice(0, 10)
      );
    }

    if (this.cancelled) return this.createEmptyReport(options);

    // Phase 5: Create Knowledge Gaps
    this.reportProgress('generating_suggestions', 90, 'Creating gap report...');
    const gaps = this.createKnowledgeGaps(enrichedRegions, enrichedConcepts);

    // Sort and limit gaps
    const sortedGaps = this.sortGapsByPriority(gaps).slice(0, maxGaps);

    // Complete
    this.reportProgress('complete', 100, 'Analysis complete');

    return {
      analyzedAt: new Date(),
      totalNotesAnalyzed: embeddingCount,
      totalEmbeddings: embeddingCount,
      sparseRegions: enrichedRegions,
      undefinedConcepts: enrichedConcepts,
      gaps: sortedGaps,
      options,
    };
  }

  private reportProgress(
    phase: GapAnalysisProgress['phase'],
    progress: number,
    message: string
  ): void {
    if (this.progressCallback) {
      this.progressCallback({ phase, progress, message });
    }
  }

  private async enrichSparseRegions(regions: SparseRegion[]): Promise<SparseRegion[]> {
    const enriched: SparseRegion[] = [];

    for (const region of regions) {
      if (this.cancelled) break;

      const noteTitles = region.nearestNotes
        .slice(0, 5)
        .map((n) => extractNoteTitle(n.notePath));

      const inferredTopic = await this.suggestExploration.inferTopicForRegion(
        region,
        noteTitles
      );

      enriched.push({
        ...region,
        inferredTopic: inferredTopic || `Cluster ${region.id}`,
      });
    }

    return enriched;
  }

  private async enrichUndefinedConcepts(
    concepts: UndefinedConcept[]
  ): Promise<UndefinedConcept[]> {
    const enriched: UndefinedConcept[] = [];

    for (const concept of concepts) {
      if (this.cancelled) break;

      const suggestedContent = await this.suggestExploration.suggestContentForConcept(
        concept
      );

      enriched.push({
        ...concept,
        suggestedContent,
      });
    }

    return enriched;
  }

  private createKnowledgeGaps(
    sparseRegions: SparseRegion[],
    undefinedConcepts: UndefinedConcept[]
  ): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    // Create gaps from sparse regions
    for (const region of sparseRegions) {
      const severity = this.calculateSparseRegionSeverity(region);
      gaps.push(
        createKnowledgeGap({
          id: `sparse-${region.id}`,
          type: 'sparse_region',
          title: region.inferredTopic || `Low Coverage Area ${region.id}`,
          description: `This area of your knowledge base has low note density (${(region.density * 100).toFixed(1)}%). Consider exploring topics related to: ${region.nearestNotes.slice(0, 3).map((n) => extractNoteTitle(n.notePath)).join(', ')}.`,
          severity,
          suggestedTopics: region.nearestNotes.slice(0, 5).map((n) => extractNoteTitle(n.notePath)),
          relatedNotes: region.nearestNotes.slice(0, 10).map((n) => n.notePath),
        })
      );
    }

    // Create gaps from undefined concepts
    for (const concept of undefinedConcepts) {
      const severity = this.calculateConceptSeverity(concept);
      gaps.push(
        createKnowledgeGap({
          id: `undefined-${concept.name.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'undefined_concept',
          title: concept.name,
          description: `"${concept.name}" is mentioned ${concept.mentionCount} times but has no dedicated note.${concept.suggestedContent ? ` Suggested focus: ${concept.suggestedContent.slice(0, 100)}...` : ''}`,
          severity,
          suggestedTopics: concept.relatedConcepts.slice(0, 5),
          relatedNotes: concept.mentionedIn.slice(0, 10),
        })
      );
    }

    return gaps;
  }

  private calculateSparseRegionSeverity(region: SparseRegion): GapSeverity {
    if (region.density < 0.1) return 'significant';
    if (region.density < 0.2) return 'moderate';
    return 'minor';
  }

  private calculateConceptSeverity(concept: UndefinedConcept): GapSeverity {
    if (concept.mentionCount >= 10) return 'significant';
    if (concept.mentionCount >= 5) return 'moderate';
    return 'minor';
  }

  private sortGapsByPriority(gaps: KnowledgeGap[]): KnowledgeGap[] {
    const severityOrder: Record<GapSeverity, number> = {
      significant: 3,
      moderate: 2,
      minor: 1,
    };

    return [...gaps].sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      // Secondary sort by type (undefined concepts first as they're more actionable)
      if (a.type === 'undefined_concept' && b.type !== 'undefined_concept') return -1;
      if (b.type === 'undefined_concept' && a.type !== 'undefined_concept') return 1;

      return 0;
    });
  }

  private createEmptyReport(options: AnalyzeOptions): GapReport {
    return {
      analyzedAt: new Date(),
      totalNotesAnalyzed: 0,
      totalEmbeddings: 0,
      sparseRegions: [],
      undefinedConcepts: [],
      gaps: [],
      options,
    };
  }
}
