/**
 * Types for DSL client
 */

/**
 * DSL operation types
 */
export type DslOperationType = 'create' | 'read' | 'update' | 'delete' | 'count';

/**
 * DSL client options
 */
export interface IDslClientOptions {
  /**
   * Base API endpoint for DSL operations
   * Required parameter that should be provided from environment
   */
  apiEndpoint: string;
}

/**
 * DSL model client options
 */
export interface IDslModelClientOptions {
  /**
   * Model name
   */
  name: string;
  
  /**
   * DSL client instance
   */
  dslClient: IDslClient;
}

/**
 * DSL relation client options
 */
export interface IDslRelationClientOptions {
  /**
   * Parent model client
   */
  parentModel: IDslModelClient;
  
  /**
   * Parent entity ID
   */
  parentId: number | string;
  
  /**
   * Relation name
   */
  relationName: string;
}

/**
 * DSL client interface
 */
export interface IDslClient {
  /**
   * Get model client by name
   */
  getModel(name: string): IDslModelClient;
  
  /**
   * Initialize the DSL client
   */
  init(): Promise<void>;
  
  /**
   * Execute DSL operation
   */
  executeOperation(
    model: string,
    operation: DslOperationType,
    data?: any,
    filter?: any,
    include?: string[],
    pagination?: { page: number, limit: number },
    relationParams?: {
      parentId?: number | string;
      relationName?: string;
    },
  ): Promise<any>;
}

/**
 * DSL model client interface
 */
export interface IDslModelClient {
  /**
   * Model name
   */
  name: string;
  
  /**
   * Get DSL client instance
   */
  getDslClient(): IDslClient;
  
  /**
   * Find entity by ID
   */
  findById(id: number | string, include?: string[]): Promise<any>;
  
  /**
   * Find entities by filter
   */
  findMany(filter?: any, include?: string[], pagination?: { page: number, limit: number }): Promise<any[]>;
  
  /**
   * Create new entity
   */
  create(data: any, include?: string[]): Promise<any>;
  
  /**
   * Update entity by ID
   */
  update(id: number | string, data: any, include?: string[]): Promise<any>;
  
  /**
   * Delete entity by ID
   */
  delete(id: number | string): Promise<any>;
  
  /**
   * Count entities by filter
   */
  count(filter?: any): Promise<number>;
  
  /**
   * Get relation client for specific entity and relation
   */
  relation(id: number | string, relationName: string): IDslRelationClient;
  
  /**
   * Get model metadata
   */
  getMetadata(): Promise<any>;
  
  /**
   * Get all fields of the model with specified visibility
   */
  getFields(visibility?: ('table' | 'form' | 'detail')[]): Promise<any[]>;
  
  /**
   * Get a specific field of the model by name
   */
  getField(fieldName: string): Promise<any | null>;
}

/**
 * DSL relation client interface
 */
export interface IDslRelationClient {
  /**
   * Parent model client
   */
  parentModel: IDslModelClient;
  
  /**
   * Parent entity ID
   */
  parentId: number | string;
  
  /**
   * Relation name
   */
  relationName: string;
  
  /**
   * Find related entities
   */
  findMany(filter?: any, include?: string[], pagination?: { page: number, limit: number }): Promise<any[]>;
  
  /**
   * Create related entity
   */
  create(data: any, include?: string[]): Promise<any>;
  
  /**
   * Connect entity to relation
   */
  connect(targetId: number | string): Promise<any>;
  
  /**
   * Disconnect entity from relation
   */
  disconnect(targetId: number | string): Promise<any>;
}
