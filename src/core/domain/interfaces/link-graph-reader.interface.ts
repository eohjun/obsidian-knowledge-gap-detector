/**
 * Link Graph Reader Interface
 * Port for analyzing link relationships between notes
 */

export interface NoteLinks {
  /** Path to the note */
  path: string;

  /** Outgoing links from this note */
  outgoingLinks: string[];

  /** Tags in this note */
  tags: string[];
}

export interface UndefinedLink {
  /** The link text (what appears inside [[...]]) */
  linkText: string;

  /** Notes that contain this undefined link */
  sources: string[];

  /** Number of times this link appears */
  count: number;
}

export interface LinkGraph {
  /** All notes with their link information */
  notes: Map<string, NoteLinks>;

  /** Incoming links for each note (reverse index) */
  incomingLinks: Map<string, Set<string>>;

  /** Links that point to non-existent notes */
  undefinedLinks: Map<string, UndefinedLink>;
}

/**
 * Interface for reading and analyzing link graphs from the vault
 */
export interface ILinkGraphReader {
  /**
   * Build the complete link graph for the vault
   */
  buildGraph(): Promise<LinkGraph>;

  /**
   * Get all undefined (broken) links
   */
  getUndefinedLinks(): Promise<UndefinedLink[]>;

  /**
   * Get the frequency of a specific link across the vault
   */
  getLinkFrequency(linkName: string): number;

  /**
   * Get notes that mention a specific link
   */
  getNotesMentioning(linkName: string): string[];

  /**
   * Get co-occurring concepts (links that appear together frequently)
   */
  getCoOccurringConcepts(linkName: string, minCoOccurrence?: number): string[];
}
