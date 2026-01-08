/**
 * Application Layer Exports
 *
 * This layer contains use cases and application services.
 * It depends only on the Domain layer.
 */

// Use Cases
export { AnalyzeGapsUseCase } from './use-cases/analyze-gaps';
export { DetectSparseRegionsUseCase } from './use-cases/detect-sparse-regions';
export type { SparseDetectionOptions } from './use-cases/detect-sparse-regions';
export { FindUndefinedConceptsUseCase } from './use-cases/find-undefined-concepts';
export type { FindUndefinedConceptsOptions } from './use-cases/find-undefined-concepts';
export { SuggestExplorationUseCase } from './use-cases/suggest-exploration';

// Services
export { GapReportService } from './services/gap-report-service';
