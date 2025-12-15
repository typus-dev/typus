/**
 * DSL Types
 * 
 * Type definitions for DSL models and related structures
 * 
 * @file types.ts
 * @version 1.1.0
 * @created May 4, 2025
 * @modified August 8, 2025
 * @purpose Define types for DSL models and related structures
 * @lastChange Added access control types
 * @author Dmytro Klymentiev
 */

/**
 * Field type definition
 */
export interface DslField {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  default?: any;
  primaryKey?: boolean;
  autoincrement?: boolean;
  autoIncrement?: boolean; // Support both variants
  description?: string;
  validation?: Array<{
    type: string;
    value?: any;
    message?: string;
    [key: string]: any;
  }>;
  ui?: {
    label?: string;
    component?: string;
    visibility?: string[];
    isSearchable?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Relation type definition
 */
export interface DslRelation {
  name: string;
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany' | 'one' | 'many'; // 'one' and 'many' are legacy aliases
  target: string;
  foreignKey?: string;
  description?: string;
  required?: boolean;
  inverseSide?: string;
  through?: {
    model: string;     // Junction model name
    sourceKey: string; // Source field in junction table
    targetKey: string; // Target field in junction table
  };
  ui?: {
    label?: string;
    component?: string;
    displayField?: string;
    visibility?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Access control definition for model operations
 */
export interface DslAccessControl {
  create?: string[];
  read?: string[];
  update?: string[];
  delete?: string[];
  count?: string[];
}

/**
 * Event configuration for automatic event emission
 *
 * Events are emitted via EventBus after successful operations.
 * Workflow plugin can subscribe to these events and trigger workflows.
 *
 * @example
 * ```typescript
 * events: {
 *   afterCreate: 'waitlist.signup.created',
 *   afterUpdate: 'waitlist.signup.updated',
 *   afterDelete: 'waitlist.signup.deleted'
 * }
 * ```
 *
 * Event payload structure:
 * {
 *   record: { ... },      // The created/updated/deleted record
 *   modelName: 'WaitlistSignup',
 *   userId: 1,            // User who triggered the operation (if available)
 *   timestamp: '2024-12-05T...'
 * }
 */
export interface DslEvents {
  /** Event emitted after successful create operation */
  afterCreate?: string;
  /** Event emitted after successful update operation */
  afterUpdate?: string;
  /** Event emitted after successful delete operation */
  afterDelete?: string;
}

/**
 * Ownership configuration for automatic resource filtering
 *
 * @example
 * ```typescript
 * ownership: {
 *   field: 'userId',           // Field that identifies owner
 *   autoFilter: true,          // Auto-inject userId filter on read
 *   operations: ['read', 'update', 'delete'],
 *   adminBypass: true          // Admins can see all records
 * }
 * ```
 */
export interface DslOwnership {
  /**
   * Field name that identifies the owner (e.g., 'userId', 'createdBy')
   */
  field: string;

  /**
   * Auto-inject owner filter on read operations
   * When true, DSL will automatically add filter[field] = user.id
   * @default false
   */
  autoFilter?: boolean;

  /**
   * Operations where ownership filter should apply
   * @default ['read', 'update', 'delete']
   */
  operations?: Array<'create' | 'read' | 'update' | 'delete'>;

  /**
   * Allow admins to bypass ownership filter
   * @default true
   */
  adminBypass?: boolean;
}

/**
 * Model type definition
 */
export interface DslModel {
  name: string;
  module?: string;
  tableName?: string;
  fields: DslField[];
  relations?: DslRelation[];
  primaryKey?: string[];  // Composite primary key support
  description?: string;
  generatePrisma?: boolean;
  access?: DslAccessControl;
  ownership?: DslOwnership;
  events?: DslEvents;  // Event emission configuration
  ui?: {
    displayName?: string;
    displayField?: string;
    icon?: string;
    color?: string;
    [key: string]: any;
  };
  config?: {
    timestamps?: boolean;
    [key: string]: any;
  };
}

/**
 * Operation type for DSL client
 */
export type DslOperation = 
  | 'findMany'
  | 'findUnique'
  | 'findFirst'
  | 'create'
  | 'update'
  | 'delete'
  | 'count';

/**
 * Query parameters for DSL operations
 */
export interface DslQueryParams {
  where?: Record<string, any>;
  select?: Record<string, boolean>;
  include?: Record<string, boolean | Record<string, any>>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
  cursor?: Record<string, any>;
  data?: Record<string, any>;
}

/**
 * DSL operation result
 */
export interface DslOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

/**
 * Registry interface for DSL models
 */
export interface DslRegistry {
  registerModel(model: DslModel): void;
  getAllModels(): DslModel[];
  getModelByName(name: string): DslModel | undefined;
  registerMany?(models: DslModel[]): void;
  checkForCyclicDependencies?(): { hasCycles: boolean; cycles: string[][] };
}