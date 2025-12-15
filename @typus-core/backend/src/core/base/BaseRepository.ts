// src/core/base/BaseRepository.ts
import { CoreBase } from './CoreBase';

export abstract class BaseRepository<T> extends CoreBase {
  protected prisma: any; 
  
  constructor() {
    super();
    this.prisma = global.prisma;
  }

  /**
   * Create an entity
   */
  abstract create(data: Partial<T>): Promise<T>;
  
  /**
   * Find entity by ID
   */
  abstract findById(id: string | number): Promise<T | null>;
  
  /**
   * Find all entities
   */
  abstract findAll(params?: any): Promise<T[]>;
  
  /**
   * Update an entity
   */
  abstract update(id: string | number, data: Partial<T>): Promise<T>;
  
  /**
   * Delete an entity
   */
  abstract delete(id: string | number): Promise<boolean>;

  /**
   * Log repository action
   */
  protected logAction(action: string, details?: any): void {
    this.logger.info(`${this.className}.${action}`, details);
  }
}
