/**
 * SML (System Management Layer) - Core Registry
 *
 * Unified interface for AI to discover and execute system operations.
 *
 * Usage:
 *   SML.register('actions.crm.contact.create', { handler, schema }, { owner: 'plugin:crm' });
 *   SML.lock();
 *
 *   const ops = SML.list('actions.crm');
 *   const schema = SML.describe('actions.crm.contact.create');
 *   const result = await SML.execute('actions.crm.contact.create', params, ctx);
 */

import {
  Operation,
  OperationSchema,
  EventSchema,
  Context,
  RegisterOptions,
  Visibility,
  MetaInfo,
  DomainTree,
  ResolveResult,
  SmlError,
  SmlErrorCode
} from './types';

class SMLRegistry {
  private registry = new Map<string, Operation>();
  private eventRegistry = new Map<string, EventSchema>();
  private owners = new Map<string, string>();
  private visibilityMap = new Map<string, Visibility>();
  private locked = false;

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Register an operation at the given path.
   */
  register(path: string, op: Operation, options?: RegisterOptions): void {
    if (this.locked) {
      throw new SmlError('Registry is locked', SmlErrorCode.LOCKED, path);
    }

    if (this.registry.has(path)) {
      throw new SmlError(`Operation already exists: ${path}`, SmlErrorCode.DUPLICATE, path);
    }

    this.registry.set(path, op);

    if (options?.owner) {
      this.owners.set(path, options.owner);
    }

    this.visibilityMap.set(path, options?.visibility ?? 'public');
  }

  /**
   * Declare an event that can be emitted/subscribed.
   */
  declareEvent(path: string, schema: EventSchema, options?: RegisterOptions): void {
    if (this.locked) {
      throw new SmlError('Registry is locked', SmlErrorCode.LOCKED, path);
    }

    if (this.eventRegistry.has(path)) {
      throw new SmlError(`Event already exists: ${path}`, SmlErrorCode.DUPLICATE, path);
    }

    this.eventRegistry.set(path, schema);

    if (options?.owner) {
      this.owners.set(`event:${path}`, options.owner);
    }
  }

  /**
   * Lock the registry. No more registrations allowed after this.
   */
  lock(): void {
    this.locked = true;
  }

  /**
   * Check if registry is locked.
   */
  isLocked(): boolean {
    return this.locked;
  }

  // ==========================================================================
  // Navigation
  // ==========================================================================

  /**
   * List children at the given path.
   * @param path Optional path. If omitted, returns top-level domains.
   */
  list(path?: string): string[] {
    if (!path) {
      // Return unique top-level domains
      const domains = new Set<string>();
      for (const key of this.registry.keys()) {
        const domain = key.split('.')[0];
        domains.add(domain);
      }
      return Array.from(domains).sort();
    }

    const prefix = path + '.';
    const children = new Set<string>();

    for (const key of this.registry.keys()) {
      if (key.startsWith(prefix)) {
        const remainder = key.slice(prefix.length);
        const child = remainder.split('.')[0];
        children.add(child);
      }
    }

    return Array.from(children).sort();
  }

  /**
   * Check if a path exists (operation or namespace).
   */
  has(path: string): boolean {
    // Check if exact operation exists
    if (this.registry.has(path)) {
      return true;
    }

    // Check if it's a namespace (has children)
    const prefix = path + '.';
    for (const key of this.registry.keys()) {
      if (key.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve a path to full information.
   */
  resolve(path: string): ResolveResult | null {
    const parts = path.split('.');
    const domain = parts[0];

    // Check if exact operation
    if (this.registry.has(path)) {
      const op = this.registry.get(path)!;
      return {
        exists: true,
        path: parts,
        domain,
        owner: this.owners.get(path) ?? null,
        schema: op.schema,
        visibility: this.visibilityMap.get(path) ?? 'public',
        type: 'operation'
      };
    }

    // Check if event
    if (this.eventRegistry.has(path)) {
      return {
        exists: true,
        path: parts,
        domain: 'events',
        owner: this.owners.get(`event:${path}`) ?? null,
        schema: null,
        visibility: 'public',
        type: 'event'
      };
    }

    // Check if namespace
    if (this.has(path)) {
      return {
        exists: true,
        path: parts,
        domain,
        owner: null,
        schema: null,
        visibility: 'public',
        type: 'namespace'
      };
    }

    return null;
  }

  // ==========================================================================
  // Introspection
  // ==========================================================================

  /**
   * Get operation schema by path.
   */
  describe(path: string): OperationSchema | null {
    const op = this.registry.get(path);
    return op?.schema ?? null;
  }

  /**
   * Get event schema by path.
   */
  describeEvent(path: string): EventSchema | null {
    return this.eventRegistry.get(path) ?? null;
  }

  /**
   * Get full meta information (includes internal operations).
   * Use getPublicMeta() for AI-facing discovery.
   */
  get meta(): MetaInfo {
    return {
      domains: this.list(),
      tree: this.buildTree(),
      models: this.extractModels(),
      integrations: this.extractIntegrations(),
      events: Array.from(this.eventRegistry.keys()),
      eventsDetailed: Object.fromEntries(this.eventRegistry),
      owners: Object.fromEntries(this.owners),
      visibilityMap: Object.fromEntries(this.visibilityMap)
    };
  }

  /**
   * Get public meta for AI discovery.
   * Filters out internal/hidden operations - only shows public/admin.
   */
  getPublicMeta(includeAdmin: boolean = false): MetaInfo {
    const allowedVisibility: Visibility[] = includeAdmin
      ? ['public', 'admin']
      : ['public'];

    return {
      domains: this.listPublic(allowedVisibility),
      tree: this.buildTree(allowedVisibility),
      models: this.extractModels(allowedVisibility),
      integrations: this.extractIntegrations(),
      events: Array.from(this.eventRegistry.keys()),
      eventsDetailed: Object.fromEntries(this.eventRegistry),
      owners: {},  // Don't expose ownership to public
      visibilityMap: {}  // Don't expose visibility map to public
    };
  }

  /**
   * List only public domains.
   */
  private listPublic(allowedVisibility: Visibility[]): string[] {
    const domains = new Set<string>();
    for (const [path, _] of this.registry.entries()) {
      const visibility = this.visibilityMap.get(path) ?? 'public';
      if (allowedVisibility.includes(visibility)) {
        const domain = path.split('.')[0];
        domains.add(domain);
      }
    }
    return Array.from(domains).sort();
  }

  // ==========================================================================
  // Execution
  // ==========================================================================

  /**
   * Execute an operation by path.
   */
  async execute<T = any>(path: string, params?: any, ctx?: Context): Promise<T> {
    const op = this.registry.get(path);

    if (!op) {
      throw new SmlError(`Operation not found: ${path}`, SmlErrorCode.NOT_FOUND, path);
    }

    // Check visibility
    const visibility = this.visibilityMap.get(path) ?? 'public';
    if (!this.checkVisibility(visibility, ctx)) {
      throw new SmlError(`Permission denied: ${path}`, SmlErrorCode.PERMISSION, path);
    }

    // Validate params against schema
    const validationErrors = this.validateParams(params, op.schema, path);
    if (validationErrors.length > 0) {
      throw new SmlError(
        `Validation failed: ${validationErrors.join('; ')}`,
        SmlErrorCode.VALIDATION,
        path
      );
    }

    // Create default context if not provided
    const context: Context = ctx ?? { traceId: this.generateTraceId() };

    try {
      return await op.handler(params, context);
    } catch (error) {
      throw new SmlError(
        `Execution failed: ${path} - ${(error as Error).message}`,
        SmlErrorCode.EXECUTION,
        path
      );
    }
  }

  /**
   * Validate params against operation schema.
   */
  private validateParams(params: any, schema: OperationSchema, path: string): string[] {
    const errors: string[] = [];

    if (!schema.params) {
      return errors;
    }

    const providedParams = params ?? {};

    for (const [paramName, paramSchema] of Object.entries(schema.params)) {
      const value = providedParams[paramName];

      // Check required
      if (paramSchema.required && (value === undefined || value === null)) {
        errors.push(`Missing required parameter: ${paramName}`);
        continue;
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const typeError = this.validateType(paramName, value, paramSchema.type);
      if (typeError) {
        errors.push(typeError);
      }

      // Enum validation
      if (paramSchema.enum && !paramSchema.enum.includes(value)) {
        errors.push(`Invalid value for ${paramName}: must be one of [${paramSchema.enum.join(', ')}]`);
      }
    }

    return errors;
  }

  /**
   * Validate a single value against expected type.
   */
  private validateType(paramName: string, value: any, expectedType: string): string | null {
    const actualType = typeof value;

    switch (expectedType) {
      case 'string':
        if (actualType !== 'string') {
          return `Parameter ${paramName}: expected string, got ${actualType}`;
        }
        break;
      case 'number':
        if (actualType !== 'number' || isNaN(value)) {
          return `Parameter ${paramName}: expected number, got ${actualType}`;
        }
        break;
      case 'boolean':
        if (actualType !== 'boolean') {
          return `Parameter ${paramName}: expected boolean, got ${actualType}`;
        }
        break;
      case 'object':
        if (actualType !== 'object' || Array.isArray(value) || value === null) {
          return `Parameter ${paramName}: expected object, got ${Array.isArray(value) ? 'array' : actualType}`;
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return `Parameter ${paramName}: expected array, got ${actualType}`;
        }
        break;
      case 'Date':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return `Parameter ${paramName}: expected Date or date string, got ${actualType}`;
        }
        break;
      // For complex types like User, User[], etc. - skip validation
      default:
        break;
    }

    return null;
  }

  // ==========================================================================
  // Ownership
  // ==========================================================================

  /**
   * Get owner of an operation or event.
   */
  getOwner(path: string): string | null {
    return this.owners.get(path) ?? this.owners.get(`event:${path}`) ?? null;
  }

  /**
   * Get all paths owned by a specific owner.
   */
  getByOwner(owner: string): string[] {
    const paths: string[] = [];
    for (const [path, o] of this.owners.entries()) {
      if (o === owner) {
        paths.push(path.replace('event:', ''));
      }
    }
    return paths.sort();
  }

  /**
   * Get visibility of an operation.
   */
  getVisibility(path: string): Visibility {
    return this.visibilityMap.get(path) ?? 'public';
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Build hierarchical tree of operations.
   * @param visibilityFilter - If provided, only include operations with matching visibility
   *
   * Example output:
   * {
   *   auth: {
   *     users: ['current', 'byRole', 'byId'],
   *     _ops: ['check', 'isAuthenticated']
   *   },
   *   bridge: {
   *     notify: { email: ['send'], ... }
   *   },
   *   events: ['emit', 'subscribe', ...]
   * }
   */
  private buildTree(visibilityFilter?: Visibility[]): DomainTree {
    const tree: DomainTree = {};

    for (const path of this.registry.keys()) {
      // Check visibility filter
      if (visibilityFilter) {
        const visibility = this.visibilityMap.get(path) ?? 'public';
        if (!visibilityFilter.includes(visibility)) {
          continue;
        }
      }

      const parts = path.split('.');
      let current: any = tree;

      // Navigate/create all intermediate nodes
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      // Last part is the operation name - add to _ops array at current level
      const opName = parts[parts.length - 1];
      if (!current._ops) {
        current._ops = [];
      }
      current._ops.push(opName);
    }

    // Optimize tree structure: if a node only has _ops, convert to array
    return this.optimizeTree(tree);
  }

  /**
   * Optimize tree by converting nodes with only _ops to arrays.
   */
  private optimizeTree(node: any): DomainTree {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) {
      return node;
    }

    const keys = Object.keys(node);

    // If node only has _ops, return the array directly
    if (keys.length === 1 && keys[0] === '_ops') {
      return node._ops;
    }

    const result: DomainTree = {};

    for (const [key, value] of Object.entries(node)) {
      if (key === '_ops') {
        // Keep _ops as is if there are other keys
        result[key] = value as any;
      } else {
        result[key] = this.optimizeTree(value);
      }
    }

    return result;
  }

  /**
   * Extract model names from data.models.* operations.
   * @param visibilityFilter - If provided, only include models with matching visibility
   */
  private extractModels(visibilityFilter?: Visibility[]): string[] {
    const models: string[] = [];
    const prefix = 'data.models.';

    for (const path of this.registry.keys()) {
      if (path.startsWith(prefix)) {
        // Check visibility filter
        if (visibilityFilter) {
          const visibility = this.visibilityMap.get(path) ?? 'public';
          if (!visibilityFilter.includes(visibility)) {
            continue;
          }
        }

        const remainder = path.slice(prefix.length);
        const model = remainder.split('.')[0];
        if (!models.includes(model)) {
          models.push(model);
        }
      }
    }

    return models.sort();
  }

  private extractIntegrations(): string[] {
    const integrations: string[] = [];
    const prefix = 'bridge.notify.';

    for (const path of this.registry.keys()) {
      if (path.startsWith(prefix)) {
        const remainder = path.slice(prefix.length);
        const integration = remainder.split('.')[0];
        if (!integrations.includes(integration)) {
          integrations.push(integration);
        }
      }
    }

    return integrations.sort();
  }

  private checkVisibility(visibility: Visibility, ctx?: Context): boolean {
    switch (visibility) {
      case 'public':
        return true;
      case 'internal':
        return ctx?.user !== undefined || ctx?.workflow !== undefined;
      case 'admin':
        return ctx?.user?.roles?.includes('admin') ?? false;
      case 'hidden':
        return false;
      default:
        return false;
    }
  }

  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ==========================================================================
  // Debug / Testing
  // ==========================================================================

  /**
   * Get total count of registered operations.
   */
  get size(): number {
    return this.registry.size;
  }

  /**
   * Get total count of registered events.
   */
  get eventCount(): number {
    return this.eventRegistry.size;
  }

  /**
   * Reset registry (for testing only).
   */
  _reset(): void {
    this.registry.clear();
    this.eventRegistry.clear();
    this.owners.clear();
    this.visibilityMap.clear();
    this.locked = false;
  }
}

// Export singleton instance
export const SML = new SMLRegistry();
