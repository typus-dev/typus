import { IDslRelationClient } from './types';
import { ITypedDslModelClient, ITypedDslRelationClient } from './typed-client';

/**
 * Typed DSL relation client implementation
 */
export class TypedDslRelationClient<T, R> implements ITypedDslRelationClient<T, R> {
  /**
   * Underlying DSL relation client
   */
  private readonly relationClient: IDslRelationClient;

  /**
   * Parent model client
   */
  readonly parentModel: ITypedDslModelClient<T>;

  /**
   * Create a new typed DSL relation client
   */
  constructor(relationClient: IDslRelationClient, parentModel: ITypedDslModelClient<T>) {
    this.relationClient = relationClient;
    this.parentModel = parentModel;
  }

  /**
   * Get parent entity ID
   */
  get parentId(): number | string {
    return this.relationClient.parentId;
  }

  /**
   * Get relation name
   */
  get relationName(): string {
    return this.relationClient.relationName;
  }

  /**
   * Find related entities
   */
  async findMany(filter?: any, include?: string[], pagination?: { page: number, limit: number }): Promise<R[]> {
    return this.relationClient.findMany(filter, include, pagination) as Promise<R[]>;
  }

  /**
   * Create related entity
   */
  async create(data: Partial<R>, include?: string[]): Promise<R> {
    return this.relationClient.create(data, include) as Promise<R>;
  }

  /**
   * Connect entity to relation
   */
  async connect(targetId: number | string): Promise<T> {
    return this.relationClient.connect(targetId) as Promise<T>;
  }

  /**
   * Disconnect entity from relation
   */
  async disconnect(targetId: number | string): Promise<T> {
    return this.relationClient.disconnect(targetId) as Promise<T>;
  }
}
