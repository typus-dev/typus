/**
 * SML (System Management Layer) - Type Definitions
 *
 * SML is a unified registry of system operations for AI discovery and execution.
 */

// ============================================================================
// Operations
// ============================================================================

export interface Operation {
  handler: (params: any, ctx: Context) => Promise<any>;
  schema: OperationSchema;
}

export interface OperationSchema {
  description: string;
  params?: Record<string, ParamSchema>;
  returns?: ReturnSchema;
}

export interface ParamSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'Date';
  required?: boolean;
  nullable?: boolean;
  description?: string;
  enum?: string[];
  items?: ParamSchema;
}

export interface ReturnSchema {
  type: string;
  fields?: Record<string, FieldSchema>;
}

export interface FieldSchema {
  type: string;
  required?: boolean;
  nullable?: boolean;
  unique?: boolean;
  primary?: boolean;
  description?: string;
}

// ============================================================================
// Events
// ============================================================================

export type EventType = 'system' | 'domain' | 'integration' | 'ui' | 'internal';

export interface EventSchema {
  description: string;
  type: EventType;
  payload?: Record<string, FieldSchema>;
}

// ============================================================================
// Context
// ============================================================================

export interface Context {
  // Tracing (required)
  traceId: string;
  requestId?: string;

  // User
  user?: {
    id: number;
    email: string;
    roles: string[];
  };

  // Session
  session?: {
    id: string;
    locale?: string;
    timezone?: string;
    ip?: string;
  };

  // Workflow
  workflow?: {
    id: string;
    executionId: string;
    stepIndex: number;
  };

  // Transaction
  tx?: TransactionContext;
}

export interface TransactionContext {
  id: string;
  prisma?: any;
}

// ============================================================================
// Registration
// ============================================================================

export type Visibility = 'public' | 'internal' | 'admin' | 'hidden';

export interface RegisterOptions {
  owner?: string;
  visibility?: Visibility;
}

// ============================================================================
// Meta (for AI introspection)
// ============================================================================

export interface MetaInfo {
  domains: string[];
  tree: DomainTree;
  models: string[];
  integrations: string[];
  events: string[];
  eventsDetailed: Record<string, EventSchema>;
  owners: Record<string, string>;
  visibilityMap: Record<string, Visibility>;
}

export type DomainTree = Record<string, DomainNode>;

export interface DomainNode {
  [key: string]: string[] | DomainNode;
}

// ============================================================================
// Resolution
// ============================================================================

export interface ResolveResult {
  exists: boolean;
  path: string[];
  domain: string;
  owner: string | null;
  schema: OperationSchema | null;
  visibility: Visibility;
  type: 'operation' | 'event' | 'namespace';
}

// ============================================================================
// Errors
// ============================================================================

export enum SmlErrorCode {
  NOT_FOUND = 'SML_NOT_FOUND',
  LOCKED = 'SML_LOCKED',
  VALIDATION = 'SML_VALIDATION',
  EXECUTION = 'SML_EXECUTION',
  PERMISSION = 'SML_PERMISSION',
  DUPLICATE = 'SML_DUPLICATE'
}

export class SmlError extends Error {
  constructor(
    message: string,
    public code: SmlErrorCode,
    public path?: string
  ) {
    super(message);
    this.name = 'SmlError';
  }
}
