/**
 * Knowledge Gap Detector Plugin
 * Detects knowledge gaps in your vault using embedding analysis and link graph
 */

import { Plugin, Notice } from 'obsidian';
import { KnowledgeGapSettings, DEFAULT_SETTINGS } from './settings/settings';
import { KnowledgeGapSettingsTab } from './settings/settings-tab';
import { GapReportModal } from './views/gap-report-modal';

// Domain imports
import type { GapReport } from './core/domain/interfaces/gap-analyzer.interface';

// Application imports
import { AnalyzeGapsUseCase } from './core/application/use-cases/analyze-gaps';
import { DetectSparseRegionsUseCase } from './core/application/use-cases/detect-sparse-regions';
import { FindUndefinedConceptsUseCase } from './core/application/use-cases/find-undefined-concepts';

// Adapter imports
import { VaultEmbeddingsReader } from './adapters/embeddings/vault-embeddings-reader';
import { ObsidianLinkGraphReader } from './adapters/graph/obsidian-link-graph-reader';
import { KMeansClusteringService } from './adapters/clustering/kmeans-clustering-service';
import { OpenAILLMService } from './adapters/llm/openai-llm-service';

export default class KnowledgeGapDetectorPlugin extends Plugin {
  settings!: KnowledgeGapSettings;

  // Services
  private embeddingReader!: VaultEmbeddingsReader;
  private linkGraphReader!: ObsidianLinkGraphReader;
  private clusteringService!: KMeansClusteringService;
  private llmService!: OpenAILLMService;

  // Use cases
  private analyzeGapsUseCase!: AnalyzeGapsUseCase;
  private detectSparseRegionsUseCase!: DetectSparseRegionsUseCase;
  private findUndefinedConceptsUseCase!: FindUndefinedConceptsUseCase;

  // State
  private isAnalyzing = false;
  private lastReport: GapReport | null = null;

  async onload(): Promise<void> {
    console.log('Loading Knowledge Gap Detector plugin');

    await this.loadSettings();
    this.initializeServices();

    // Register settings tab
    this.addSettingTab(new KnowledgeGapSettingsTab(this.app, this));

    // Register commands
    this.registerCommands();

    // Add ribbon icon
    this.addRibbonIcon('search', 'Analyze Knowledge Gaps', async () => {
      await this.runAnalysis();
    });

    // Check for auto-analysis
    this.checkAutoAnalysis();
  }

  onunload(): void {
    console.log('Unloading Knowledge Gap Detector plugin');
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // Update LLM service with new settings
    if (this.llmService) {
      this.llmService.setApiKey(this.settings.openaiApiKey);
    }
  }

  private initializeServices(): void {
    // Initialize adapters
    this.embeddingReader = new VaultEmbeddingsReader(this.app.vault);
    this.linkGraphReader = new ObsidianLinkGraphReader(this.app.vault);
    this.clusteringService = new KMeansClusteringService();
    this.llmService = new OpenAILLMService({
      apiKey: this.settings.openaiApiKey,
      model: this.settings.llmModel,
    });

    // Set exclusion folders
    this.linkGraphReader.setExcludeFolders(this.settings.excludeFolders);

    // Initialize use cases
    this.detectSparseRegionsUseCase = new DetectSparseRegionsUseCase(
      this.embeddingReader,
      this.clusteringService
    );

    this.findUndefinedConceptsUseCase = new FindUndefinedConceptsUseCase(
      this.linkGraphReader
    );

    // AnalyzeGapsUseCase creates sub-use cases internally
    this.analyzeGapsUseCase = new AnalyzeGapsUseCase(
      this.embeddingReader,
      this.linkGraphReader,
      this.clusteringService,
      this.llmService
    );
  }

  private registerCommands(): void {
    // Main analysis command
    this.addCommand({
      id: 'analyze-knowledge-gaps',
      name: 'Analyze Knowledge Gaps',
      callback: () => this.runAnalysis(),
    });

    // Show last report
    this.addCommand({
      id: 'show-gap-report',
      name: 'Show Last Gap Report',
      callback: () => this.showLastReport(),
    });

    // Find undefined concepts only
    this.addCommand({
      id: 'find-undefined-concepts',
      name: 'Find Undefined Concepts',
      callback: () => this.findUndefinedConcepts(),
    });

    // Detect sparse regions only
    this.addCommand({
      id: 'detect-sparse-regions',
      name: 'Detect Sparse Regions',
      callback: () => this.detectSparseRegions(),
    });

    // Clear cache
    this.addCommand({
      id: 'clear-analysis-cache',
      name: 'Clear Analysis Cache',
      callback: () => this.clearCache(),
    });
  }

  async runAnalysis(): Promise<void> {
    if (this.isAnalyzing) {
      new Notice('Analysis already in progress...');
      return;
    }

    // Check if Vault Embeddings is available
    const embeddingsAvailable = await this.embeddingReader.isAvailable();
    if (!embeddingsAvailable) {
      new Notice(
        'Vault Embeddings not found. Please install and run the Vault Embeddings plugin first.',
        10000
      );
      return;
    }

    this.isAnalyzing = true;
    const notice = new Notice('Analyzing knowledge gaps...', 0);

    try {
      // Update settings before analysis
      this.linkGraphReader.setExcludeFolders(this.settings.excludeFolders);

      // Run analysis
      const report = await this.analyzeGapsUseCase.execute({
        clusterCount: this.settings.clusterCount,
        sparsityThreshold: this.settings.sparseDensityThreshold,
        minMentions: this.settings.minMentionsForUndefined,
        useLLM: this.settings.enableLLMSuggestions && this.llmService.isAvailable(),
        maxGaps: this.settings.maxGapsInReport,
        excludeFolders: this.settings.excludeFolders,
      });

      this.lastReport = report;

      // Update last analyzed timestamp
      this.settings.lastAnalyzedAt = Date.now();
      await this.saveSettings();

      notice.hide();

      // Show results modal
      new GapReportModal(this.app, report).open();

      const significantCount = report.gaps.filter((g) => g.severity === 'significant').length;
      new Notice(
        `Analysis complete: ${report.gaps.length} gaps found (${significantCount} significant)`
      );
    } catch (error) {
      notice.hide();
      console.error('Knowledge gap analysis failed:', error);
      new Notice(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isAnalyzing = false;
    }
  }

  private showLastReport(): void {
    if (!this.lastReport) {
      new Notice('No analysis report available. Run "Analyze Knowledge Gaps" first.');
      return;
    }

    new GapReportModal(this.app, this.lastReport).open();
  }

  private async findUndefinedConcepts(): Promise<void> {
    const notice = new Notice('Finding undefined concepts...', 0);

    try {
      this.linkGraphReader.setExcludeFolders(this.settings.excludeFolders);
      const concepts = await this.findUndefinedConceptsUseCase.execute({
        minMentions: this.settings.minMentionsForUndefined,
        maxConcepts: this.settings.maxGapsInReport,
        excludeFolders: this.settings.excludeFolders,
      });

      notice.hide();

      if (concepts.length === 0) {
        new Notice('No undefined concepts found!');
      } else {
        // Create a minimal report for the modal
        const report: GapReport = {
          gaps: [],
          sparseRegions: [],
          undefinedConcepts: concepts,
          analyzedAt: new Date(),
          totalNotesAnalyzed: 0,
          totalEmbeddings: 0,
          options: {},
        };
        new GapReportModal(this.app, report).open();
        new Notice(`Found ${concepts.length} undefined concepts`);
      }
    } catch (error) {
      notice.hide();
      console.error('Find undefined concepts failed:', error);
      new Notice(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async detectSparseRegions(): Promise<void> {
    const embeddingsAvailable = await this.embeddingReader.isAvailable();
    if (!embeddingsAvailable) {
      new Notice(
        'Vault Embeddings not found. Please install and run the Vault Embeddings plugin first.',
        10000
      );
      return;
    }

    const notice = new Notice('Detecting sparse regions...', 0);

    try {
      const regions = await this.detectSparseRegionsUseCase.execute({
        clusterCount: this.settings.clusterCount,
        sparsityThreshold: this.settings.sparseDensityThreshold,
        excludeFolders: this.settings.excludeFolders,
      });

      notice.hide();

      if (regions.length === 0) {
        new Notice('No sparse regions detected!');
      } else {
        // Create a minimal report for the modal
        const report: GapReport = {
          gaps: [],
          sparseRegions: regions,
          undefinedConcepts: [],
          analyzedAt: new Date(),
          totalNotesAnalyzed: 0,
          totalEmbeddings: 0,
          options: {},
        };
        new GapReportModal(this.app, report).open();
        new Notice(`Found ${regions.length} sparse regions`);
      }
    } catch (error) {
      notice.hide();
      console.error('Detect sparse regions failed:', error);
      new Notice(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private clearCache(): void {
    this.embeddingReader.clearCache();
    this.linkGraphReader.clearCache();
    this.lastReport = null;
    new Notice('Analysis cache cleared');
  }

  private checkAutoAnalysis(): void {
    if (!this.settings.autoAnalyze) {
      return;
    }

    const lastAnalyzed = this.settings.lastAnalyzedAt;
    if (!lastAnalyzed) {
      // Never analyzed, run now
      setTimeout(() => this.runAnalysis(), 5000);
      return;
    }

    const intervalMs = this.settings.analyzeIntervalDays * 24 * 60 * 60 * 1000;
    const timeSinceLastAnalysis = Date.now() - lastAnalyzed;

    if (timeSinceLastAnalysis >= intervalMs) {
      // Run analysis after a short delay
      setTimeout(() => {
        new Notice('Running scheduled knowledge gap analysis...', 3000);
        this.runAnalysis();
      }, 5000);
    }
  }
}
