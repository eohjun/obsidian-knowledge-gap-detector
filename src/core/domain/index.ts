/**
 * Domain Layer Exports
 *
 * This is the innermost layer of Clean Architecture.
 * Contains pure business logic with no external dependencies.
 */

// Entities
export * from './entities/knowledge-gap';
export * from './entities/sparse-region';
export * from './entities/undefined-concept';

// Interfaces (Ports)
export * from './interfaces/embedding-reader.interface';
export * from './interfaces/link-graph-reader.interface';
export * from './interfaces/clustering-service.interface';
export * from './interfaces/llm-service.interface';
export * from './interfaces/gap-analyzer.interface';

// Value Objects
export * from './value-objects/gap-report';
export * from './value-objects/cluster-info';

// Utils
export * from './utils/note-id';
export * from './utils/vector-math';
