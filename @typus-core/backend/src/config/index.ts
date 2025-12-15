/**
 * Centralized configuration exports
 * Use this file to import all configuration values
 */

// Import configurations
import env from './env.config.js';
import appConfig from './app.config.js';
import { config as dbConfig } from './db.config.js';

// Export configuration types
export type { DbConfig, DbEnv } from './db.config.js';

// Re-export individual configurations
export { env };
export { default as appConfig } from './app.config.js';
export { config as dbConfig } from './db.config.js';

/**
 * Configuration namespace
 * Provides access to all configuration values
 */
export const config = {
  // Configuration objects
  env,
  app: appConfig,
  db: dbConfig,
  
  // Helper method to get any config value with dot notation
  // Example: config.get('app.port') or config.get('env.JWT_SECRET')
  get(path: string): any {
    const parts = path.split('.');
    let current: any = { env, app: appConfig, db: dbConfig };
    
    for (const part of parts) {
      if (current[part] === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }
};

export default config;
