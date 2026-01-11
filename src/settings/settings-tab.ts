/**
 * Knowledge Gap Detector Settings Tab
 * Multi-provider support settings UI
 */

import { App, PluginSettingTab, Setting, Notice, DropdownComponent } from 'obsidian';
import type KnowledgeGapDetectorPlugin from '../main';
import { DEFAULT_SETTINGS } from './settings';
import {
  AIProviderType,
  AI_PROVIDERS,
  getModelsByProvider,
} from '../core/domain/constants';

export class KnowledgeGapSettingsTab extends PluginSettingTab {
  plugin: KnowledgeGapDetectorPlugin;
  private modelDropdown: DropdownComponent | null = null;

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

    // AI Settings Section
    this.renderAISection(containerEl);

    // Analysis Settings Section
    this.renderAnalysisSection(containerEl);

    // Exclusion Settings Section
    this.renderExclusionSection(containerEl);

    // Auto-Analysis Section
    this.renderAutoAnalysisSection(containerEl);

    // Advanced Settings Section
    this.renderAdvancedSection(containerEl);
  }

  private renderAISection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'AI Settings' });

    const currentProvider = this.plugin.settings.ai.provider;
    const currentProviderConfig = AI_PROVIDERS[currentProvider];

    // Enable AI toggle
    new Setting(containerEl)
      .setName('Enable AI Analysis')
      .setDesc('Use AI to infer gap topics and generate exploration suggestions')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ai.enabled)
          .onChange(async (value) => {
            this.plugin.settings.ai.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    // Provider selection
    new Setting(containerEl)
      .setName('AI Provider')
      .setDesc('Select the AI service to use')
      .addDropdown((dropdown) => {
        Object.entries(AI_PROVIDERS).forEach(([key, config]) => {
          dropdown.addOption(key, config.displayName);
        });
        dropdown.setValue(currentProvider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.ai.provider = value as AIProviderType;
          await this.plugin.saveSettings();
          this.display(); // Refresh to update model dropdown
        });
      });

    // API Key input with Test button
    new Setting(containerEl)
      .setName(`${currentProviderConfig.displayName} API Key`)
      .setDesc(this.getApiKeyDescription(currentProvider))
      .addText((text) => {
        text
          .setPlaceholder('Enter API key')
          .setValue(this.plugin.settings.ai.apiKeys[currentProvider] ?? '')
          .onChange(async (value) => {
            this.plugin.settings.ai.apiKeys[currentProvider] = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        text.inputEl.style.width = '300px';
      })
      .addButton((button) => {
        button
          .setButtonText('Test')
          .onClick(async () => {
            const apiKey = this.plugin.settings.ai.apiKeys[currentProvider];

            if (!apiKey) {
              new Notice('Please enter the API key first.');
              return;
            }

            button.setDisabled(true);
            button.setButtonText('Testing...');

            try {
              const isValid = await this.plugin.testApiKey(currentProvider, apiKey);
              if (isValid) {
                new Notice(`✅ ${currentProviderConfig.displayName} API key is valid!`);
              } else {
                new Notice(`❌ ${currentProviderConfig.displayName} API key is invalid.`);
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              new Notice(`❌ Test failed: ${message}`);
            } finally {
              button.setDisabled(false);
              button.setButtonText('Test');
            }
          });
      })
      .addExtraButton((button) =>
        button
          .setIcon('external-link')
          .setTooltip('Open API key page')
          .onClick(() => {
            window.open(this.getApiKeyUrl(currentProvider), '_blank');
          })
      );

    // Model selection
    new Setting(containerEl)
      .setName('Model')
      .setDesc('Select the model to use')
      .addDropdown((dropdown) => {
        this.modelDropdown = dropdown;
        this.populateModelDropdown(dropdown, currentProvider);
        dropdown.setValue(
          this.plugin.settings.ai.models[currentProvider] ??
            currentProviderConfig.defaultModel
        );
        dropdown.onChange(async (value) => {
          this.plugin.settings.ai.models[currentProvider] = value;
          await this.plugin.saveSettings();
        });
      });

    // Vault Embeddings info
    const infoEl = containerEl.createDiv({ cls: 'setting-item-description' });
    infoEl.style.marginTop = '15px';
    infoEl.style.padding = '10px';
    infoEl.style.backgroundColor = 'var(--background-secondary)';
    infoEl.style.borderRadius = '5px';
    infoEl.innerHTML = `
      <p style="margin: 0 0 5px 0;"><strong>📦 Vault Embeddings Integration</strong></p>
      <p style="margin: 0; font-size: 0.9em;">Sparse Region analysis uses embedding data from the <strong>Vault Embeddings</strong> plugin.<br>
      Please run "Embed All Notes" in Vault Embeddings first.</p>
    `;
  }

  private populateModelDropdown(dropdown: DropdownComponent, provider: AIProviderType): void {
    const models = getModelsByProvider(provider);
    models.forEach((model) => {
      dropdown.addOption(model.id, model.displayName);
    });
  }

  private getApiKeyDescription(provider: AIProviderType): string {
    switch (provider) {
      case 'claude':
        return 'Obtain from Anthropic Console.';
      case 'openai':
        return 'Obtain from OpenAI Platform.';
      case 'gemini':
        return 'Obtain from Google AI Studio.';
      case 'grok':
        return 'Obtain from xAI Console.';
      default:
        return 'Enter the API key.';
    }
  }

  private getApiKeyUrl(provider: AIProviderType): string {
    switch (provider) {
      case 'claude':
        return 'https://console.anthropic.com/settings/keys';
      case 'openai':
        return 'https://platform.openai.com/api-keys';
      case 'gemini':
        return 'https://aistudio.google.com/app/apikey';
      case 'grok':
        return 'https://console.x.ai/';
      default:
        return '';
    }
  }

  private renderAnalysisSection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: 'Analysis Settings' });

    new Setting(containerEl)
      .setName('Cluster Count')
      .setDesc('Number of clusters for K-means analysis (default: 10). Higher values enable finer gap detection')
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
      .setName('Minimum Mentions for Undefined Concepts')
      .setDesc('Minimum mentions required before a [[concept]] is flagged')
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
      .setDesc('Regions with density below this threshold are flagged as sparse (0-1, lower = sparser)')
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
      .setName('Maximum Gaps in Report')
      .setDesc('Maximum number of gaps to display in the analysis report')
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
      .setName('Excluded Folders')
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
    containerEl.createEl('h2', { text: 'Auto Analysis' });

    new Setting(containerEl)
      .setName('Enable Auto Analysis')
      .setDesc('Automatically run gap analysis periodically')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoAnalyze)
          .onChange(async (value) => {
            this.plugin.settings.autoAnalyze = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Analysis Interval (days)')
      .setDesc('Interval for auto analysis')
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
        text: `Last analysis: ${lastDate.toLocaleDateString()} ${lastDate.toLocaleTimeString()}`,
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
      .setDesc('Reset all settings to defaults (API keys are preserved)')
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            const apiKeys = { ...this.plugin.settings.ai.apiKeys }; // Preserve API keys
            this.plugin.settings = {
              ...DEFAULT_SETTINGS,
              ai: {
                ...DEFAULT_SETTINGS.ai,
                apiKeys,
              },
            };
            await this.plugin.saveSettings();
            this.display(); // Refresh the display
          })
      );
  }
}
