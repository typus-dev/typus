/**
 * RelationGenerator
 * 
 * Generates Prisma relations from DSL relation definitions
 * Handles all relation types: hasOne, hasMany, belongsTo, manyToMany
 * 
 * @file RelationGenerator.ts
 * @version 1.0.0
 * @created August 8, 2025
 * @author System
 */

import { DslModel, DslRelation } from '../types.js';

export interface PrismaRelation {
  fieldName: string;
  fieldType: string;
  isArray: boolean;
  attributes: string[];
  isOptional: boolean;
}

export interface RelationContext {
  sourceModel: DslModel;
  targetModel: DslModel;
  allModels: DslModel[];
}

export class RelationGenerator {

  /**
   * Generate all relations for a model
   */
  public generateModelRelations(model: DslModel, allModels: DslModel[]): string[] {
    if (!model.relations || model.relations.length === 0) {
      return [];
    }

    const relations: string[] = [];

    for (const relation of model.relations) {
      const targetModel = this.findModelByName(relation.target, allModels);
      if (!targetModel) {
        console.warn(`Target model '${relation.target}' not found for relation '${relation.name}' in model '${model.name}'`);
        continue;
      }

      const context: RelationContext = {
        sourceModel: model,
        targetModel,
        allModels
      };

      const prismaRelation = this.generateRelation(relation, context);
      if (prismaRelation) {
        relations.push(this.formatPrismaRelation(prismaRelation));
      }
    }

    return relations;
  }

  /**
   * Generate a single relation
   */
  private generateRelation(relation: DslRelation, context: RelationContext): PrismaRelation | null {
    // Normalize relation type (support both 'many'/'one' and 'hasMany'/'belongsTo')
    let normalizedType = relation.type;
    if (relation.type === 'many') {
      normalizedType = 'hasMany';
    } else if (relation.type === 'one') {
      normalizedType = 'belongsTo';
    }

    switch (normalizedType) {
      case 'hasOne':
        return this.generateHasOneRelation(relation, context);
      case 'hasMany':
        return this.generateHasManyRelation(relation, context);
      case 'belongsTo':
        return this.generateBelongsToRelation(relation, context);
      case 'manyToMany':
        return this.generateManyToManyRelation(relation, context);
      default:
        console.warn(`Unknown relation type: ${relation.type}`);
        return null;
    }
  }

  /**
   * Generate hasOne relation (1:1)
   */
  private generateHasOneRelation(relation: DslRelation, context: RelationContext): PrismaRelation {
    const targetModel = context.targetModel;
    const foreignKey = relation.foreignKey || this.generateForeignKeyName(context.sourceModel.name);
    const targetModelName = this.getModelNameWithModule(targetModel);
    
    return {
      fieldName: relation.name,
      fieldType: targetModelName,
      isArray: false,
      isOptional: !relation.required,
      attributes: [
        `@relation(fields: [${foreignKey}], references: [id])`
      ]
    };
  }

  /**
   * Generate hasMany relation (1:N)
   */
  private generateHasManyRelation(relation: DslRelation, context: RelationContext): PrismaRelation {
    const targetModel = context.targetModel;
    const targetModelName = this.getModelNameWithModule(targetModel);

    // Use relation name as the relation identifier for Prisma
    // This creates a named relation like @relation("loginHistory")
    const relationName = `"${relation.name}"`;

    return {
      fieldName: relation.name,
      fieldType: targetModelName,
      isArray: true,
      isOptional: false,
      attributes: [`@relation(${relationName})`]
    };
  }

  /**
   * Generate belongsTo relation (N:1)
   */
  private generateBelongsToRelation(relation: DslRelation, context: RelationContext): PrismaRelation {
    const targetModel = context.targetModel;

    // REQUIRE explicit foreignKey specification
    if (!relation.foreignKey) {
      throw new Error(
        `belongsTo relation '${relation.name}' in model '${context.sourceModel.name}' ` +
        `MUST specify foreignKey. Add 'foreignKey: "fieldName"' to the relation definition.`
      );
    }

    const foreignKey = relation.foreignKey;
    const relationName = relation.inverseSide ? `"${relation.inverseSide}"` : '';
    const targetModelName = this.getModelNameWithModule(targetModel);

    const attributes: string[] = [];
    if (relationName) {
      attributes.push(`@relation(${relationName}, fields: [${foreignKey}], references: [id])`);
    } else {
      attributes.push(`@relation(fields: [${foreignKey}], references: [id])`);
    }

    return {
      fieldName: relation.name,
      fieldType: targetModelName,
      isArray: false,
      isOptional: !relation.required,
      attributes
    };
  }

  /**
   * Generate manyToMany relation (N:N)
   */
  private generateManyToManyRelation(relation: DslRelation, context: RelationContext): PrismaRelation {
    const targetModel = context.targetModel;
    const targetModelName = this.getModelNameWithModule(targetModel);
    
    // For many-to-many, we don't generate the intermediate table in the model
    // That should be handled separately as a junction model
    const relationName = relation.inverseSide ? `"${relation.inverseSide}"` : '';
    
    return {
      fieldName: relation.name,
      fieldType: targetModelName,
      isArray: true,
      isOptional: false,
      attributes: relationName ? [`@relation(${relationName})`] : []
    };
  }

  /**
   * Generate foreign key field for belongsTo relations
   *
   * NOTE: This method is NO LONGER used for auto-generating foreign key fields.
   * All foreign key fields MUST be explicitly defined in model.fields.
   * This method is kept only for backwards compatibility.
   */
  public generateForeignKeyField(relation: DslRelation, context: RelationContext): string | null {
    if (relation.type !== 'belongsTo' && relation.type !== 'hasOne') {
      return null;
    }

    // Require explicit foreignKey
    if (!relation.foreignKey) {
      throw new Error(
        `belongsTo relation '${relation.name}' in model '${context.sourceModel.name}' ` +
        `MUST specify foreignKey explicitly.`
      );
    }

    const foreignKey = relation.foreignKey;
    const mapName = this.toSnakeCase(foreignKey);
    const isOptional = !relation.required;

    return ` ${foreignKey} Int${isOptional ? '?' : ''} @map("${mapName}")`;
  }

  /**
   * Check if model needs foreign key fields
   *
   * NOTE: This method NO LONGER auto-generates foreign key fields.
   * All foreign key fields MUST be explicitly defined in model.fields.
   * This method now returns an empty array and validates that foreign keys exist.
   */
  public getForeignKeyFields(model: DslModel, allModels: DslModel[]): string[] {
    if (!model.relations) {
      return [];
    }

    // Get existing field names for validation
    const existingFields = model.fields ? model.fields.map(field => field.name) : [];

    // Validate that all belongsTo relations have their foreign key fields defined
    for (const relation of model.relations) {
      if (relation.type !== 'belongsTo' && relation.type !== 'one') {
        continue;
      }

      if (!relation.foreignKey) {
        throw new Error(
          `belongsTo relation '${relation.name}' in model '${model.name}' ` +
          `MUST specify foreignKey. Add 'foreignKey: "fieldName"' to the relation.`
        );
      }

      // Verify the foreign key field exists in model
      if (!existingFields.includes(relation.foreignKey)) {
        throw new Error(
          `Foreign key field '${relation.foreignKey}' for relation '${relation.name}' ` +
          `not found in model '${model.name}'. You must define this field explicitly in model.fields.`
        );
      }
    }

    // Return empty array - no auto-generation
    return [];
  }

  /**
   * [DEPRECATED - REMOVED]
   * Junction models are NO LONGER auto-generated from manyToMany relations.
   * All junction tables MUST be explicitly defined as DSL models with generatePrisma: true.
   *
   * Architectural decision:
   * - All models (including junction) are first-class citizens in DSL
   * - Explicit is better than implicit
   * - Full control over junction table structure (fields, indexes, relations)
   */

  /**
   * Format Prisma relation as string
   */
  private formatPrismaRelation(relation: PrismaRelation): string {
    const arraySuffix = relation.isArray ? '[]' : '';
    const optionalSuffix = relation.isOptional ? '?' : '';
    const type = `${relation.fieldType}${arraySuffix}${optionalSuffix}`;
    const attributes = relation.attributes.length > 0 ? ` ${relation.attributes.join(' ')}` : '';
    
    return ` ${relation.fieldName} ${type}${attributes}`;
  }

  /**
   * Generate foreign key name from model name
   */
  private generateForeignKeyName(modelName: string): string {
    return `${this.toCamelCase(modelName)}Id`;
  }

  /**
   * Find model by name in the models array
   */
  private findModelByName(name: string, models: DslModel[]): DslModel | undefined {
    return models.find(model => model.name === name);
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
    return str
      .replace(/[A-Z]/g, (letter, index) => 
        index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`
      );
  }

  /**
   * Get model name with module prefix
   */
  private getModelNameWithModule(model: DslModel): string {
    // Return original model name without module prefix
    return model.name;
  }

  /**
   * Get all junction models that need to be generated
   *
   * NOTE: This method now returns an empty array.
   * Junction models are NO LONGER auto-generated from manyToMany relations.
   * All junction tables MUST be explicitly defined as DSL models with generatePrisma: true.
   *
   * This method is kept for backward compatibility but does nothing.
   */
  public getRequiredJunctionModels(_models: DslModel[]): string[] {
    // No longer auto-generate junction models
    // All junction tables must be explicit DSL models
    return [];
  }
}
