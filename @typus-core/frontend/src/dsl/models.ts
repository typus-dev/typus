
// Assuming BlogPostModel and BlogCategoryModel are exported from @root-shared/dsl (which should be from shared/dsl/index.ts -> shared/dsl/models.ts -> shared/dsl/models/index.ts -> specific models)
// ModelDSL was renamed to DslModel in shared types
// Reverted to no .js extension, relying on package.json "exports"
// Import other models as needed

// Type for all models
export interface ModelRegistry {

  // Add other models as needed
}

// Export models for use in types
export const Models: ModelRegistry = {

  // Add other models as needed
};

// Type for model names
export type ModelName = keyof ModelRegistry;

// Helper type to get field names from a model
export type ModelFields<T extends ModelName> = Extract<keyof ModelRegistry[T]['fields'][number], string>;
