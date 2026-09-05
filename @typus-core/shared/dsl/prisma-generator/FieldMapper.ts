/**
 * FieldMapper
 * 
 * Maps DSL field definitions to Prisma field syntax
 * Handles type conversion, attributes, and validation
 * 
 * @file FieldMapper.ts
 * @version 1.0.0
 * @created August 8, 2025
 * @author System
 */

import { DslField } from '../types.js';

export interface PrismaFieldOptions {
  /** Only so a refusal can name the model the bad field is in. */
  modelName?: string;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  hasDefaultValue?: boolean;
  isAutoIncrement?: boolean;
  isRequired?: boolean;
  dbType?: string;
  mapName?: string;
}

export class FieldMapper {

  private dbProvider: string;

  constructor(dbProvider: string = 'mysql') {
    this.dbProvider = dbProvider;
  }

  /**
   * Every field type the DSL accepts.
   *
   * Two vocabularies on purpose: the DSL's own lowercase names, and Prisma's native spellings,
   * because someone who writes `Json` means Json and should not be silently given something else.
   */
  private static readonly TYPE_MAP: Record<string, string> = {
    // DSL vocabulary
    'string': 'String',
    'text': 'String',
    'email': 'String',
    'url': 'String',
    'uuid': 'String',
    'int': 'Int',
    'float': 'Float',
    'decimal': 'Decimal',
    'boolean': 'Boolean',
    'datetime': 'DateTime',
    'date': 'DateTime',
    'json': 'Json',
    // Prisma's own names, accepted as written
    'String': 'String',
    'Int': 'Int',
    'BigInt': 'BigInt',
    'Float': 'Float',
    'Decimal': 'Decimal',
    'Boolean': 'Boolean',
    'DateTime': 'DateTime',
    'Json': 'Json',
    'Bytes': 'Bytes'
  };

  /**
   * Map a DSL type to a Prisma type, or refuse.
   *
   * WHY IT THROWS. This used to end in `|| 'String'`. A typo in a type, or a name the generator
   * never knew, produced a String column with no warning anywhere: the model file read as correct,
   * the table was wrong, and the mistake surfaced much later as data that would not fit or a
   * comparison that behaved oddly. Measured on this tree the day the check was added: three fields
   * in plugins/compass declared `Json`, a name the old map did not contain, and had been VARCHAR
   * ever since. For a framework whose whole value is generating from a declaration, guessing at a
   * declaration it does not understand is the worst available default.
   */
  private mapDslTypeToPrisma(dslType: string, fieldName?: string, modelName?: string): string {
    const mapped = FieldMapper.TYPE_MAP[dslType];
    if (!mapped) {
      const where = modelName ? `${modelName}.${fieldName ?? '?'}` : (fieldName ?? 'a field');
      throw new Error(
        `Unknown DSL field type '${dslType}' on ${where}. ` +
        `Accepted: ${Object.keys(FieldMapper.TYPE_MAP).join(', ')}. ` +
        `If you meant a fixed set of values, the type is 'string' and the values go in ` +
        `validation: [{ type: 'enum', value: [...] }].`
      );
    }
    return mapped;
  }

  /**
   * Get database type annotation
   */
  private getDbTypeAnnotation(field: DslField): string {
    // SQLite doesn't support @db.* annotations - use native Prisma types only
    if (this.dbProvider === 'sqlite') {
      return '';
    }

    const { type, name } = field;

    // Check for explicit prisma.type override first
    if (field.prisma?.type) {
      return field.prisma.type;
    }

    // Special cases for common field patterns (MySQL only)
    if (name === 'id' && type === 'string') {
      return '@db.VarChar(36)';
    }

    if (name === 'id' && type === 'Int') {
      return '';
    }

    // Type-based annotations with validation support (MySQL only)
    switch (type.toLowerCase()) {
      case 'string':
      case 'email':
      case 'url': {
        // Check for maxLength validation
        const maxLength = field.validation?.find(v => v.type === 'maxLength')?.value;
        if (maxLength) {
          return `@db.VarChar(${maxLength})`;
        }
        return '@db.VarChar(255)';
      }
      case 'text':
        return '@db.Text';
      case 'datetime':
      case 'date':
        return '@db.DateTime(3)';
      case 'json':
        return '';
      case 'boolean':
        return '';
      case 'int':
        return '';
      case 'float':
        return '@db.Decimal(10,2)';
      case 'decimal':
        return '@db.Decimal(10,2)';
      default:
        return '';
    }
  }



  /**
   * Generate field attributes
   */
  private generateAttributes(field: DslField, options: PrismaFieldOptions): string[] {
    const attributes: string[] = [];

    // Primary key
    if (options.isPrimaryKey || field.primaryKey) {
      attributes.push('@id');
    }

    // Auto increment - support both camelCase and lowercase
    const autoIncrementField = Object.keys(field).find(key =>
      key.toLowerCase() === 'autoincrement'
    );
    const hasAutoIncrement = options.isAutoIncrement ||
      (autoIncrementField && field[autoIncrementField]);

    // Handle explicit prisma.default (even without autoIncrement flag)
    if (field.prisma?.default) {
      // Convert MySQL-specific dbgenerated UUID to universal uuid() for SQLite
      let defaultValue = field.prisma.default;
      if (this.dbProvider === 'sqlite' && defaultValue.includes('dbgenerated') && defaultValue.includes('UUID')) {
        defaultValue = 'uuid()';
      }
      attributes.push(`@default(${defaultValue})`);
    } else if (hasAutoIncrement) {
      // Auto-generated defaults
      if (field.type === 'Int' || field.type === 'int') {
        attributes.push('@default(autoincrement())');
      } else if (field.type === 'string' && field.name === 'id') {
        // Use uuid() for SQLite, dbgenerated for MySQL
        const uuidDefault = this.dbProvider === 'sqlite'
          ? 'uuid()'
          : 'dbgenerated("(UUID())")';
        attributes.push(`@default(${uuidDefault})`);
      }
    }

    // Unique constraint
    if (options.isUnique || field.unique) {
      attributes.push('@unique');
    }

    // Default value
    if (field.default !== undefined && !hasAutoIncrement) {
      const defaultValue = this.formatDefaultValue(field.default, field.type);
      if (defaultValue) {
        attributes.push(`@default(${defaultValue})`);
      }
    }

    // Database type
    const dbType = options.dbType || this.getDbTypeAnnotation(field);
    if (dbType) {
      attributes.push(dbType);
    }

    // Map annotation for snake_case
    if (options.mapName && options.mapName !== field.name) {
      attributes.push(`@map("${options.mapName}")`);
    }

    return attributes;
  }

  /**
   * Format default value for Prisma
   */
  private formatDefaultValue(value: any, type: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type.toLowerCase()) {
      case 'string':
      case 'text':
      case 'email':
      case 'url':
        return `"${value}"`;
      case 'boolean':
        return value.toString();
      case 'int':
      case 'float':
        return value.toString();
      case 'datetime':
      case 'date':
        if (value === 'now' || value === 'current_timestamp') {
          return 'now()';
        }
        return `"${value}"`;
      case 'json':
        return JSON.stringify(value);
      default:
        return `"${value}"`;
    }
  }

  /**
   * Convert field name to snake_case for database mapping
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Generate complete Prisma field definition
   */
  public generatePrismaField(field: DslField, options: PrismaFieldOptions = {}): string {
    const prismaType = this.mapDslTypeToPrisma(field.type, field.name, options.modelName);

    // Field is optional if not required and not a primary key
    const isOptional = !field.required && !field.primaryKey && !options.isPrimaryKey;
    const typeDeclaration = `${prismaType}${isOptional ? '?' : ''}`;

    // Generate map name if field name contains camelCase
    const mapName = field.name !== this.toSnakeCase(field.name)
      ? this.toSnakeCase(field.name)
      : undefined;

    const attributes = this.generateAttributes(field, {
      ...options,
      mapName
    });

    const attributeString = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';

    return ` ${field.name} ${typeDeclaration}${attributeString}`;
  }

  /**
   * Generate audit fields (createdAt, updatedAt, etc.)
   */
  public generateAuditFields(): string[] {
    // SQLite doesn't support @db.DateTime - use native DateTime
    const dateTimeType = this.dbProvider === 'sqlite'
      ? 'DateTime'
      : 'DateTime @db.DateTime(3)';

    return [
      ` createdAt ${dateTimeType} @default(now()) @map("created_at")`,
      ` updatedAt ${dateTimeType} @updatedAt @map("updated_at")`,
      ' createdBy Int? @map("created_by")',
      ' updatedBy Int? @map("updated_by")'
    ];
  }

  /**
   * Check if field is a standard audit field
   */
  public isAuditField(fieldName: string): boolean {
    const auditFields = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];
    return auditFields.includes(fieldName);
  }
}