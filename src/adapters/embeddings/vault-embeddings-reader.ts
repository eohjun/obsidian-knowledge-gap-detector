/**
 * Vault Embeddings Reader Adapter
 * Reads embedding data from Vault Embeddings plugin (09_Embedded/)
 */

import { Vault, normalizePath } from 'obsidian';
import type {
  IEmbeddingReader,
  EmbeddingIndex,
  NoteEmbedding,
} from '../../core/domain/interfaces/embedding-reader.interface';

const EMBEDDING_FOLDER = '09_Embedded';
const INDEX_FILE = 'index.json';
const EMBEDDINGS_SUBFOLDER = 'embeddings';

export class VaultEmbeddingsReader implements IEmbeddingReader {
  private cachedIndex: EmbeddingIndex | null = null;
  private embeddingsCache: Map<string, NoteEmbedding> = new Map();

  constructor(private vault: Vault) {}

  async isAvailable(): Promise<boolean> {
    const indexPath = normalizePath(`${EMBEDDING_FOLDER}/${INDEX_FILE}`);
    const file = this.vault.getAbstractFileByPath(indexPath);
    return file !== null;
  }

  async readIndex(): Promise<EmbeddingIndex | null> {
    // Return cached index if available
    if (this.cachedIndex) {
      return this.cachedIndex;
    }

    const indexPath = normalizePath(`${EMBEDDING_FOLDER}/${INDEX_FILE}`);

    try {
      // Try getAbstractFileByPath first
      let file = this.vault.getAbstractFileByPath(indexPath);

      // Fallback for cross-platform compatibility (iOS/Android)
      if (!file) {
        const exists = await this.vault.adapter.exists(indexPath);
        if (!exists) {
          return null;
        }
      }

      const content = await this.vault.adapter.read(indexPath);
      this.cachedIndex = JSON.parse(content) as EmbeddingIndex;
      return this.cachedIndex;
    } catch (error) {
      console.error('Failed to read embedding index:', error);
      return null;
    }
  }

  async readEmbedding(noteId: string): Promise<NoteEmbedding | null> {
    // Check cache first
    const cached = this.embeddingsCache.get(noteId);
    if (cached) {
      return cached;
    }

    const embeddingPath = normalizePath(
      `${EMBEDDING_FOLDER}/${EMBEDDINGS_SUBFOLDER}/${noteId}.json`
    );

    try {
      const exists = await this.vault.adapter.exists(embeddingPath);
      if (!exists) {
        return null;
      }

      const content = await this.vault.adapter.read(embeddingPath);
      const embedding = JSON.parse(content) as NoteEmbedding;

      // Cache the embedding
      this.embeddingsCache.set(noteId, embedding);

      return embedding;
    } catch (error) {
      console.error(`Failed to read embedding for ${noteId}:`, error);
      return null;
    }
  }

  async readAllEmbeddings(): Promise<Map<string, NoteEmbedding>> {
    // If cache is already populated, return it
    if (this.embeddingsCache.size > 0) {
      return this.embeddingsCache;
    }

    const index = await this.readIndex();
    if (!index) {
      return new Map();
    }

    const embeddings = new Map<string, NoteEmbedding>();
    const noteIds = Object.keys(index.notes);

    // Read embeddings in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < noteIds.length; i += batchSize) {
      const batch = noteIds.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((noteId) => this.readEmbedding(noteId))
      );

      for (let j = 0; j < batch.length; j++) {
        const embedding = results[j];
        if (embedding) {
          embeddings.set(batch[j], embedding);
        }
      }
    }

    // Update cache
    this.embeddingsCache = embeddings;

    return embeddings;
  }

  async getEmbeddingCount(): Promise<number> {
    const index = await this.readIndex();
    if (!index) {
      return 0;
    }
    return index.totalNotes;
  }

  /**
   * Clear the cache (useful when embeddings are updated)
   */
  clearCache(): void {
    this.cachedIndex = null;
    this.embeddingsCache.clear();
  }

  /**
   * Get embedding for a specific note path
   */
  async getEmbeddingByPath(notePath: string): Promise<NoteEmbedding | null> {
    const index = await this.readIndex();
    if (!index) {
      return null;
    }

    // Find noteId by path
    for (const [noteId, entry] of Object.entries(index.notes)) {
      if (entry.path === notePath) {
        return this.readEmbedding(noteId);
      }
    }

    return null;
  }
}
