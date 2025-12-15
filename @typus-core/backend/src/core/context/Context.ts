// src/core/context/Context.ts
import { v4 as uuidv4 } from 'uuid';

export class Context {
  readonly id: string;
  readonly startTime: Date;
  readonly data: Map<string, any>;
  
  constructor() {
    this.id = uuidv4();
    this.startTime = new Date();
    this.data = new Map<string, any>();
  }

  /**
   * Set a value in context
   */
  set(key: string, value: any): void {
    this.data.set(key, value);
  }

  /**
   * Get a value from context
   */
  get<T>(key: string): T | undefined {
    return this.data.get(key) as T;
  }

  /**
   * Check if a key exists in context
   */
  has(key: string): boolean {
    return this.data.has(key);
  }

  /**
   * Get the duration since context creation
   */
  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Get a snapshot of all context data
   */
  getSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {
      contextId: this.id,
      startTime: this.startTime.toISOString(),
      duration: this.getDuration(),
    };

    this.data.forEach((value, key) => {
      snapshot[key] = value;
    });

    return snapshot;
  }
}