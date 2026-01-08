/**
 * Knowledge Gap Detector Settings Tab
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type KnowledgeGapDetectorPlugin from '../main';
import { DEFAULT_SETTINGS } from './settings';

export class KnowledgeGapSettingsTab extends PluginSettingTab {
  plugin: KnowledgeGapDetectorPlugin;

  constructor(app: App, plugin: KnowledgeGapDetectorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h1', { text: 'Knowledge Gap Detector' });
    containerEl.createEl('p', {
      text: 'Detect knowledge gaps in your vault using embedding analysis and link graph.',
      cls: 'setting-item-description',
    });

    // LLM Settings Section
    this.renderLLMSection(containerEl);

    // Analysis Settings Section
    this.renderAnalysisSection(containerEl);

    // Exclusion Settings Section
    this.renderExclusionSection(containerEl);

    // Auto-Analysis Section
    this.renderAutoAnalysisSection(containerEl);

    // Advanced Settings Section
    this.renderAdvancedSection(containerEl);
  }

  private renderLLMSection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'LLM Settings' });

    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('API key for LLM-based topic inference and suggestions')
      .addText((text) =>
        text
          .setPlaceholder('sk-...')
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value;
            await this.plugin.saveSettings();
          })
      )
      .addExtraButton((button) =>
        button
          .setIcon('external-link')
          .setTooltip('Get API key from OpenAI')
          .onClick(() => {
            window.open('https://platform.openai.com/api-keys', '_blank');
          })
      );

    new Setting(containerEl)
      .setName('LLM Model')
      .setDesc('Model to use for analysis (gpt-4o-mini is recommended for cost efficiency)')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('gpt-4o-mini', 'GPT-4o Mini (Recommended)')
          .addOption('gpt-4o', 'GPT-4o')
          .addOption('gpt-4-turbo', 'GPT-4 Turbo')
          .addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
          .setValue(this.plugin.settings.llmModel)
          .onChange(async (value) => {
            this.plugin.settings.llmModel = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Enable LLM Suggestions')
      .setDesc('Use LLM to generate topic suggestions for gaps (requires API key)')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableLLMSuggestions)
          .onChange(async (value) => {
            this.plugin.settings.enableLLMSuggestions = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private renderAnalysisSection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Analysis Settings' });

    new Setting(containerEl)
      .setName('Cluster Count')
      .setDesc('Number of clusters for K-means analysis (default: 10). Higher values detect more granular gaps.')
      .addSlider((slider) =>
        slider
          .setLimits(3, 30, 1)
          .setValue(this.plugin.settings.clusterCount)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.clusterCount = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Minimum Mentions for Undefined Concept')
      .setDesc('Minimum times a [[concept]] must be mentioned to be flagged as undefined')
      .addSlider((slider) =>
        slider
          .setLimits(1, 10, 1)
          .setValue(this.plugin.settings.minMentionsForUndefined)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.minMentionsForUndefined = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Sparse Density Threshold')
      .setDesc('Regions with density below this threshold are flagged as sparse (0-1, lower is sparser)')
      .addSlider((slider) =>
        slider
          .setLimits(0.1, 0.9, 0.1)
          .setValue(this.plugin.settings.sparseDensityThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.sparseDensityThreshold = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Max Gaps in Report')
      .setDesc('Maximum number of gaps to show in the analysis report')
      .addSlider((slider) =>
        slider
          .setLimits(10, 100, 10)
          .setValue(this.plugin.settings.maxGapsInReport)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxGapsInReport = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private renderExclusionSection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Exclusion Settings' });

    new Setting(containerEl)
      .setName('Exclude Folders')
      .setDesc('Folders to exclude from analysis (comma-separated)')
      .addTextArea((text) =>
        text
          .setPlaceholder('templates, .obsidian, archive')
          .setValue(this.plugin.settings.excludeFolders.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.excludeFolders = value
              .split(',')
              .map((f) => f.trim())
              .filter((f) => f.length > 0);
            await this.plugin.saveSettings();
          })
      );
  }

  private renderAutoAnalysisSection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Auto-Analysis' });

    new Setting(containerEl)
      .setName('Enable Auto-Analysis')
      .setDesc('Automatically run gap analysis on a schedule')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoAnalyze)
          .onChange(async (value) => {
            this.plugin.settings.autoAnalyze = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Analysis Interval (Days)')
      .setDesc('How often to run automatic analysis')
      .addSlider((slider) =>
        slider
          .setLimits(1, 30, 1)
          .setValue(this.plugin.settings.analyzeIntervalDays)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.analyzeIntervalDays = value;
            await this.plugin.saveSettings();
          })
      );

    // Last analyzed info
    if (this.plugin.settings.lastAnalyzedAt) {
      const lastDate = new Date(this.plugin.settings.lastAnalyzedAt);
      containerEl.createEl('p', {
        text: `Last analyzed: ${lastDate.toLocaleDateString()} ${lastDate.toLocaleTimeString()}`,
        cls: 'setting-item-description',
      });
    }
  }

  private renderAdvancedSection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Advanced Settings' });

    new Setting(containerEl)
      .setName('Use K-Means++ Initialization')
      .setDesc('Use K-Means++ for better cluster initialization (recommended)')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useKMeansPlusPlus)
          .onChange(async (value) => {
            this.plugin.settings.useKMeansPlusPlus = value;
            await this.plugin.saveSettings();
          })
      );

    // Reset to defaults
    new Setting(containerEl)
      .setName('Reset to Defaults')
      .setDesc('Reset all settings to their default values')
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            const apiKey = this.plugin.settings.openaiApiKey; // Preserve API key
            this.plugin.settings = { ...DEFAULT_SETTINGS, openaiApiKey: apiKey };
            await this.plugin.saveSettings();
            this.display(); // Refresh the display
          })
      );
  }
}
