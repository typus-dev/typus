/**
 * Types for DSL operations
 */

/**
 * DSL operation types
 */
export type DslOperationType = 'create' | 'read' | 'update' | 'delete';

/**
 * DSL operation request
 */
export interface DslOperationRequest {
    model: string;
    module?: string; // Module name for the model
    operation: DslOperationType;
    data?: any;
    filter?: any;
    include?: string[];
    pagination?: {
        page?: number;
        limit?: number;
    };
    relation?: {
        parentId: string | number;
        relationName: string;
    };
}

/**
 * DSL operation response
 */
export interface DslOperationResponse {
    data?: any;
    error?: {
        message: string;
        code: string;
    };
}

/**
 * DSL hook types
 */
export type DslHookType = 
    | 'beforeCreate' 
    | 'afterCreate' 
    | 'beforeRead' 
    | 'afterRead' 
    | 'beforeUpdate' 
    | 'afterUpdate' 
    | 'beforeDelete' 
    | 'afterDelete';

/**
 * DSL hook handler
 */
export type DslHookHandler = (data: any) => Promise<any> | any;
