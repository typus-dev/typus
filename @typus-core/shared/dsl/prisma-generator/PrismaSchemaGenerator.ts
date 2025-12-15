/**
 * PrismaSchemaGenerator
 * 
 * Main class that orchestrates the generation of Prisma schemas from DSL models
 * Coordinates FieldMapper, RelationGenerator, and SchemaFormatter
 * 
 * @file PrismaSchemaGenerator.ts
 * @version 1.0.0
 * @created August 8, 2025
 * @author System
 */

import { DslModel } from '../types.js';
import { FieldMapper, PrismaFieldOptions } from './FieldMapper.js';
import { RelationGenerator } from './RelationGenerator.js';
import { SchemaFormatter, SchemaFormatOptions } from './SchemaFormatter.js';

export interface GenerationOptions {
  includeAuditFields?: boolean;
  includeIndexes?: boolean;
  formatOptions?: SchemaFormatOptions;
  outputFormat?: 'pretty' | 'compact';
}

export interface GeneratedSchema {
  moduleName: string;
  fileName: string;
  content: string;
  modelCount: number;
  warnings: string[];
}

export class PrismaSchemaGenerator {
  private fieldMapper: FieldMapper;
  private relationGenerator: RelationGenerator;
  private schemaFormatter: SchemaFormatter;
  private dbProvider: string;

  constructor(dbProvider: string = 'mysql') {
    this.dbProvider = dbProvider;
    this.fieldMapper = new FieldMapper(dbProvider);
    this.relationGenerator = new RelationGenerator();
    this.schemaFormatter = new SchemaFormatter();
  }

  /**
   * Generate Prisma schemas for all modules
   */
  public generateSchemas(
    models: DslModel[], 
    options: GenerationOptions = {}
  ): GeneratedSchema[] {
    const {
      includeAuditFields = true,
      includeIndexes = true,
      formatOptions = {},
      outputFormat = 'pretty'
    } = options;

    console.log(`🔧 Generating Prisma schemas for ${models.length} DSL models...`);

    // Group models by module
    const moduleGroups = this.groupModelsByModule(models);
    const generatedSchemas: GeneratedSchema[] = [];

    for (const [moduleName, moduleModels] of moduleGroups.entries()) {
      console.log(`📦 Processing module: ${moduleName} (${moduleModels.length} models)`);

      try {
        const schema = this.generateModuleSchema(
          moduleName,
          moduleModels,
          models, // Pass all models for relation resolution
          {
            includeAuditFields,
            includeIndexes,
            formatOptions,
            outputFormat
          }
        );

        generatedSchemas.push(schema);
        console.log(`✅ Generated schema for ${moduleName}: ${schema.fileName}`);
      } catch (error) {
        console.error(`❌ Failed to generate schema for module ${moduleName}:`, error);
        // Continue with other modules
      }
    }

    console.log(`🎯 Generated ${generatedSchemas.length} Prisma schema files`);
    return generatedSchemas;
  }

  /**
   * Generate schema for a single module
   */
  public generateModuleSchema(
    moduleName: string,
    moduleModels: DslModel[],
    allModels: DslModel[],
    options: GenerationOptions = {}
  ): GeneratedSchema {
    const warnings: string[] = [];
    const modelContents: string[] = [];

    for (const model of moduleModels) {
      try {
        const modelContent = this.generateSingleModel(model, allModels, options);
        modelContents.push(modelContent);
      } catch (error) {
        warnings.push(`Failed to generate model ${model.name}: ${error}`);
        console.warn(`⚠️ Warning: Failed to generate model ${model.name}:`, error);
      }
    }

    // Generate junction models if needed
    const junctionModels = this.relationGenerator.getRequiredJunctionModels(moduleModels);
    modelContents.push(...junctionModels);

    // Format the complete schema
    const formattedSchema = this.schemaFormatter.formatModuleSchema(
      moduleName,
      moduleModels,
      modelContents,
      options.formatOptions
    );

    // Apply output formatting
    const finalContent = options.outputFormat === 'pretty' 
      ? this.schemaFormatter.prettyPrint(formattedSchema)
      : formattedSchema;

    return {
      moduleName,
      fileName: `${moduleName}.prisma`,
      content: finalContent,
      modelCount: moduleModels.length,
      warnings
    };
  }

  /**
   * Generate a single model
   */
  private generateSingleModel(
    model: DslModel, 
    allModels: DslModel[], 
    options: GenerationOptions
  ): string {
    const { includeAuditFields = true, includeIndexes = true } = options;

    // Generate fields
    const fields = this.generateModelFields(model, includeAuditFields);
    
    // Generate foreign key fields for relations
    const foreignKeyFields = this.relationGenerator.getForeignKeyFields(model, allModels);
    fields.push(...foreignKeyFields);

    // Generate relations
    const relations = this.relationGenerator.generateModelRelations(model, allModels);

    // Generate indexes
    const indexes = includeIndexes ? this.schemaFormatter.addIndexes(model) : [];

    // Combine fields and indexes (but keep relations separate for formatModel)
    const fieldsWithIndexes = [...fields, ...indexes];

    // Format the model with module prefix
    const modelName = this.getModelNameWithModule(model);
    const tableName = this.getTableName(model);
    const compositePrimaryKey = model.primaryKey && Array.isArray(model.primaryKey) ? model.primaryKey : undefined;
    return this.schemaFormatter.formatModel(modelName, fieldsWithIndexes, relations, tableName, compositePrimaryKey);
  }

  /**
   * Generate fields for a model
   */
  private generateModelFields(model: DslModel, includeAuditFields: boolean): string[] {
    const fields: string[] = [];

    // Generate DSL-defined fields
    if (model.fields) {
      for (const field of model.fields) {
        // Skip audit fields if they'll be added separately
        if (includeAuditFields && this.fieldMapper.isAuditField(field.name)) {
          continue;
        }

        const options: PrismaFieldOptions = {
          isPrimaryKey: field.primaryKey,
          isUnique: field.unique,
          isAutoIncrement: field.autoincrement,
          isRequired: field.required
        };

        const prismaField = this.fieldMapper.generatePrismaField(field, options);
        fields.push(prismaField);
      }
    }

    // Add audit fields if requested
    if (includeAuditFields) {
      const auditFields = this.fieldMapper.generateAuditFields();
      fields.push(...auditFields);
    }

    return fields;
  }

  /**
   * Group models by module
   */
  private groupModelsByModule(models: DslModel[]): Map<string, DslModel[]> {
    const moduleGroups = new Map<string, DslModel[]>();

    for (const model of models) {
      const moduleName = model.module || 'core';
      
      if (!moduleGroups.has(moduleName)) {
        moduleGroups.set(moduleName, []);
      }
      
      moduleGroups.get(moduleName)!.push(model);
    }

    return moduleGroups;
  }

  /**
   * Get model name with module prefix
   */
  private getModelNameWithModule(model: DslModel): string {
    // Return original model name without module prefix
    return model.name;
  }

  /**
   * Get table name for model
   */
  private getTableName(model: DslModel): string {
    const moduleName = model.module || 'core';
    
    // Use existing tableName if defined, otherwise derive from model name
    const baseTableName = model.tableName || this.toSnakeCase(model.name);
    
    // Always apply module prefix for non-core modules
    return moduleName === 'core' ? baseTableName : `${moduleName}.${baseTableName}`;
  }

  /**
   * Validate models before generation
   */
  public validateModels(models: DslModel[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const model of models) {
      // Check required properties
      if (!model.name) {
        errors.push(`Model missing name`);
        continue;
      }

      if (!model.fields || model.fields.length === 0) {
        errors.push(`Model ${model.name} has no fields`);
        continue;
      }

      // Check for primary key (single field or composite)
      const hasPrimaryKeyField = model.fields.some(field => field.primaryKey);
      const hasIdField = model.fields.some(field => field.name === 'id');
      const hasCompositePrimaryKey = model.primaryKey && Array.isArray(model.primaryKey) && model.primaryKey.length > 0;

      if (!hasPrimaryKeyField && !hasIdField && !hasCompositePrimaryKey) {
        errors.push(`Model ${model.name} has no primary key field`);
      }

      // Validate field types
      for (const field of model.fields) {
        if (!field.name || !field.type) {
          errors.push(`Model ${model.name} has field with missing name or type`);
        }
      }

      // Validate relations
      if (model.relations) {
        for (const relation of model.relations) {
          if (!relation.name || !relation.type || !relation.target) {
            errors.push(`Model ${model.name} has invalid relation: ${relation.name}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get generation statistics
   */
  public getGenerationStats(schemas: GeneratedSchema[]): {
    totalSchemas: number;
    totalModels: number;
    totalWarnings: number;
    modules: string[];
  } {
    return {
      totalSchemas: schemas.length,
      totalModels: schemas.reduce((sum, schema) => sum + schema.modelCount, 0),
      totalWarnings: schemas.reduce((sum, schema) => sum + schema.warnings.length, 0),
      modules: schemas.map(schema => schema.moduleName)
    };
  }

  /**
   * Convert string to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/[A-Z]/g, (letter, index) => 
        index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`
      );
  }
}
