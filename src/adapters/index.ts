/**
 * Adapters Layer Exports
 *
 * This layer contains concrete implementations of domain interfaces.
 * It bridges the gap between the domain/application layers and external systems.
 */

// Embedding Reader
export { VaultEmbeddingsReader } from './embeddings/vault-embeddings-reader';

// Link Graph Reader
export { ObsidianLinkGraphReader } from './graph/obsidian-link-graph-reader';

// Clustering Services
export { KMeansClusteringService } from './clustering/kmeans-clustering-service';

// LLM Services
export { MultiProviderLLMService } from './llm/multi-provider-llm-service';
export type { MultiProviderLLMConfig } from './llm/multi-provider-llm-service';

// Presenters
export { MarkdownReportPresenter } from './presenters/markdown-report-presenter';
export type { ReportOptions } from './presenters/markdown-report-presenter';
