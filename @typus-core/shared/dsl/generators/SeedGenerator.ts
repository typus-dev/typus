/**
 * SeedGenerator
 *
 * Automatically generates seed.sql files from DSL models
 * Prevents common errors like wrong table names and camelCase columns
 *
 * @file SeedGenerator.ts
 * @version 1.0.0
 * @created November 10, 2025
 */

import { DslModel, DslField } from '../types.js';

export class SeedGenerator {
  /**
   * Generate seed.sql content from DSL model
   *
   * @param model - The DSL model to generate seed for
   * @param rowCount - Number of example rows to generate (default: 1)
   * @returns SQL seed content
   */
  generateSeed(model: DslModel, rowCount: number = 1): string {
    const tableName = this.getFullTableName(model);
    const fields = this.getInsertableFields(model);

    if (fields.length === 0) {
      return this.generateEmptyTemplate(model, tableName);
    }

    const sql: string[] = [];

    // Header
    sql.push(`-- =============================================================================`);
    sql.push(`-- Seed data for ${model.name}`);
    sql.push(`-- =============================================================================`);
    sql.push(`-- Table: ${tableName}`);
    sql.push(`-- Generated: ${new Date().toISOString()}`);
    sql.push(`-- Module: ${model.module || 'core'}`);
    sql.push(`-- ⚠️  This is a template. Customize the values before using.`);
    sql.push(`-- =============================================================================`);
    sql.push('');

    // INSERT statement
    sql.push(`INSERT INTO \`${tableName}\``);
    sql.push(`  (`);
    sql.push(`    ${fields.map(f => `\`${this.toSnakeCase(f.name)}\``).join(',\n    ')}`);
    sql.push(`  )`);
    sql.push(`VALUES`);

    // Generate example rows
    const rows: string[] = [];
    for (let i = 0; i < rowCount; i++) {
      const values = fields.map(f => this.getExampleValue(f, i));
      rows.push(`  (\n    ${values.join(',\n    ')}\n  )`);
    }
    sql.push(rows.join(',\n'));
    sql.push(`;`);
    sql.push('');

    // Footer with notes
    sql.push(`-- =============================================================================`);
    sql.push(`-- Notes:`);
    sql.push(`-- - Adjust the values above to match your needs`);
    sql.push(`-- - Add more rows by copying the VALUES block`);
    sql.push(`-- - Make sure foreign keys reference existing records`);
    sql.push(`-- =============================================================================`);

    return sql.join('\n');
  }

  /**
   * Get full table name with module prefix
   */
  private getFullTableName(model: DslModel): string {
    const tableName = model.tableName || this.toSnakeCase(model.name);
    return model.module ? `${model.module}.${tableName}` : tableName;
  }

  /**
   * Get fields that should be in INSERT statement
   * Excludes auto-increment, auto-timestamp fields
   */
  getInsertableFields(model: DslModel): DslField[] {
    return model.fields.filter(f => {
      // Skip auto-increment fields (id)
      if (f.autoIncrement || f.autoincrement) return false;

      // Skip auto-timestamp fields if timestamps config is enabled
      if (model.config?.timestamps) {
        if (f.name === 'createdAt' || f.name === 'updatedAt') return false;
      }

      return true;
    });
  }

  /**
   * Convert camelCase to snake_case
   */
  toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * Generate example value for a field
   *
   * @param field - The field definition
   * @param index - Row index (for varying values)
   * @returns SQL-formatted value
   */
  getExampleValue(field: DslField, index: number = 0): string {
    // Handle default values
    if (field.default !== undefined) {
      if (typeof field.default === 'string') {
        return `'${field.default}'`;
      }
      if (typeof field.default === 'boolean') {
        return field.default ? 'TRUE' : 'FALSE';
      }
      return String(field.default);
    }

    // Handle NULL for optional fields
    if (!field.required) {
      return 'NULL';
    }

    // Generate by type
    const fieldType = field.type.toLowerCase();

    switch (fieldType) {
      case 'int':
      case 'integer':
      case 'bigint':
        return String(index + 1);

      case 'float':
      case 'double':
      case 'decimal':
        return String((index + 1) * 1.5);

      case 'boolean':
      case 'bool':
        // Use TRUE/FALSE for SQL compatibility
        return index % 2 === 0 ? 'TRUE' : 'FALSE';

      case 'datetime':
      case 'timestamp':
        return 'NOW()';

      case 'date':
        return 'CURDATE()';

      case 'json':
      case 'jsonb':
        return "'{}'";

      case 'text':
        return `'Example ${this.toSnakeCase(field.name)} content ${index + 1}'`;

      case 'string':
      default:
        // Check if it's a foreign key (usually ends with Id)
        if (field.name.endsWith('Id')) {
          return '1'; // Reference to first record
        }
        return `'example-${this.toSnakeCase(field.name)}-${index + 1}'`;
    }
  }

  /**
   * Generate empty template when no insertable fields
   */
  private generateEmptyTemplate(model: DslModel, tableName: string): string {
    return `-- =============================================================================
-- Seed data for ${model.name}
-- =============================================================================
-- Table: ${tableName}
-- Generated: ${new Date().toISOString()}
--
-- ⚠️  This model has no insertable fields (only auto-generated fields)
-- ⚠️  No seed data needed.
-- =============================================================================
`;
  }

  /**
   * Generate seed with custom data
   *
   * @param model - The DSL model
   * @param rows - Array of data objects to insert
   * @returns SQL seed content
   */
  generateSeedFromData(model: DslModel, rows: Record<string, any>[]): string {
    const tableName = this.getFullTableName(model);
    const fields = this.getInsertableFields(model);

    if (rows.length === 0) {
      return this.generateEmptyTemplate(model, tableName);
    }

    const sql: string[] = [];

    // Header
    sql.push(`-- Seed data for ${model.name}`);
    sql.push(`-- Table: ${tableName}`);
    sql.push(`-- Generated: ${new Date().toISOString()}`);
    sql.push('');

    // INSERT statement
    sql.push(`INSERT INTO \`${tableName}\``);
    sql.push(`  (`);
    sql.push(`    ${fields.map(f => `\`${this.toSnakeCase(f.name)}\``).join(',\n    ')}`);
    sql.push(`  )`);
    sql.push(`VALUES`);

    // Generate rows from data
    const valueRows: string[] = [];
    for (const row of rows) {
      const values = fields.map(f => {
        const value = row[f.name];
        if (value === null || value === undefined) {
          return 'NULL';
        }
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`; // Escape quotes
        }
        if (typeof value === 'boolean') {
          // Use TRUE/FALSE for SQL compatibility
          return value ? 'TRUE' : 'FALSE';
        }
        if (typeof value === 'object') {
          return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        }
        return String(value);
      });
      valueRows.push(`  (\n    ${values.join(',\n    ')}\n  )`);
    }
    sql.push(valueRows.join(',\n'));
    sql.push(`;`);

    return sql.join('\n');
  }
}
