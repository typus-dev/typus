import { ILogger } from '@/core/logger/ILogger.js';
import { LoggerFactory } from '@/core/logger/LoggerFactory.js';

/**
 * Base class for all core components
 * Encapsulates common initialization
 */
export abstract class CoreBase {
  protected logger: ILogger;
  protected className: string;
  
  constructor() {
    // Initialize logger
    this.logger = LoggerFactory.getGlobalLogger();
    
    // Set class name for logging
    this.className = this.constructor.name;
    
    // Log initialization
    this.logger.info(`[${this.className}] Initialized`);
  }
}
