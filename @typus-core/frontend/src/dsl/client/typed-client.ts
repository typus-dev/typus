import { DslOperationType, IDslClient, IDslClientOptions } from './types';

/**
 * Typed DSL model client interface
 */
export interface ITypedDslModelClient<T> {
  /**
   * Model name
   */
  name: string;
  
  /**
   * Get DSL client instance
   */
  getDslClient(): ITypedDslClient;
  
  /**
   * Find entity by ID
   */
  findById(id: number | string, include?: string[]): Promise<T>;
  
  /**
   * Find entities by filter
   */
  findMany(filter?: any, include?: string[], pagination?: { page?: number, limit?: number, orderBy?: any }): Promise<T[]>;
  
  /**
   * Create new entity
   */
  create(data: Partial<T>, include?: string[]): Promise<T>;
  
  /**
   * Update entity by ID
   */
  update(id: number | string, data: Partial<T>, include?: string[]): Promise<T>;
  
  /**
   * Delete entity by ID
   */
  delete(id: number | string): Promise<T>;

  /**
   * Count entities by filter
   */
  count(filter?: any): Promise<number>;

  /**
   * Get relation client for specific entity and relation
   */
  relation<R>(id: number | string, relationName: string): ITypedDslRelationClient<T, R>;
  
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
 * Typed DSL relation client interface
 */
export interface ITypedDslRelationClient<T, R> {
  /**
   * Parent model client
   */
  parentModel: ITypedDslModelClient<T>;
  
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
  findMany(filter?: any, include?: string[], pagination?: { page?: number, limit?: number, orderBy?: any }): Promise<R[]>;
  
  /**
   * Create related entity
   */
  create(data: Partial<R>, include?: string[]): Promise<R>;
  
  /**
   * Connect entity to relation
   */
  connect(targetId: number | string): Promise<T>;
  
  /**
   * Disconnect entity from relation
   */
  disconnect(targetId: number | string): Promise<T>;
}

/**
 * Typed DSL client interface
 */
export interface ITypedDslClient {
  /**
   * Initialize the DSL client
   */
  init(): Promise<void>;
  
  /**
   * Get typed model client by name
   */
  getModel<T>(name: string): ITypedDslModelClient<T>;
  
  /**
   * Execute DSL operation with type safety
   */
  executeOperation<T>(
    model: string,
    operation: DslOperationType,
    data?: any,
    filter?: any,
    include?: string[],
    pagination?: { page?: number, limit?: number, orderBy?: any },
    relationParams?: {
      parentId?: number | string;
      relationName?: string;
    }
  ): Promise<T>;
}

// Removed createTypedDslClient function to avoid export conflict
// Use the implementation from TypedDslClient.ts instead
