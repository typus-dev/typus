import { DslOperationType } from './types';
import { ITypedDslModelClient, ITypedDslRelationClient, ITypedDslClient } from './typed-client';
import { logger } from '@/core/logging/logger';

/**
 * Typed DSL model client implementation
 */
export class TypedDslModelClient<T> implements ITypedDslModelClient<T> {
  private readonly modelName: string;
  private readonly dslExecutor: ITypedDslClient;

  /**
   * Create a new typed DSL model client
   */
  constructor(modelName: string, dslExecutor: ITypedDslClient) { 
    logger.debug(`[TypedDslModelClient for "${modelName}"] constructor called. Executor type: ${dslExecutor?.constructor?.name}`);
    this.modelName = modelName;
    this.dslExecutor = dslExecutor;
  }

  /**
   * Get model name
   */
  get name(): string {
    return this.modelName;
  }

  /**
   * Get DSL client instance
   */
  getDslClient(): ITypedDslClient {
    return this.dslExecutor;
  }

  /**
   * Find entity by ID
   */
  async findById(id: number | string, include?: string[]): Promise<T> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] findById() called`, { id, include });
    
    return this.dslExecutor.executeOperation(
      this.modelName,
      'read',
      { id },
      undefined,
      include,
      undefined,
      undefined
    ) as Promise<T>;
  }

  /**
   * Find entities by filter
   */
  async findMany(filter?: any, include?: string[], pagination?: { page?: number, limit?: number, orderBy?: any }): Promise<T[]> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] findMany() called`, { filter, include, pagination });
    
    return this.dslExecutor.executeOperation(
      this.modelName,
      'read',
      undefined,
      filter,
      include,
      pagination,
      undefined
    ) as Promise<T[]>;
  }

  /**
   * Create new entity
   */
  async create(data: Partial<T>, include?: string[]): Promise<T> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] create() called`, { data, include });
    
    return this.dslExecutor.executeOperation(
      this.modelName,
      'create',
      data,
      undefined,
      include,
      undefined,
      undefined
    ) as Promise<T>;
  }

  /**
   * Update entity by ID
   */
  async update(id: number | string, data: Partial<T>, include?: string[]): Promise<T> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] update() called`, { id, data, include }); 
    
    return this.dslExecutor.executeOperation(
      this.modelName,
      'update', 
      data,     
      { id },   
      include,
      undefined, 
      undefined
    ) as Promise<T>;
  }

  /**
   * Delete entity by ID
   */
  async delete(id: number | string): Promise<T> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] delete() called`, { id });
    
    return this.dslExecutor.executeOperation(
      this.modelName,
      'delete',
      { id },
      undefined,
      undefined,
      undefined,
      undefined
    ) as Promise<T>;
  }

  /**
   * Count entities by filter
   */
  async count(filter?: any): Promise<number> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] count() called`, { filter });
    
    return this.dslExecutor.executeOperation(
      this.modelName,
      'count',
      undefined,
      filter,
      undefined,
      undefined,
      undefined
    ) as Promise<number>;
  }

  /**
   * Get relation client for specific entity and relation
   */
  relation<R>(id: number | string, relationName: string): ITypedDslRelationClient<T, R> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] relation() called`, { id, relationName });
    
    throw new Error(`Method 'relation' in TypedDslModelClient for model '${this.modelName}' is not implemented yet.`);
  }

  /**
   * Get model metadata
   */
  async getMetadata(): Promise<any> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] getMetadata() called`);
    
    // Use 'read' operation with a special filter to get metadata
    return this.dslExecutor.executeOperation(
      this.modelName,
      'read',
      undefined,
      { _metadata: true },
      undefined,
      undefined,
      undefined
    );
  }

  /**
   * Get all fields of the model with specified visibility
   */
  async getFields(visibility?: ('table' | 'form' | 'detail')[]): Promise<any[]> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] getFields() called`, { visibility });
    
    const metadata = await this.getMetadata();
    if (!metadata || !metadata.fields) {
      return [];
    }
    
    if (!visibility || visibility.length === 0) {
      return metadata.fields;
    }
    
    return metadata.fields.filter((field: any) => {
      if (!field.ui || !field.ui.visibility) {
        return false;
      }
      return visibility.some(v => field.ui.visibility.includes(v));
    });
  }

  /**
   * Get a specific field of the model by name
   */
  async getField(fieldName: string): Promise<any | null> {
    logger.debug(`[TypedDslModelClient for "${this.modelName}"] getField() called`, { fieldName });
    
    const fields = await this.getFields();
    return fields.find((field: any) => field.name === fieldName) || null;
  }
}
