import { DslOperationType } from './types';
import { ITypedDslClient, ITypedDslModelClient } from './typed-client';
import { TypedDslModelClient } from './TypedDslModelClient';
import { useApi } from '@/shared/composables/useApi';
import { logger } from '@/core/logging/logger';

/**
 * Typed DSL client implementation
 * Direct implementation without relying on DslClientImpl
 */
export class TypedDslClient implements ITypedDslClient {
  /**
   * API endpoint for DSL operations
   */
  private readonly apiEndpoint: string = 'dsl';

  /**
   * Cache for typed model clients
   */
  private readonly typedModelClients: Record<string, ITypedDslModelClient<any>> = {};

  /**
   * Create a new typed DSL client
   */
  constructor() {
    logger.debug(`[TypedDslClient] constructor called. Direct implementation without DslClientImpl.`);
  }

  /**
   * Initialize the DSL client
   * No longer needs to initialize DslClientImpl
   */
  async init(): Promise<void> {
    logger.debug(`[TypedDslClient] init() called. No initialization needed.`);
    return Promise.resolve();
  }

  /**
   * Get typed model client by name
   */
  getModel<T = any>(name: string): ITypedDslModelClient<T> {
    const cacheKey = name;
    logger.debug(`[TypedDslClient] getModel() called for name: "${name}", cacheKey: "${cacheKey}"`);
    
    if (!this.typedModelClients[cacheKey]) {
      logger.debug(`[TypedDslClient] No TypedDslModelClient found for "${cacheKey}" in cache, creating new one.`);
      
      // Create TypedDslModelClient directly, passing the model name and this client as an executor
      this.typedModelClients[cacheKey] = new TypedDslModelClient<T>(name, this);
      logger.debug(`[TypedDslClient] New TypedDslModelClient for "${cacheKey}" created and cached.`);
    } else {
      logger.debug(`[TypedDslClient] TypedDslModelClient for "${cacheKey}" found in cache.`);
    }
    return this.typedModelClients[cacheKey] as ITypedDslModelClient<T>;
  }

  /**
   * Execute DSL operation with type safety
   * Direct implementation that makes API calls without relying on DslClientImpl
   */
  async executeOperation<T>(
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
  ): Promise<T> {
    logger.debug(`[TypedDslClient executeOperation] Called for model: "${model}", operation: "${operation}"`, {
      data,
      filter,
      include,
      pagination,
      relationParams
    });

    // Build the request payload
    const payload = {
      model,
      operation,
      data,
      filter,
      include,
      pagination,
      relation: relationParams
    };
    
    // Log the payload for debugging
    logger.debug(`[TypedDslClient executeOperation] Payload:`, payload);

    logger.debug(`[TypedDslClient] Using endpoint ${this.apiEndpoint}`);

    // Execute the request directly
    const { data: responseData, error } = await useApi(this.apiEndpoint).post(payload);

    // Handle errors
    if (error) {
      logger.error(`[TypedDslClient] Error executing ${operation} operation on model ${model}`, { error });
      throw new Error(`Error executing ${operation} operation on model ${model}: ${error}`);
    }

    logger.debug(`[TypedDslClient] ${operation} operation on model ${model} completed successfully`, { responseData });

    return responseData as T;
  }
}

/**
 * Default typed DSL client instance
 * This is a singleton that no longer depends on DslClientImpl
 */
let typedDslClient: ITypedDslClient | null = null;

/**
 * Get the default typed DSL client instance
 */
export async function getTypedDslClient(): Promise<ITypedDslClient> {
  logger.debug(`[getTypedDslClient] function called.`);
  if (!typedDslClient) {
    logger.debug(`[getTypedDslClient] No global typedDslClient instance, creating new one.`);
    typedDslClient = new TypedDslClient();
    logger.debug(`[getTypedDslClient] Global typedDslClient instance created.`);
  } else {
    logger.debug(`[getTypedDslClient] Returning existing global typedDslClient instance.`);
  }
  return typedDslClient;
}
