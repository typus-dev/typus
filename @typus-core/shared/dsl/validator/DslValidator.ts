/**
 * DslValidator
 *
 * Validates DSL model definitions to catch common errors early
 *
 * @file DslValidator.ts
 * @version 1.0.0
 * @created October 2, 2025
 */

import { DslModel, DslRelation } from '../types.js';
import { registry } from '../registry.js';

export interface ValidationError {
  model: string;
  relation?: string;
  field?: string;
  error: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export class DslValidator {
  private errors: ValidationError[] = [];

  /**
   * Validate all models
   */
  public validateModels(models: DslModel[]): ValidationError[] {
    this.errors = [];

    for (const model of models) {
      this.validateModel(model, models);
    }

    return this.errors;
  }

  /**
   * Validate single model structure (for instant workflow)
   * Returns simple string arrays for errors and warnings
   */
  public validateModelStructure(model: DslModel): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: model registered in registry?
    if (!registry.hasModel(model.name, model.module)) {
      errors.push(`Model ${model.name} not registered. Add: registry.registerModel(${model.name}Model)`);
    }

    // Check 2: generatePrisma flag?
    if (model.generatePrisma !== true) {
      errors.push(`Model ${model.name} missing generatePrisma: true`);
    }

    // Check 3: Required fields present?
    // Skip 'id' requirement if model has composite primary key
    const hasCompositePrimaryKey = Array.isArray(model.primaryKey) && model.primaryKey.length > 1;
    const requiredFields = hasCompositePrimaryKey
      ? ['createdAt', 'updatedAt']  // Junction tables don't need 'id'
      : ['id', 'createdAt', 'updatedAt'];

    const fieldNames = model.fields.map(f => f.name);
    const missing = requiredFields.filter(f => !fieldNames.includes(f));
    if (missing.length > 0) {
      errors.push(`Model ${model.name} missing required fields: ${missing.join(', ')}`);
    }

    // Check 4: Timestamps config?
    if (!model.config?.timestamps) {
      warnings.push(`Model ${model.name} should have config.timestamps: true for automatic createdAt/updatedAt`);
    }

    // Check 5: Access permissions complete?
    const requiredAccess = ['create', 'read', 'update', 'delete', 'count'];
    const missingAccess = requiredAccess.filter(a => !model.access?.[a as keyof typeof model.access]);
    if (missingAccess.length > 0) {
      warnings.push(`Model ${model.name} missing access permissions: ${missingAccess.join(', ')}`);
    }

    // Check 5b: Access object exists?
    if (!model.access) {
      errors.push(`Model ${model.name} has no access object. Check for syntax errors (missing comma after relations, etc.)`);
    }

    // Check 6: Module naming (underscore not dash)?
    if (model.module?.includes('-')) {
      errors.push(`Model ${model.name} module uses dash. Change '${model.module}' to '${model.module.replace(/-/g, '_')}'`);
    }

    // Check 7: Table name convention
    if (model.tableName && model.tableName !== model.tableName.toLowerCase()) {
      warnings.push(`Model ${model.name} tableName should be lowercase: '${model.tableName.toLowerCase()}'`);
    }

    return { errors, warnings };
  }

  /**
   * Validate single model
   */
  private validateModel(model: DslModel, allModels: DslModel[]): void {
    // Validate relations
    if (model.relations) {
      for (const relation of model.relations) {
        this.validateRelation(model, relation, allModels);
      }
    }

    // Validate fields
    if (model.fields) {
      const fieldNames = new Set<string>();
      for (const field of model.fields) {
        // Check for duplicate field names
        if (fieldNames.has(field.name)) {
          this.addError({
            model: model.name,
            field: field.name,
            error: `Duplicate field name: ${field.name}`,
            severity: 'error'
          });
        }
        fieldNames.add(field.name);
      }
    }
  }

  /**
   * Validate relation definition
   */
  private validateRelation(model: DslModel, relation: DslRelation, allModels: DslModel[]): void {
    // Check if target model exists
    const targetModel = allModels.find(m => m.name === relation.target);
    if (!targetModel) {
      this.addError({
        model: model.name,
        relation: relation.name,
        error: `Target model not found: ${relation.target}`,
        severity: 'error'
      });
      return;
    }

    // CRITICAL: belongsTo relations MUST specify foreignKey
    if (relation.type === 'belongsTo' || relation.type === 'one') {
      if (!relation.foreignKey) {
        this.addError({
          model: model.name,
          relation: relation.name,
          error: `belongsTo relation MUST specify foreignKey. Add 'foreignKey: "fieldName"' to relation definition.`,
          severity: 'error'
        });
      } else {
        // Check if foreign key field exists in model
        const foreignKeyExists = model.fields?.some(f => f.name === relation.foreignKey);
        if (!foreignKeyExists) {
          this.addError({
            model: model.name,
            relation: relation.name,
            error: `foreignKey '${relation.foreignKey}' not found in model fields. You must define this field explicitly.`,
            severity: 'error'
          });
        }
      }
    }

    // hasMany should have inverseSide
    if (relation.type === 'hasMany' || relation.type === 'many') {
      if (!relation.inverseSide) {
        this.addError({
          model: model.name,
          relation: relation.name,
          error: `hasMany relation should specify inverseSide for clarity`,
          severity: 'warning'
        });
      }
    }

    // Check inverse side exists
    if (relation.inverseSide) {
      const inverseRelation = targetModel.relations?.find(r => r.name === relation.inverseSide);
      if (!inverseRelation) {
        this.addError({
          model: model.name,
          relation: relation.name,
          error: `inverseSide '${relation.inverseSide}' not found in target model '${targetModel.name}'`,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Add validation error
   */
  private addError(error: ValidationError): void {
    this.errors.push(error);
  }

  /**
   * Format errors for display
   */
  public static formatErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return '✅ No validation errors found';
    }

    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    let output = `\n❌ DSL Validation found ${errorCount} error(s) and ${warningCount} warning(s):\n\n`;

    for (const error of errors) {
      const icon = error.severity === 'error' ? '❌' : '⚠️';
      const location = error.relation
        ? `${error.model}.${error.relation}`
        : error.field
          ? `${error.model}.${error.field}`
          : error.model;

      output += `${icon} [${location}] ${error.error}\n`;
    }

    return output;
  }
}
