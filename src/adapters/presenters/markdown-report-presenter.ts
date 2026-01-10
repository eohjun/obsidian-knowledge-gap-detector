/**
 * Markdown Report Presenter Adapter
 * Formats gap analysis results as Markdown for display and export
 */

import type { KnowledgeGap, GapSeverity } from '../../core/domain/entities/knowledge-gap';
import type { SparseRegion } from '../../core/domain/entities/sparse-region';
import type { UndefinedConcept } from '../../core/domain/entities/undefined-concept';
import type { GapReport } from '../../core/domain/interfaces/gap-analyzer.interface';

export interface ReportOptions {
  includeTimestamp?: boolean;
  includeSummary?: boolean;
  maxGapsToShow?: number;
  maxSparseRegions?: number;
  maxUndefinedConcepts?: number;
  showRelatedNotes?: boolean;
  showSuggestedTopics?: boolean;
}

const DEFAULT_OPTIONS: ReportOptions = {
  includeTimestamp: true,
  includeSummary: true,
  maxGapsToShow: 20,
  maxSparseRegions: 10,
  maxUndefinedConcepts: 15,
  showRelatedNotes: true,
  showSuggestedTopics: true,
};

export class MarkdownReportPresenter {
  /**
   * Generate a full gap report in Markdown format
   */
  formatReport(report: GapReport, options: ReportOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const sections: string[] = [];

    // Header
    sections.push('# Knowledge Gap Analysis Report\n');

    if (opts.includeTimestamp) {
      sections.push(`*Generated: ${report.analyzedAt.toLocaleString()}*\n`);
    }

    // Summary section
    if (opts.includeSummary) {
      sections.push(this.formatSummary(report));
    }

    // Top Knowledge Gaps
    if (report.gaps.length > 0) {
      sections.push(this.formatGaps(report.gaps, opts));
    }

    // Sparse Regions
    if (report.sparseRegions.length > 0) {
      sections.push(this.formatSparseRegions(report.sparseRegions, opts));
    }

    // Undefined Concepts
    if (report.undefinedConcepts.length > 0) {
      sections.push(this.formatUndefinedConcepts(report.undefinedConcepts, opts));
    }

    // Footer
    sections.push(this.formatFooter());

    return sections.join('\n');
  }

  /**
   * Format the summary section
   */
  private formatSummary(report: GapReport): string {
    const { gaps, sparseRegions, undefinedConcepts } = report;

    const severityCounts = {
      significant: gaps.filter((g) => g.severity === 'significant').length,
      moderate: gaps.filter((g) => g.severity === 'moderate').length,
      minor: gaps.filter((g) => g.severity === 'minor').length,
    };

    const typeCounts = {
      sparse_region: gaps.filter((g) => g.type === 'sparse_region').length,
      undefined_concept: gaps.filter((g) => g.type === 'undefined_concept').length,
      weak_connection: gaps.filter((g) => g.type === 'weak_connection').length,
    };

    return `## Summary

| Metric | Count |
|--------|-------|
| Total Gaps Detected | ${gaps.length} |
| Sparse Regions | ${sparseRegions.length} |
| Undefined Concepts | ${undefinedConcepts.length} |

### By Severity
- 🔴 **Significant**: ${severityCounts.significant}
- 🟡 **Moderate**: ${severityCounts.moderate}
- 🟢 **Minor**: ${severityCounts.minor}

### By Type
- 🗺️ Sparse Regions: ${typeCounts.sparse_region}
- ❓ Undefined Concepts: ${typeCounts.undefined_concept}
- 🔗 Weak Connections: ${typeCounts.weak_connection}
`;
  }

  /**
   * Format the knowledge gaps section
   */
  private formatGaps(gaps: KnowledgeGap[], opts: ReportOptions): string {
    const displayGaps = gaps.slice(0, opts.maxGapsToShow);
    const lines: string[] = ['## Top Knowledge Gaps\n'];

    for (const gap of displayGaps) {
      lines.push(this.formatSingleGap(gap, opts));
    }

    if (gaps.length > (opts.maxGapsToShow || 20)) {
      lines.push(`\n*...and ${gaps.length - (opts.maxGapsToShow || 20)} more gaps*\n`);
    }

    return lines.join('\n');
  }

  /**
   * Format a single knowledge gap
   */
  private formatSingleGap(gap: KnowledgeGap, opts: ReportOptions): string {
    const severityIcon = this.getSeverityIcon(gap.severity);
    const typeIcon = this.getTypeIcon(gap.type);

    const lines: string[] = [
      `### ${severityIcon} ${gap.title}`,
      '',
      `**Type**: ${typeIcon} ${this.formatGapType(gap.type)}`,
      `**Severity**: ${this.formatSeverity(gap.severity)}`,
      '',
      gap.description,
      '',
    ];

    if (opts.showSuggestedTopics && gap.suggestedTopics.length > 0) {
      lines.push('**Suggested Topics to Explore**:');
      for (const topic of gap.suggestedTopics.slice(0, 5)) {
        lines.push(`- ${topic}`);
      }
      lines.push('');
    }

    if (opts.showRelatedNotes && gap.relatedNotes.length > 0) {
      lines.push('**Related Notes**:');
      for (const note of gap.relatedNotes.slice(0, 5)) {
        lines.push(`- [[${this.extractNoteName(note)}]]`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format sparse regions section
   */
  private formatSparseRegions(regions: SparseRegion[], opts: ReportOptions): string {
    const displayRegions = regions.slice(0, opts.maxSparseRegions);
    const lines: string[] = ['## Sparse Regions\n'];

    lines.push('These are areas in your knowledge graph with low note density - potential areas for expansion.\n');

    for (let i = 0; i < displayRegions.length; i++) {
      const region = displayRegions[i];
      lines.push(this.formatSingleSparseRegion(region, i + 1));
    }

    if (regions.length > (opts.maxSparseRegions || 10)) {
      lines.push(`\n*...and ${regions.length - (opts.maxSparseRegions || 10)} more sparse regions*\n`);
    }

    return lines.join('\n');
  }

  /**
   * Format a single sparse region
   */
  private formatSingleSparseRegion(region: SparseRegion, index: number): string {
    const densityPercent = (region.density * 100).toFixed(1);
    const densityBar = this.getDensityBar(region.density);

    const lines: string[] = [
      `### ${index}. ${region.inferredTopic || `Region ${region.id}`}`,
      '',
      `**Density**: ${densityBar} ${densityPercent}%`,
      `**Notes in Area**: ${region.noteCount}`,
      '',
    ];

    if (region.nearestNotes.length > 0) {
      lines.push('**Nearest Notes**:');
      for (const note of region.nearestNotes.slice(0, 3)) {
        lines.push(`- [[${this.extractNoteName(note.notePath)}]] (distance: ${note.distance.toFixed(3)})`);
      }
      lines.push('');
    }

    if (region.boundaryNotes.length > 0) {
      lines.push('**Boundary Notes** (potential bridges):');
      for (const note of region.boundaryNotes.slice(0, 3)) {
        lines.push(`- [[${this.extractNoteName(note)}]]`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format undefined concepts section
   */
  private formatUndefinedConcepts(concepts: UndefinedConcept[], opts: ReportOptions): string {
    const displayConcepts = concepts.slice(0, opts.maxUndefinedConcepts);
    const lines: string[] = ['## Undefined Concepts\n'];

    lines.push('These concepts are referenced in your notes but don\'t have dedicated notes yet.\n');

    lines.push('| Concept | Mentions | Sources |');
    lines.push('|---------|----------|---------|');

    for (const concept of displayConcepts) {
      const sources = concept.mentionedIn.slice(0, 3).map((n) => this.extractNoteName(n)).join(', ');
      const moreIndicator = concept.mentionedIn.length > 3 ? '...' : '';
      lines.push(`| [[${concept.name}]] | ${concept.mentionCount} | ${sources}${moreIndicator} |`);
    }

    if (concepts.length > (opts.maxUndefinedConcepts || 15)) {
      lines.push(`\n*...and ${concepts.length - (opts.maxUndefinedConcepts || 15)} more undefined concepts*\n`);
    }

    // Top concepts for quick action
    lines.push('\n### Quick Actions\n');
    lines.push('Top 5 concepts to define (by mention count):\n');
    for (const concept of concepts.slice(0, 5)) {
      lines.push(`1. **[[${concept.name}]]** - mentioned ${concept.mentionCount} times`);
      if (concept.relatedConcepts.length > 0) {
        lines.push(`   - Related to: ${concept.relatedConcepts.slice(0, 3).join(', ')}`);
      }
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format the footer section
   */
  private formatFooter(): string {
    return `---

## Next Steps

1. **Review significant gaps** - Start with 🔴 marked items
2. **Create notes for top undefined concepts** - Build foundational knowledge
3. **Explore sparse regions** - Consider what topics might bridge existing notes
4. **Re-run analysis** - After creating new notes to track progress

---
*Generated by Knowledge Gap Detector*
`;
  }

  // Helper methods

  private getSeverityIcon(severity: GapSeverity): string {
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

  private formatGapType(type: string): string {
    switch (type) {
      case 'sparse_region':
        return 'Sparse Region';
      case 'undefined_concept':
        return 'Undefined Concept';
      case 'weak_connection':
        return 'Weak Connection';
      default:
        return type;
    }
  }

  private formatSeverity(severity: GapSeverity): string {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  }

  private getDensityBar(density: number): string {
    const filled = Math.round(density * 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private extractNoteName(path: string): string {
    // Extract filename without extension from path
    // Cross-platform: handle both forward and back slashes
    const parts = path.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    return filename.replace(/\.md$/, '');
  }

  /**
   * Format a quick summary for modal display
   */
  formatQuickSummary(report: GapReport): string {
    const { gaps, sparseRegions, undefinedConcepts } = report;

    const significant = gaps.filter((g) => g.severity === 'significant').length;

    return `**${gaps.length}** gaps detected (${significant} significant)
**${sparseRegions.length}** sparse regions found
**${undefinedConcepts.length}** undefined concepts`;
  }

  /**
   * Format a single gap for display in a list view
   */
  formatGapListItem(gap: KnowledgeGap): string {
    const icon = this.getSeverityIcon(gap.severity);
    const typeIcon = this.getTypeIcon(gap.type);
    return `${icon} ${typeIcon} **${gap.title}**\n   ${gap.description.slice(0, 100)}${gap.description.length > 100 ? '...' : ''}`;
  }
}
