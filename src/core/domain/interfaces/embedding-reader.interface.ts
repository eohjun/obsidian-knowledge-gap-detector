/**
 * Embedding Reader Interface
 * Port for reading embedding data from Vault Embeddings plugin
 */

export interface EmbeddingIndex {
  /** Version of the index format */
  version: string;

  /** Total number of embedded notes */
  totalNotes: number;

  /** Last update timestamp */
  lastUpdated: string;

  /** Embedding model used */
  model: string;

  /** Vector dimensions */
  dimensions: number;

  /** Note metadata indexed by noteId */
  notes: Record<string, NoteIndexEntry>;
}

export interface NoteIndexEntry {
  /** Full path to the note */
  path: string;

  /** Content hash for staleness check */
  contentHash: string;

  /** Last update timestamp */
  updatedAt: string;
}

export interface NoteEmbedding {
  /** Unique note identifier (hash-based) */
  noteId: string;

  /** Full path to the note */
  notePath: string;

  /** Note title */
  title: string;

  /** Content hash */
  contentHash: string;

  /** Embedding vector */
  vector: number[];

  /** Model used for embedding */
  model: string;

  /** Embedding provider */
  provider: string;

  /** Vector dimensions */
  dimensions: number;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Interface for reading embeddings from Vault Embeddings plugin
 */
export interface IEmbeddingReader {
  /**
   * Read the embedding index
   */
  readIndex(): Promise<EmbeddingIndex | null>;

  /**
   * Read a single note's embedding by noteId
   */
  readEmbedding(noteId: string): Promise<NoteEmbedding | null>;

  /**
   * Read all embeddings from the vault
   */
  readAllEmbeddings(): Promise<Map<string, NoteEmbedding>>;

  /**
   * Check if Vault Embeddings plugin data is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the number of embedded notes
   */
  getEmbeddingCount(): Promise<number>;
}
