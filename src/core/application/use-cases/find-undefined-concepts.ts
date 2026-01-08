/**
 * Find Undefined Concepts Use Case
 * Identifies frequently mentioned but non-existent notes
 */

import type {
  ILinkGraphReader,
  UndefinedLink,
} from '../../domain/interfaces/link-graph-reader.interface';
import type { UndefinedConcept } from '../../domain/entities/undefined-concept';
import { createUndefinedConcept } from '../../domain/entities/undefined-concept';

export interface FindUndefinedConceptsOptions {
  /** Minimum number of mentions to be considered (default: 2) */
  minMentions?: number;

  /** Maximum concepts to return (default: 50) */
  maxConcepts?: number;

  /** Whether to analyze co-occurring concepts (default: true) */
  analyzeCoOccurrence?: boolean;

  /** Folders to exclude from analysis */
  excludeFolders?: string[];
}

export class FindUndefinedConceptsUseCase {
  constructor(private linkGraphReader: ILinkGraphReader) {}

  async execute(options: FindUndefinedConceptsOptions = {}): Promise<UndefinedConcept[]> {
    const {
      minMentions = 2,
      maxConcepts = 50,
      analyzeCoOccurrence = true,
      excludeFolders = [],
    } = options;

    // 1. Get all undefined links from the vault
    const undefinedLinks = await this.linkGraphReader.getUndefinedLinks();

    // 2. Filter by minimum mentions and excluded folders
    const filteredLinks = this.filterLinks(undefinedLinks, minMentions, excludeFolders);

    // 3. Convert to UndefinedConcept entities
    const concepts: UndefinedConcept[] = [];

    for (const link of filteredLinks) {
      // Get co-occurring concepts if enabled
      let relatedConcepts: string[] = [];
      if (analyzeCoOccurrence) {
        relatedConcepts = this.linkGraphReader.getCoOccurringConcepts(link.linkText, 2);
      }

      const concept = createUndefinedConcept({
        name: link.linkText,
        mentionCount: link.count,
        mentionedIn: link.sources,
        relatedConcepts,
      });

      concepts.push(concept);
    }

    // 4. Sort by mention count (most mentioned first) and limit
    return concepts
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, maxConcepts);
  }

  private filterLinks(
    links: UndefinedLink[],
    minMentions: number,
    excludeFolders: string[]
  ): UndefinedLink[] {
    return links.filter((link) => {
      // Check minimum mentions
      if (link.count < minMentions) {
        return false;
      }

      // Check excluded folders - all sources must not be in excluded folders
      if (excludeFolders.length > 0) {
        const nonExcludedSources = link.sources.filter((source) =>
          !excludeFolders.some((folder) => source.startsWith(folder))
        );
        if (nonExcludedSources.length < minMentions) {
          return false;
        }
      }

      // Skip system/template links (common patterns)
      if (this.isSystemLink(link.linkText)) {
        return false;
      }

      return true;
    });
  }

  private isSystemLink(linkText: string): boolean {
    // Skip common system/template patterns
    const systemPatterns = [
      /^Template/i,
      /^_/,
      /^\d{4}-\d{2}-\d{2}$/,  // Date links
      /^MOC$/i,
      /^Index$/i,
      /^README$/i,
      /^TODO$/i,
      /^CHANGELOG$/i,
    ];

    return systemPatterns.some((pattern) => pattern.test(linkText));
  }
}
