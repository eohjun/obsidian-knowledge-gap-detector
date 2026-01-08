/**
 * Gap Report Service
 * Utility service for generating and formatting gap reports
 */

import type { GapReport } from '../../domain/interfaces/gap-analyzer.interface';
import type { KnowledgeGap } from '../../domain/entities/knowledge-gap';
import type { SparseRegion } from '../../domain/entities/sparse-region';
import type { UndefinedConcept } from '../../domain/entities/undefined-concept';
import {
  GapReportSummary,
  createGapReportSummary,
  gapReportToMarkdown,
} from '../../domain/value-objects/gap-report';

export class GapReportService {
  /**
   * Generate a summary of the gap report
   */
  generateSummary(report: GapReport): GapReportSummary {
    return createGapReportSummary(report.gaps, report.analyzedAt);
  }

  /**
   * Export the report as Markdown
   */
  exportAsMarkdown(report: GapReport): string {
    return gapReportToMarkdown(
      report.gaps,
      report.sparseRegions,
      report.undefinedConcepts
    );
  }

  /**
   * Get top N gaps by priority
   */
  getTopGaps(report: GapReport, n: number = 10): KnowledgeGap[] {
    return report.gaps.slice(0, n);
  }

  /**
   * Filter gaps by type
   */
  filterByType(
    report: GapReport,
    type: 'sparse_region' | 'undefined_concept' | 'weak_connection'
  ): KnowledgeGap[] {
    return report.gaps.filter((gap) => gap.type === type);
  }

  /**
   * Filter gaps by severity
   */
  filterBySeverity(
    report: GapReport,
    severity: 'minor' | 'moderate' | 'significant'
  ): KnowledgeGap[] {
    return report.gaps.filter((gap) => gap.severity === severity);
  }

  /**
   * Get gaps related to a specific note
   */
  getGapsForNote(report: GapReport, notePath: string): KnowledgeGap[] {
    return report.gaps.filter((gap) =>
      gap.relatedNotes.some((note) => note === notePath)
    );
  }

  /**
   * Search gaps by title or description
   */
  searchGaps(report: GapReport, query: string): KnowledgeGap[] {
    const lowerQuery = query.toLowerCase();
    return report.gaps.filter(
      (gap) =>
        gap.title.toLowerCase().includes(lowerQuery) ||
        gap.description.toLowerCase().includes(lowerQuery) ||
        gap.suggestedTopics.some((topic) =>
          topic.toLowerCase().includes(lowerQuery)
        )
    );
  }

  /**
   * Get statistics about sparse regions
   */
  getSparseRegionStats(sparseRegions: SparseRegion[]): {
    avgDensity: number;
    minDensity: number;
    maxDensity: number;
    totalNotes: number;
  } {
    if (sparseRegions.length === 0) {
      return { avgDensity: 0, minDensity: 0, maxDensity: 0, totalNotes: 0 };
    }

    const densities = sparseRegions.map((r) => r.density);
    const totalNotes = sparseRegions.reduce((sum, r) => sum + r.noteCount, 0);

    return {
      avgDensity: densities.reduce((a, b) => a + b, 0) / densities.length,
      minDensity: Math.min(...densities),
      maxDensity: Math.max(...densities),
      totalNotes,
    };
  }

  /**
   * Get statistics about undefined concepts
   */
  getUndefinedConceptStats(concepts: UndefinedConcept[]): {
    totalConcepts: number;
    totalMentions: number;
    avgMentions: number;
    maxMentions: number;
  } {
    if (concepts.length === 0) {
      return { totalConcepts: 0, totalMentions: 0, avgMentions: 0, maxMentions: 0 };
    }

    const mentions = concepts.map((c) => c.mentionCount);
    const totalMentions = mentions.reduce((a, b) => a + b, 0);

    return {
      totalConcepts: concepts.length,
      totalMentions,
      avgMentions: totalMentions / concepts.length,
      maxMentions: Math.max(...mentions),
    };
  }

  /**
   * Compare two reports to show changes
   */
  compareReports(
    oldReport: GapReport,
    newReport: GapReport
  ): {
    newGaps: KnowledgeGap[];
    resolvedGaps: KnowledgeGap[];
    changedSeverity: Array<{
      gap: KnowledgeGap;
      oldSeverity: string;
      newSeverity: string;
    }>;
  } {
    const oldGapIds = new Set(oldReport.gaps.map((g) => g.id));
    const newGapIds = new Set(newReport.gaps.map((g) => g.id));

    const newGaps = newReport.gaps.filter((g) => !oldGapIds.has(g.id));
    const resolvedGaps = oldReport.gaps.filter((g) => !newGapIds.has(g.id));

    const changedSeverity: Array<{
      gap: KnowledgeGap;
      oldSeverity: string;
      newSeverity: string;
    }> = [];

    for (const newGap of newReport.gaps) {
      const oldGap = oldReport.gaps.find((g) => g.id === newGap.id);
      if (oldGap && oldGap.severity !== newGap.severity) {
        changedSeverity.push({
          gap: newGap,
          oldSeverity: oldGap.severity,
          newSeverity: newGap.severity,
        });
      }
    }

    return { newGaps, resolvedGaps, changedSeverity };
  }
}
