/**
 * Gap Report Value Objects
 */

import type { GapSeverity, KnowledgeGap } from '../entities/knowledge-gap';
import type { SparseRegion } from '../entities/sparse-region';
import type { UndefinedConcept } from '../entities/undefined-concept';

export interface GapReportSummary {
  /** Total number of gaps detected */
  totalGaps: number;

  /** Breakdown by gap type */
  byType: {
    sparseRegions: number;
    undefinedConcepts: number;
    weakConnections: number;
  };

  /** Breakdown by severity */
  bySeverity: {
    significant: number;
    moderate: number;
    minor: number;
  };

  /** Top priority gaps */
  topPriorityGaps: KnowledgeGap[];

  /** Analysis timestamp */
  analyzedAt: Date;
}

/**
 * Create a summary from a full gap report
 */
export function createGapReportSummary(
  gaps: KnowledgeGap[],
  analyzedAt: Date,
  topN: number = 5
): GapReportSummary {
  const byType = {
    sparseRegions: 0,
    undefinedConcepts: 0,
    weakConnections: 0,
  };

  const bySeverity = {
    significant: 0,
    moderate: 0,
    minor: 0,
  };

  for (const gap of gaps) {
    // Count by type
    switch (gap.type) {
      case 'sparse_region':
        byType.sparseRegions++;
        break;
      case 'undefined_concept':
        byType.undefinedConcepts++;
        break;
      case 'weak_connection':
        byType.weakConnections++;
        break;
    }

    // Count by severity
    bySeverity[gap.severity]++;
  }

  // Get top priority gaps (sorted by severity, then by suggested topics count)
  const topPriorityGaps = [...gaps]
    .sort((a, b) => {
      const severityOrder: Record<GapSeverity, number> = {
        significant: 3,
        moderate: 2,
        minor: 1,
      };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.suggestedTopics.length - a.suggestedTopics.length;
    })
    .slice(0, topN);

  return {
    totalGaps: gaps.length,
    byType,
    bySeverity,
    topPriorityGaps,
    analyzedAt,
  };
}

/**
 * Convert gaps to markdown format for export
 */
export function gapReportToMarkdown(
  gaps: KnowledgeGap[],
  sparseRegions: SparseRegion[],
  undefinedConcepts: UndefinedConcept[]
): string {
  const lines: string[] = [
    '# Knowledge Gap Report',
    '',
    `**Generated**: ${new Date().toISOString()}`,
    '',
    '---',
    '',
  ];

  // Summary section
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Gaps Detected**: ${gaps.length}`);
  lines.push(`- **Sparse Regions**: ${sparseRegions.length}`);
  lines.push(`- **Undefined Concepts**: ${undefinedConcepts.length}`);
  lines.push('');

  // Sparse Regions section
  if (sparseRegions.length > 0) {
    lines.push('## Sparse Regions');
    lines.push('');
    lines.push('Areas in your knowledge base with low note density:');
    lines.push('');

    for (const region of sparseRegions) {
      lines.push(`### ${region.inferredTopic || `Region ${region.id}`}`);
      lines.push('');
      lines.push(`- **Density**: ${(region.density * 100).toFixed(1)}%`);
      lines.push(`- **Notes in Region**: ${region.noteCount}`);
      lines.push('- **Nearest Notes**:');
      for (const note of region.nearestNotes.slice(0, 3)) {
        lines.push(`  - [[${note.notePath}]]`);
      }
      lines.push('');
    }
  }

  // Undefined Concepts section
  if (undefinedConcepts.length > 0) {
    lines.push('## Undefined Concepts');
    lines.push('');
    lines.push('Concepts frequently mentioned but without dedicated notes:');
    lines.push('');

    for (const concept of undefinedConcepts.slice(0, 10)) {
      lines.push(`### [[${concept.name}]]`);
      lines.push('');
      lines.push(`- **Mentions**: ${concept.mentionCount}`);
      lines.push('- **Found in**:');
      for (const note of concept.mentionedIn.slice(0, 3)) {
        lines.push(`  - [[${note}]]`);
      }
      if (concept.relatedConcepts.length > 0) {
        lines.push(`- **Related**: ${concept.relatedConcepts.slice(0, 5).join(', ')}`);
      }
      lines.push('');
    }
  }

  // Top Priority Gaps section
  const topGaps = gaps
    .filter((g) => g.severity === 'significant')
    .slice(0, 5);

  if (topGaps.length > 0) {
    lines.push('## Top Priority Gaps');
    lines.push('');

    for (const gap of topGaps) {
      lines.push(`### ${gap.title}`);
      lines.push('');
      lines.push(gap.description);
      lines.push('');
      if (gap.suggestedTopics.length > 0) {
        lines.push('**Suggested Topics to Explore**:');
        for (const topic of gap.suggestedTopics) {
          lines.push(`- ${topic}`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
