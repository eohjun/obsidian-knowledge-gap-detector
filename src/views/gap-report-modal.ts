/**
 * Gap Report Modal
 * Displays knowledge gap analysis results in a modal dialog
 */

import { App, Modal, Notice, setIcon } from 'obsidian';
import type { GapReport } from '../core/domain/interfaces/gap-analyzer.interface';
import type { KnowledgeGap } from '../core/domain/entities/knowledge-gap';
import type { SparseRegion } from '../core/domain/entities/sparse-region';
import type { UndefinedConcept } from '../core/domain/entities/undefined-concept';
import { MarkdownReportPresenter } from '../adapters/presenters/markdown-report-presenter';

type TabType = 'overview' | 'gaps' | 'sparse' | 'undefined';

export class GapReportModal extends Modal {
  private report: GapReport;
  private presenter: MarkdownReportPresenter;
  private activeTab: TabType = 'overview';

  constructor(app: App, report: GapReport) {
    super(app);
    this.report = report;
    this.presenter = new MarkdownReportPresenter();
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;

    // Set modal size
    modalEl.addClass('knowledge-gap-modal');

    // Header
    this.renderHeader(contentEl);

    // Tab navigation
    this.renderTabs(contentEl);

    // Content area
    const contentArea = contentEl.createDiv({ cls: 'gap-report-content' });
    this.renderTabContent(contentArea);
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderHeader(container: HTMLElement): void {
    const header = container.createDiv({ cls: 'gap-report-header' });

    const titleContainer = header.createDiv({ cls: 'gap-report-title-container' });
    const icon = titleContainer.createSpan({ cls: 'gap-report-icon' });
    setIcon(icon, 'search');
    titleContainer.createEl('h2', { text: 'Knowledge Gap Analysis' });

    // Quick stats
    const stats = header.createDiv({ cls: 'gap-report-stats' });

    const significantCount = this.report.gaps.filter((g) => g.severity === 'significant').length;

    this.createStatBadge(stats, 'Total Gaps', this.report.gaps.length.toString(), 'search');
    this.createStatBadge(stats, 'Significant', significantCount.toString(), 'alert-circle');
    this.createStatBadge(stats, 'Sparse Regions', this.report.sparseRegions.length.toString(), 'map');
    this.createStatBadge(stats, 'Undefined', this.report.undefinedConcepts.length.toString(), 'help-circle');

    // Export button
    const actions = header.createDiv({ cls: 'gap-report-actions' });
    const exportBtn = actions.createEl('button', {
      text: 'Export as Markdown',
      cls: 'mod-cta',
    });
    exportBtn.onclick = () => this.exportReport();
  }

  private createStatBadge(container: HTMLElement, label: string, value: string, iconName: string): void {
    const badge = container.createDiv({ cls: 'stat-badge' });
    const iconEl = badge.createSpan({ cls: 'stat-icon' });
    setIcon(iconEl, iconName);
    badge.createSpan({ cls: 'stat-value', text: value });
    badge.createSpan({ cls: 'stat-label', text: label });
  }

  private renderTabs(container: HTMLElement): void {
    const tabBar = container.createDiv({ cls: 'gap-report-tabs' });

    const tabs: Array<{ id: TabType; label: string; icon: string }> = [
      { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
      { id: 'gaps', label: 'Top Gaps', icon: 'alert-triangle' },
      { id: 'sparse', label: 'Sparse Regions', icon: 'map' },
      { id: 'undefined', label: 'Undefined Concepts', icon: 'help-circle' },
    ];

    for (const tab of tabs) {
      const tabEl = tabBar.createDiv({
        cls: `gap-report-tab ${this.activeTab === tab.id ? 'active' : ''}`,
      });
      const iconEl = tabEl.createSpan({ cls: 'tab-icon' });
      setIcon(iconEl, tab.icon);
      tabEl.createSpan({ text: tab.label });

      tabEl.onclick = () => {
        this.activeTab = tab.id;
        this.refreshContent();
      };
    }
  }

  private refreshContent(): void {
    const { contentEl } = this;

    // Update tab active state
    const tabs = contentEl.querySelectorAll('.gap-report-tab');
    tabs.forEach((tab, index) => {
      const tabIds: TabType[] = ['overview', 'gaps', 'sparse', 'undefined'];
      tab.removeClass('active');
      if (tabIds[index] === this.activeTab) {
        tab.addClass('active');
      }
    });

    // Re-render content
    const contentArea = contentEl.querySelector('.gap-report-content') as HTMLElement;
    if (contentArea) {
      contentArea.empty();
      this.renderTabContent(contentArea);
    }
  }

  private renderTabContent(container: HTMLElement): void {
    switch (this.activeTab) {
      case 'overview':
        this.renderOverview(container);
        break;
      case 'gaps':
        this.renderGapsList(container);
        break;
      case 'sparse':
        this.renderSparseRegions(container);
        break;
      case 'undefined':
        this.renderUndefinedConcepts(container);
        break;
    }
  }

  private renderOverview(container: HTMLElement): void {
    const overview = container.createDiv({ cls: 'gap-overview' });

    // Summary section
    const summary = overview.createDiv({ cls: 'overview-section' });
    summary.createEl('h3', { text: 'Summary' });

    const summaryGrid = summary.createDiv({ cls: 'summary-grid' });

    // By severity
    const severitySection = summaryGrid.createDiv({ cls: 'summary-card' });
    severitySection.createEl('h4', { text: 'By Severity' });
    const severities = ['significant', 'moderate', 'minor'] as const;
    const severityIcons = { significant: '🔴', moderate: '🟡', minor: '🟢' };
    for (const sev of severities) {
      const count = this.report.gaps.filter((g) => g.severity === sev).length;
      severitySection.createEl('p', {
        text: `${severityIcons[sev]} ${sev.charAt(0).toUpperCase() + sev.slice(1)}: ${count}`,
      });
    }

    // By type
    const typeSection = summaryGrid.createDiv({ cls: 'summary-card' });
    typeSection.createEl('h4', { text: 'By Type' });
    const types = ['sparse_region', 'undefined_concept', 'weak_connection'] as const;
    const typeLabels = {
      sparse_region: '🗺️ Sparse Regions',
      undefined_concept: '❓ Undefined Concepts',
      weak_connection: '🔗 Weak Connections',
    };
    for (const type of types) {
      const count = this.report.gaps.filter((g) => g.type === type).length;
      typeSection.createEl('p', { text: `${typeLabels[type]}: ${count}` });
    }

    // Top recommendations
    const recommendations = overview.createDiv({ cls: 'overview-section' });
    recommendations.createEl('h3', { text: 'Top Recommendations' });

    const topGaps = this.report.gaps.slice(0, 5);
    if (topGaps.length === 0) {
      recommendations.createEl('p', {
        text: 'No significant gaps detected. Your knowledge base looks healthy!',
        cls: 'no-gaps-message',
      });
    } else {
      const list = recommendations.createEl('ol', { cls: 'recommendations-list' });
      for (const gap of topGaps) {
        const li = list.createEl('li');
        li.createEl('strong', { text: gap.title });
        li.createEl('span', { text: ` - ${gap.description.slice(0, 100)}...` });
      }
    }

    // Analysis info
    const info = overview.createDiv({ cls: 'overview-section analysis-info' });
    info.createEl('p', {
      text: `Analysis completed: ${this.report.analyzedAt.toLocaleString()}`,
      cls: 'analysis-timestamp',
    });
  }

  private renderGapsList(container: HTMLElement): void {
    const list = container.createDiv({ cls: 'gaps-list' });

    if (this.report.gaps.length === 0) {
      list.createEl('p', {
        text: 'No knowledge gaps detected.',
        cls: 'empty-message',
      });
      return;
    }

    for (const gap of this.report.gaps) {
      this.renderGapCard(list, gap);
    }
  }

  private renderGapCard(container: HTMLElement, gap: KnowledgeGap): void {
    const card = container.createDiv({ cls: `gap-card severity-${gap.severity}` });

    // Header
    const header = card.createDiv({ cls: 'gap-card-header' });
    const severityIcon = this.getSeverityIcon(gap.severity);
    const typeIcon = this.getTypeIcon(gap.type);
    header.createEl('span', { text: `${severityIcon} ${typeIcon}`, cls: 'gap-icons' });
    header.createEl('h4', { text: gap.title });

    // Description
    card.createEl('p', { text: gap.description, cls: 'gap-description' });

    // Suggested topics
    if (gap.suggestedTopics.length > 0) {
      const topics = card.createDiv({ cls: 'gap-topics' });
      topics.createEl('strong', { text: 'Explore: ' });
      topics.createEl('span', { text: gap.suggestedTopics.slice(0, 3).join(', ') });
    }

    // Related notes
    if (gap.relatedNotes.length > 0) {
      const related = card.createDiv({ cls: 'gap-related' });
      related.createEl('strong', { text: 'Related: ' });
      for (const note of gap.relatedNotes.slice(0, 3)) {
        const noteName = note.split('/').pop()?.replace('.md', '') || note;
        const link = related.createEl('a', { text: noteName, cls: 'internal-link' });
        link.onclick = (e) => {
          e.preventDefault();
          this.app.workspace.openLinkText(note, '');
        };
        related.createEl('span', { text: ' ' });
      }
    }
  }

  private renderSparseRegions(container: HTMLElement): void {
    const list = container.createDiv({ cls: 'sparse-list' });

    if (this.report.sparseRegions.length === 0) {
      list.createEl('p', {
        text: 'No sparse regions detected. Your knowledge coverage is good!',
        cls: 'empty-message',
      });
      return;
    }

    for (let i = 0; i < this.report.sparseRegions.length; i++) {
      this.renderSparseRegionCard(list, this.report.sparseRegions[i], i + 1);
    }
  }

  private renderSparseRegionCard(container: HTMLElement, region: SparseRegion, index: number): void {
    const card = container.createDiv({ cls: 'sparse-card' });

    // Header
    const header = card.createDiv({ cls: 'sparse-card-header' });
    header.createEl('span', { text: `#${index}`, cls: 'sparse-index' });
    header.createEl('h4', { text: region.inferredTopic || `Region ${region.id}` });

    // Density bar
    const densityContainer = card.createDiv({ cls: 'density-container' });
    densityContainer.createEl('span', { text: 'Density: ', cls: 'density-label' });
    const bar = densityContainer.createDiv({ cls: 'density-bar' });
    const fill = bar.createDiv({ cls: 'density-fill' });
    fill.style.width = `${region.density * 100}%`;
    densityContainer.createEl('span', {
      text: `${(region.density * 100).toFixed(1)}%`,
      cls: 'density-value',
    });

    // Nearby notes
    if (region.nearestNotes.length > 0) {
      const nearby = card.createDiv({ cls: 'nearby-notes' });
      nearby.createEl('strong', { text: 'Nearby Notes: ' });
      for (const note of region.nearestNotes.slice(0, 3)) {
        const noteName = note.notePath.split('/').pop()?.replace('.md', '') || note.notePath;
        const link = nearby.createEl('a', { text: noteName, cls: 'internal-link' });
        link.onclick = (e) => {
          e.preventDefault();
          this.app.workspace.openLinkText(note.notePath, '');
        };
        nearby.createEl('span', { text: ' ' });
      }
    }
  }

  private renderUndefinedConcepts(container: HTMLElement): void {
    const list = container.createDiv({ cls: 'undefined-list' });

    if (this.report.undefinedConcepts.length === 0) {
      list.createEl('p', {
        text: 'No undefined concepts found. All referenced concepts have dedicated notes!',
        cls: 'empty-message',
      });
      return;
    }

    // Table header
    const table = list.createEl('table', { cls: 'undefined-table' });
    const thead = table.createEl('thead');
    const headerRow = thead.createEl('tr');
    headerRow.createEl('th', { text: 'Concept' });
    headerRow.createEl('th', { text: 'Mentions' });
    headerRow.createEl('th', { text: 'Sources' });
    headerRow.createEl('th', { text: 'Action' });

    const tbody = table.createEl('tbody');
    for (const concept of this.report.undefinedConcepts) {
      this.renderUndefinedConceptRow(tbody, concept);
    }
  }

  private renderUndefinedConceptRow(tbody: HTMLElement, concept: UndefinedConcept): void {
    const row = tbody.createEl('tr');

    // Concept name
    const nameCell = row.createEl('td');
    nameCell.createEl('strong', { text: concept.name });

    // Mention count
    row.createEl('td', { text: concept.mentionCount.toString() });

    // Sources
    const sourcesCell = row.createEl('td');
    const sources = concept.mentionedIn.slice(0, 2);
    for (const source of sources) {
      const noteName = source.split('/').pop()?.replace('.md', '') || source;
      const link = sourcesCell.createEl('a', { text: noteName, cls: 'internal-link' });
      link.onclick = (e) => {
        e.preventDefault();
        this.app.workspace.openLinkText(source, '');
      };
      sourcesCell.createEl('span', { text: ' ' });
    }
    if (concept.mentionedIn.length > 2) {
      sourcesCell.createEl('span', { text: `+${concept.mentionedIn.length - 2} more` });
    }

    // Action button
    const actionCell = row.createEl('td');
    const createBtn = actionCell.createEl('button', { text: 'Create Note', cls: 'mod-cta' });
    createBtn.onclick = () => this.createNoteForConcept(concept);
  }

  private async createNoteForConcept(concept: UndefinedConcept): Promise<void> {
    const content = `# ${concept.name}\n\n<!-- TODO: Define this concept -->\n\n## Related Concepts\n\n${concept.relatedConcepts.slice(0, 5).map((c) => `- [[${c}]]`).join('\n')}\n\n## Mentioned In\n\n${concept.mentionedIn.slice(0, 10).map((n) => `- [[${n.split('/').pop()?.replace('.md', '') || n}]]`).join('\n')}\n`;

    try {
      const path = `${concept.name}.md`;
      await this.app.vault.create(path, content);
      new Notice(`Created note: ${concept.name}`);
      await this.app.workspace.openLinkText(path, '');
    } catch (error) {
      new Notice(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async exportReport(): Promise<void> {
    const markdown = this.presenter.formatReport(this.report);
    const filename = `Knowledge-Gap-Report-${new Date().toISOString().split('T')[0]}.md`;

    try {
      await this.app.vault.create(filename, markdown);
      new Notice(`Report exported: ${filename}`);
      await this.app.workspace.openLinkText(filename, '');
    } catch (error) {
      new Notice(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'significant':
        return '🔴';
      case 'moderate':
        return '🟡';
      case 'minor':
        return '🟢';
      default:
        return '⚪';
    }
  }

  private getTypeIcon(type: string): string {
    switch (type) {
      case 'sparse_region':
        return '🗺️';
      case 'undefined_concept':
        return '❓';
      case 'weak_connection':
        return '🔗';
      default:
        return '📝';
    }
  }
}
