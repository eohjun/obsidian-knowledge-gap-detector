/**
 * Knowledge Gap Detector Settings Tab
 * 다중 프로바이더 지원 설정 UI
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
    containerEl.createEl('h2', { text: 'AI 설정' });

    const currentProvider = this.plugin.settings.ai.provider;
    const currentProviderConfig = AI_PROVIDERS[currentProvider];

    // Enable AI toggle
    new Setting(containerEl)
      .setName('AI 분석 사용')
      .setDesc('AI를 사용하여 Gap 주제를 추론하고 탐구 제안을 생성합니다')
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
      .setName('AI 프로바이더')
      .setDesc('사용할 AI 서비스를 선택하세요')
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
      .setName(`${currentProviderConfig.displayName} API 키`)
      .setDesc(this.getApiKeyDescription(currentProvider))
      .addText((text) => {
        text
          .setPlaceholder('API 키 입력')
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
          .setButtonText('테스트')
          .onClick(async () => {
            const apiKey = this.plugin.settings.ai.apiKeys[currentProvider];

            if (!apiKey) {
              new Notice('API 키를 먼저 입력해주세요.');
              return;
            }

            button.setDisabled(true);
            button.setButtonText('테스트 중...');

            try {
              const isValid = await this.plugin.testApiKey(currentProvider, apiKey);
              if (isValid) {
                new Notice(`✅ ${currentProviderConfig.displayName} API 키가 유효합니다!`);
              } else {
                new Notice(`❌ ${currentProviderConfig.displayName} API 키가 유효하지 않습니다.`);
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : '알 수 없는 오류';
              new Notice(`❌ 테스트 실패: ${message}`);
            } finally {
              button.setDisabled(false);
              button.setButtonText('테스트');
            }
          });
      })
      .addExtraButton((button) =>
        button
          .setIcon('external-link')
          .setTooltip('API 키 발급 페이지 열기')
          .onClick(() => {
            window.open(this.getApiKeyUrl(currentProvider), '_blank');
          })
      );

    // Model selection
    new Setting(containerEl)
      .setName('모델')
      .setDesc('사용할 모델을 선택하세요')
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
      <p style="margin: 0 0 5px 0;"><strong>📦 Vault Embeddings 연동</strong></p>
      <p style="margin: 0; font-size: 0.9em;">Sparse Region 분석은 <strong>Vault Embeddings</strong> 플러그인의 임베딩 데이터를 사용합니다.<br>
      Vault Embeddings에서 "Embed All Notes"를 먼저 실행하세요.</p>
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
        return 'Anthropic Console에서 발급받을 수 있습니다.';
      case 'openai':
        return 'OpenAI Platform에서 발급받을 수 있습니다.';
      case 'gemini':
        return 'Google AI Studio에서 발급받을 수 있습니다.';
      case 'grok':
        return 'xAI Console에서 발급받을 수 있습니다.';
      default:
        return 'API 키를 입력하세요.';
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
    containerEl.createEl('h2', { text: '분석 설정' });

    new Setting(containerEl)
      .setName('클러스터 수')
      .setDesc('K-means 분석에 사용할 클러스터 수 (기본: 10). 높을수록 세밀한 Gap 탐지')
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
      .setName('미정의 개념 최소 언급 횟수')
      .setDesc('[[개념]]이 플래그되려면 최소 몇 번 언급되어야 하는지')
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
      .setName('Sparse 밀도 임계값')
      .setDesc('이 임계값 미만의 밀도를 가진 영역이 sparse로 플래그됨 (0-1, 낮을수록 sparse)')
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
      .setName('리포트 최대 Gap 수')
      .setDesc('분석 리포트에 표시할 최대 Gap 수')
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
    containerEl.createEl('h2', { text: '제외 설정' });

    new Setting(containerEl)
      .setName('제외 폴더')
      .setDesc('분석에서 제외할 폴더 (쉼표로 구분)')
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
    containerEl.createEl('h2', { text: '자동 분석' });

    new Setting(containerEl)
      .setName('자동 분석 활성화')
      .setDesc('주기적으로 Gap 분석을 자동 실행합니다')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoAnalyze)
          .onChange(async (value) => {
            this.plugin.settings.autoAnalyze = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('분석 주기 (일)')
      .setDesc('자동 분석 실행 주기')
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
        text: `마지막 분석: ${lastDate.toLocaleDateString()} ${lastDate.toLocaleTimeString()}`,
        cls: 'setting-item-description',
      });
    }
  }

  private renderAdvancedSection(containerEl: HTMLElement): void {
    containerEl.createEl('h2', { text: '고급 설정' });

    new Setting(containerEl)
      .setName('K-Means++ 초기화 사용')
      .setDesc('더 나은 클러스터 초기화를 위해 K-Means++ 사용 (권장)')
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
      .setName('기본값으로 초기화')
      .setDesc('모든 설정을 기본값으로 초기화합니다 (API 키는 유지)')
      .addButton((button) =>
        button
          .setButtonText('초기화')
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
