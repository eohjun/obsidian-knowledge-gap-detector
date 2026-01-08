/**
 * Note ID Utilities
 * Hash-based note ID generation for Vault Embeddings compatibility
 *
 * IMPORTANT: This must match the hash function used by Vault Embeddings
 */

/**
 * Simple hash function matching Vault Embeddings implementation
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate a note ID from its path
 * This MUST match the Vault Embeddings plugin's noteId generation
 *
 * @param path - Full path to the note (e.g., "04_Zettelkasten/My Note.md")
 * @returns Hash-based note ID
 *
 * @example
 * // CORRECT usage
 * const noteId = generateNoteId(file.path);
 *
 * // WRONG - don't use basename
 * // const noteId = file.basename;  // This won't match Vault Embeddings!
 */
export function generateNoteId(path: string): string {
  // Remove .md extension before hashing
  const pathWithoutExt = path.replace(/\.md$/, '');
  return simpleHash(pathWithoutExt);
}

/**
 * Validate that a string looks like a valid note ID
 */
export function isValidNoteId(id: string): boolean {
  // Note IDs are 8-character hex strings
  return /^[0-9a-f]{8}$/i.test(id);
}

/**
 * Extract note title from path
 */
export function extractNoteTitle(path: string): string {
  // Remove folder path and extension
  const filename = path.split('/').pop() || path;
  return filename.replace(/\.md$/, '');
}
