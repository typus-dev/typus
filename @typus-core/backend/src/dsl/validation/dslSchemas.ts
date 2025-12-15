import { z } from 'zod';

/**
 * Schema for DSL operation
 */
export const dslOperationSchema = z.object({
    body: z.object({
        model: z.string({
            required_error: "Model name is required"
        }),
        module: z.string().optional(), // Module name is optional
        operation: z.enum(['create', 'read', 'update', 'delete', 'count'], {
            required_error: "Operation must be one of: create, read, update, delete, count"
        }),
        data: z.any().optional(),
        filter: z.any().optional(),
        include: z.array(z.string()).optional(),
        pagination: z.object({
            page: z.number().positive().optional(),
            limit: z.number().positive().optional(),
            orderBy: z.any().optional() 
        }).optional(),
        relation: z.object({
            parentId: z.union([z.string(), z.number()]),
            relationName: z.string()
        }).optional()
    })
});

/**
 * Schema for relation parameters
 */
export const relationParamsSchema = z.object({
    id: z.union([z.string(), z.number()]),
    relation: z.string()
});

/**
 * Type for DSL operation request schema
 */
export type DslOperationRequestSchema = z.infer<typeof dslOperationSchema.shape.body>;

/**
 * Type for relation parameters
 */
export type RelationParamsSchema = z.infer<typeof relationParamsSchema>;
