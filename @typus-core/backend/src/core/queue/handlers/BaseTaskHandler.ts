import { BaseService } from '@/core/base/BaseService';
import { ITaskExecutor, TaskSchema } from '../interfaces';

/**
 * Base task handler class
 * Provides common functionality for all task handlers in STARTER profile
 */
export abstract class BaseTaskHandler extends BaseService implements ITaskExecutor {
  /**
   * Get task schema - must be implemented by subclass
   */
  abstract getSchema(): TaskSchema;

  /**
   * Execute task - must be implemented by subclass
   */
  abstract execute(data: any): Promise<any>;

  /**
   * Validate task data against schema
   *
   * @param data - Task data to validate
   * @throws Error if validation fails
   */
  async validate(data: any): Promise<void> {
    const schema = this.getSchema();

    // Run custom validation if provided
    // Note: fields check is removed because normalize() may add missing fields
    // Each handler's custom validate() checks required fields after normalization
    if (schema.validate) {
      await schema.validate(data);
    }
  }

  /**
   * Optional cleanup method
   * Override in subclass if needed
   */
  async cleanup(): Promise<void> {
    // Default: no cleanup needed
  }
}
