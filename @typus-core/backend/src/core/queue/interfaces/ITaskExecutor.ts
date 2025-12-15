/**
 * Task executor interface for handlers and plugins
 * Provides a unified contract for task execution across STARTER and FULL profiles
 */

/**
 * Task schema definition
 * Describes the structure and validation rules for a task type
 */
export interface TaskSchema {
  /**
   * Task type identifier (e.g., 'email_notification_task', 'cache_generation_task')
   */
  type: string;

  /**
   * List of required and optional fields for this task type
   */
  fields: string[];

  /**
   * Optional validation function for task data
   * @param data - Task data to validate
   * @throws Error if validation fails
   */
  validate?: (data: any) => void | Promise<void>;

  /**
   * Optional normalization function to transform task data before execution
   * @param data - Raw task data
   * @returns Normalized task data
   */
  normalize?: (data: any) => any;
}

/**
 * Task executor interface
 * Implemented by both handlers (STARTER) and plugins (FULL)
 */
export interface ITaskExecutor {
  /**
   * Get the schema definition for this task type
   * @returns Task schema with type, fields, and optional validation
   */
  getSchema(): TaskSchema;

  /**
   * Validate task data against schema
   * @param data - Task data to validate
   * @throws Error if validation fails
   */
  validate(data: any): Promise<void>;

  /**
   * Execute the task with provided data
   * @param data - Task data to process
   * @returns Execution result (can be any type depending on task)
   */
  execute(data: any): Promise<any>;

  /**
   * Optional cleanup method called after task execution
   * Use for releasing resources, closing connections, etc.
   */
  cleanup?(): Promise<void>;
}
