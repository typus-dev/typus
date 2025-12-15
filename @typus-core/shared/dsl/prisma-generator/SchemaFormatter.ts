/**
 * SchemaFormatter
 * 
 * Formats and validates generated Prisma schemas
 * Handles prettification, comments, and validation
 * 
 * @file SchemaFormatter.ts
 * @version 1.0.0
 * @created August 8, 2025
 * @author System
 */

import { DslModel } from '../types.js';

export interface SchemaFormatOptions {
  addComments?: boolean;
  addMetadata?: boolean;
  validateSchema?: boolean;
  indentSize?: number;
}

export class SchemaFormatter {
  private indentSize: number;

  constructor(indentSize: number = 1) {
    this.indentSize = indentSize;
  }

  /**
   * Format complete Prisma schema for a module
   */
  public formatModuleSchema(
    moduleName: string, 
    models: DslModel[], 
    modelContents: string[], 
    options: SchemaFormatOptions = {}
  ): string {
    const {
      addComments = true,
      addMetadata = true,
      validateSchema = true
    } = options;

    let schema = '';

    // Add header comment
    if (addComments) {
      schema += this.generateSchemaHeader(moduleName, models);
      schema += '\n';
    }

    // Add metadata comment
    if (addMetadata) {
      schema += this.generateMetadataComment(models);
      schema += '\n';
    }

    // Add model contents
    schema += modelContents.join('\n\n');

    // Validate if requested
    if (validateSchema) {
      const validationResult = this.validateSchema(schema);
      if (!validationResult.isValid) {
        console.warn(`Schema validation warnings for ${moduleName}:`, validationResult.warnings);
      }
    }

    return schema;
  }

  /**
   * Generate schema header comment
   */
  private generateSchemaHeader(moduleName: string, models: DslModel[]): string {
    const modelNames = models.map(m => m.name).join(', ');
    const timestamp = new Date().toISOString();

    return `// =============================================================================
// GENERATED PRISMA SCHEMA FOR MODULE: ${moduleName.toUpperCase()}
// =============================================================================
// This file is auto-generated from DSL models with generatePrisma: true
// Generated at: ${timestamp}
// Models: ${modelNames}
// =============================================================================`;
  }

  /**
   * Generate metadata comment
   */
  private generateMetadataComment(models: DslModel[]): string {
    const modelInfo = models.map(model => {
      const fieldsCount = model.fields?.length || 0;
      const relationsCount = model.relations?.length || 0;
      const tableName = model.tableName || model.name.toLowerCase();
      
      return `// - ${model.name} (table: ${tableName}, fields: ${fieldsCount}, relations: ${relationsCount})`;
    });

    return `// Models in this schema:
${modelInfo.join('\n')}
//`;
  }

  /**
   * Format individual model
   */
  public formatModel(modelName: string, fields: string[], relations: string[], tableName?: string, compositePrimaryKey?: string[]): string {
    const indent = ' '.repeat(this.indentSize);
    let model = `model ${modelName} {\n`;

    // Add fields
    if (fields.length > 0) {
      model += fields.join('\n') + '\n';
    }

    // Add separator if both fields and relations exist
    if (fields.length > 0 && relations.length > 0) {
      model += '\n // Relations\n';
    }

    // Add relations
    if (relations.length > 0) {
      model += relations.join('\n') + '\n';
    }

    // Add composite primary key
    if (compositePrimaryKey && compositePrimaryKey.length > 0) {
      model += `${indent}@@id([${compositePrimaryKey.join(', ')}])\n`;
    }

    // Add table mapping
    if (tableName) {
      model += `${indent}@@map("${tableName}")\n`;
    }

    model += '}';

    return model;
  }

  /**
   * Format field with proper alignment
   */
  public formatField(fieldName: string, fieldType: string, attributes: string[] = []): string {
    const baseField = ` ${fieldName} ${fieldType}`;
    const attributeString = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
    
    return baseField + attributeString;
  }

  /**
   * Add indexes to model
   */
  public addIndexes(model: DslModel): string[] {
    const indexes: string[] = [];

    // Add unique indexes for unique fields
    if (model.fields) {
      for (const field of model.fields) {
        if (field.unique && field.name !== 'id') {
          const indexName = `idx_${model.tableName || model.name.toLowerCase()}_${this.toSnakeCase(field.name)}`;
          indexes.push(` @@index([${field.name}], map: "${indexName}")`);
        }
      }
    }

    // Add relation indexes
    if (model.relations) {
      for (const relation of model.relations) {
        if (relation.type === 'belongsTo') {
          const foreignKey = relation.foreignKey || `${this.toCamelCase(relation.target)}Id`;
          const indexName = `idx_${model.tableName || model.name.toLowerCase()}_${this.toSnakeCase(foreignKey)}`;
          indexes.push(` @@index([${foreignKey}], map: "${indexName}")`);
        }
      }
    }

    return indexes;
  }

  /**
   * Validate generated schema
   */
  public validateSchema(schema: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check for common issues
    const lines = schema.split('\n');
    
    // Check for missing primary keys
    const modelBlocks = this.extractModelBlocks(schema);
    for (const modelBlock of modelBlocks) {
      if (!modelBlock.content.includes('@id') && !modelBlock.content.includes('@@id')) {
        warnings.push(`Model ${modelBlock.name} appears to be missing a primary key`);
      }
    }

    // Check for orphaned foreign keys
    for (const line of lines) {
      if (line.includes('Int') && line.includes('Id') && line.includes('@map') && !line.includes('@relation')) {
        const match = line.match(/(\w+Id)/);
        if (match) {
          warnings.push(`Potential orphaned foreign key: ${match[1]}`);
        }
      }
    }

    // Check for missing table mappings
    for (const modelBlock of modelBlocks) {
      if (!modelBlock.content.includes('@@map')) {
        warnings.push(`Model ${modelBlock.name} might need table mapping`);
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Extract model blocks from schema
   */
  private extractModelBlocks(schema: string): { name: string; content: string }[] {
    const models: { name: string; content: string }[] = [];
    const lines = schema.split('\n');
    
    let currentModel: { name: string; content: string } | null = null;
    let braceCount = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('model ')) {
        const modelName = trimmedLine.match(/model (\w+)/)?.[1];
        if (modelName) {
          currentModel = { name: modelName, content: line + '\n' };
          braceCount = 0;
        }
      } else if (currentModel) {
        currentModel.content += line + '\n';
        
        // Count braces to detect end of model
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (braceCount === 0 && trimmedLine === '}') {
          models.push(currentModel);
          currentModel = null;
        }
      }
    }

    return models;
  }

  /**
   * Pretty print schema with consistent formatting
   */
  public prettyPrint(schema: string): string {
    const lines = schema.split('\n');
    const formattedLines: string[] = [];
    let indentLevel = 0;

    for (let line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines in models (but keep them elsewhere)
      if (!trimmedLine && indentLevel > 0) {
        continue;
      }

      // Adjust indent level
      if (trimmedLine.includes('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Apply indentation
      if (trimmedLine && indentLevel > 0) {
        line = ' ' + trimmedLine;
      } else if (trimmedLine) {
        line = trimmedLine;
      }

      formattedLines.push(line);

      // Increase indent level after opening brace
      if (trimmedLine.includes('{')) {
        indentLevel++;
      }
    }

    return formattedLines.join('\n');
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Convert string to snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
