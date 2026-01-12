/**
 * Obsidian Link Graph Reader Adapter
 * Parses vault for [[wiki links]] and builds a link graph
 */

import { Vault, TFile, normalizePath } from 'obsidian';
import type {
  ILinkGraphReader,
  LinkGraph,
  NoteLinks,
  UndefinedLink,
} from '../../core/domain/interfaces/link-graph-reader.interface';

// Regex to match [[wiki links]] including aliases [[link|alias]]
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

// File extensions to exclude from link analysis (images, attachments, etc.)
const EXCLUDED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico',  // Images
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',        // Documents
  '.mp3', '.wav', '.ogg', '.m4a', '.flac',                          // Audio
  '.mp4', '.mov', '.avi', '.mkv', '.webm',                          // Video
  '.zip', '.rar', '.7z', '.tar', '.gz',                             // Archives
  '.css', '.js', '.json', '.xml', '.html', '.htm',                  // Web files
]);

export class ObsidianLinkGraphReader implements ILinkGraphReader {
  private linkGraph: LinkGraph | null = null;
  private excludeFolders: string[] = [];

  constructor(private vault: Vault) {}

  setExcludeFolders(folders: string[]): void {
    // Normalize all folders for cross-platform compatibility
    this.excludeFolders = folders.map((f) => normalizePath(f));
    // Clear cache when filters change
    this.linkGraph = null;
  }

  async buildGraph(): Promise<LinkGraph> {
    // Return cached graph if available
    if (this.linkGraph) {
      return this.linkGraph;
    }

    const notes = new Map<string, NoteLinks>();
    const incomingLinks = new Map<string, Set<string>>();
    const undefinedLinks = new Map<string, UndefinedLink>();

    // Get all markdown files
    const markdownFiles = this.vault.getMarkdownFiles();

    // Build a set of existing note paths (without .md extension for matching)
    const existingNotes = new Set<string>();
    for (const file of markdownFiles) {
      const pathWithoutExt = file.path.replace(/\.md$/, '');
      existingNotes.add(pathWithoutExt);
      // Also add just the filename for matching
      existingNotes.add(file.basename);
    }

    // Process each markdown file
    for (const file of markdownFiles) {
      // Skip excluded folders
      if (this.shouldExclude(file.path)) {
        continue;
      }

      const content = await this.vault.cachedRead(file);
      const links = this.extractLinks(content);
      const tags = this.extractTags(content);

      // Store note links
      notes.set(file.path, {
        path: file.path,
        outgoingLinks: links,
        tags,
      });

      // Process each link
      for (const link of links) {
        // Check if link target exists
        const normalizedLink = this.normalizeLinkTarget(link);
        const linkExists =
          existingNotes.has(normalizedLink) ||
          existingNotes.has(link);

        if (linkExists) {
          // Add to incoming links
          const targetPath = this.findNotePath(normalizedLink, markdownFiles) || normalizedLink;
          const incoming = incomingLinks.get(targetPath) || new Set();
          incoming.add(file.path);
          incomingLinks.set(targetPath, incoming);
        } else {
          // Add to undefined links
          const existing = undefinedLinks.get(link);
          if (existing) {
            existing.count++;
            if (!existing.sources.includes(file.path)) {
              existing.sources.push(file.path);
            }
          } else {
            undefinedLinks.set(link, {
              linkText: link,
              sources: [file.path],
              count: 1,
            });
          }
        }
      }
    }

    this.linkGraph = {
      notes,
      incomingLinks,
      undefinedLinks,
    };

    return this.linkGraph;
  }

  async getUndefinedLinks(): Promise<UndefinedLink[]> {
    const graph = await this.buildGraph();
    return Array.from(graph.undefinedLinks.values());
  }

  getLinkFrequency(linkName: string): number {
    if (!this.linkGraph) {
      return 0;
    }

    const undefinedLink = this.linkGraph.undefinedLinks.get(linkName);
    if (undefinedLink) {
      return undefinedLink.count;
    }

    // Check incoming links for existing notes
    const incoming = this.linkGraph.incomingLinks.get(linkName);
    return incoming ? incoming.size : 0;
  }

  getNotesMentioning(linkName: string): string[] {
    if (!this.linkGraph) {
      return [];
    }

    const undefinedLink = this.linkGraph.undefinedLinks.get(linkName);
    if (undefinedLink) {
      return undefinedLink.sources;
    }

    const incoming = this.linkGraph.incomingLinks.get(linkName);
    return incoming ? Array.from(incoming) : [];
  }

  getCoOccurringConcepts(linkName: string, minCoOccurrence: number = 2): string[] {
    if (!this.linkGraph) {
      return [];
    }

    // Get notes that mention this link
    const mentioningNotes = this.getNotesMentioning(linkName);
    if (mentioningNotes.length === 0) {
      return [];
    }

    // Count co-occurring concepts
    const coOccurrences = new Map<string, number>();

    for (const notePath of mentioningNotes) {
      const noteLinks = this.linkGraph.notes.get(notePath);
      if (noteLinks) {
        for (const otherLink of noteLinks.outgoingLinks) {
          if (otherLink !== linkName) {
            coOccurrences.set(otherLink, (coOccurrences.get(otherLink) || 0) + 1);
          }
        }
      }
    }

    // Filter by minimum co-occurrence and sort by count
    return Array.from(coOccurrences.entries())
      .filter(([_, count]) => count >= minCoOccurrence)
      .sort((a, b) => b[1] - a[1])
      .map(([link]) => link);
  }

  /**
   * Clear the cached graph
   */
  clearCache(): void {
    this.linkGraph = null;
  }

  private shouldExclude(path: string): boolean {
    return this.excludeFolders.some((folder) =>
      path.startsWith(normalizePath(folder))
    );
  }

  private extractLinks(content: string): string[] {
    const links: string[] = [];
    let match;

    // Reset regex state
    WIKI_LINK_REGEX.lastIndex = 0;

    while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
      const link = match[1].trim();
      if (link && !links.includes(link)) {
        // Skip links to excluded file types (images, attachments, etc.)
        if (this.isExcludedFileType(link)) {
          continue;
        }
        // Skip links that point to excluded folders
        if (this.shouldExclude(link)) {
          continue;
        }
        links.push(link);
      }
    }

    return links;
  }

  private isExcludedFileType(link: string): boolean {
    const lowerLink = link.toLowerCase();
    for (const ext of EXCLUDED_EXTENSIONS) {
      if (lowerLink.endsWith(ext)) {
        return true;
      }
    }
    return false;
  }

  private extractTags(content: string): string[] {
    const tags: string[] = [];
    // Match #tag but not inside code blocks or links
    const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-/]+)/g;
    let match;

    while ((match = tagRegex.exec(content)) !== null) {
      const tag = match[1];
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  private normalizeLinkTarget(link: string): string {
    // Remove any path separators and normalize
    return link.split('/').pop() || link;
  }

  private findNotePath(linkTarget: string, files: TFile[]): string | undefined {
    // First try exact match
    for (const file of files) {
      if (file.basename === linkTarget || file.path === linkTarget + '.md') {
        return file.path;
      }
    }
    return undefined;
  }
}
