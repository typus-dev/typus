import { getTypedDslClient } from './TypedDslClient';
import { logger } from '@/core/logging/logger';

/**
 * Initialize DSL client
 */
export async function initDslClient(): Promise<void> {
  const typedClient = await getTypedDslClient();
  await typedClient.init();
  logger.debug(`[DSL] DSL client initialized.`);
}


/**
 * Type-safe proxy for accessing any model
 * This creates model clients on demand without considering modules
 */
export const DSL = new Proxy({} as Record<string, any>, {
  get(target, modelName: string) {
    logger.debug(`[DSL Proxy] get() called for modelName: "${modelName}"`);
    if (typeof modelName !== 'string') {
      logger.debug(`[DSL Proxy] modelName is not a string, returning undefined.`);
      return undefined;
    }
    
    if (!target[modelName]) {
      logger.debug(`[DSL Proxy] No client found for "${modelName}" in target cache, creating new client.`);
      
      // Create typed client for model on demand
      const modelClient = {
        // Add getMetadata method
        async getMetadata(): Promise<any> {
          logger.debug(`[DSL Proxy Client for ${modelName}] getMetadata() called`);
          const typedClient = await getTypedDslClient();
          // Do not pass module
          return typedClient.getModel(modelName).getMetadata();
        },
        
        async findById(id: number | string, include?: string[]): Promise<any> {
          logger.debug(`[DSL Proxy Client for ${modelName}] findById() called`, { id, include });
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting TypedDslClient...`);
          const typedClient = await getTypedDslClient();
          
          // Do not pass module
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting model from TypedDslClient`);
          return typedClient.getModel(modelName).findById(id, include);
        },
        
        async findMany(filter?: any, include?: string[], pagination?: { page?: number, limit?: number, orderBy?: any }): Promise<any[]> {
          logger.debug(`[DSL Proxy Client for ${modelName}] findMany() called`, { filter, include, pagination });
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting TypedDslClient...`);
          const typedClient = await getTypedDslClient();
          
          // Do not pass module
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting model from TypedDslClient`);
          return typedClient.getModel(modelName).findMany(filter, include, pagination);
        },
        
        async create(data: any, include?: string[]): Promise<any> {
          logger.debug(`[DSL Proxy Client for ${modelName}] create() called`, { data, include });
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting TypedDslClient...`);
          const typedClient = await getTypedDslClient();
          
          // Do not pass module
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting model from TypedDslClient`);
          return typedClient.getModel(modelName).create(data, include);
        },
        
        async update(id: number | string, data: any, include?: string[]): Promise<any> {
          logger.debug(`[DSL Proxy Client for ${modelName}] update() called`, { id, data, include });
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting TypedDslClient...`);
          const typedClient = await getTypedDslClient();
          
          // Do not pass module
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting model from TypedDslClient`);
          return typedClient.getModel(modelName).update(id, data, include);
        },
        
        async delete(id: number | string): Promise<any> {
          logger.debug(`[DSL Proxy Client for ${modelName}] delete() called`, { id });
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting TypedDslClient...`);
          const typedClient = await getTypedDslClient();
          
          // Do not pass module
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting model from TypedDslClient`);
          return typedClient.getModel(modelName).delete(id);
        },

        async count(filter?: any): Promise<number> {
          logger.debug(`[DSL Proxy Client for ${modelName}] count() called`, { filter });
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting TypedDslClient...`);
          const typedClient = await getTypedDslClient();
          
          // Do not pass module
          logger.debug(`[DSL Proxy Client for ${modelName}] Getting model from TypedDslClient`);
          return typedClient.getModel(modelName).count(filter);
        }
      };
      
      // Save the client in the target cache
      target[modelName] = modelClient;
      
      logger.debug(`[DSL Proxy] New client for "${modelName}" created and cached.`);
    } else {
      logger.debug(`[DSL Proxy] Client for "${modelName}" found in cache.`);
    }
    
    return target[modelName];
  }
});
