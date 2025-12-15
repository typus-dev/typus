import { z } from 'zod';

// Helper to check if a value is valid JSON (basic check)
// Note: This checks if a string *is* JSON. For direct object validation,
// Zod's object/record schemas are typically used directly on the parsed body.
// We'll assume the body parser handles JSON parsing.

// Schema for creating a role (validates req.body)
export const createRoleSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Role name is required' })
           .min(3, { message: 'Role name must be at least 3 characters long' }),
    description: z.string({ required_error: 'Description is required' })
                  .min(5, { message: 'Description must be at least 5 characters long' }),
    // abilityRules should be an array of objects
    // Accepts array of any objects
    abilityRules: z.array(z.any(), { invalid_type_error: 'Ability rules must be an array' })
                   .optional(),
  }),
});

// Schema for updating a role (validates req.body and req.params)
export const updateRoleSchema = z.object({
  body: z.object({
    name: z.string()
           .min(3, { message: 'Role name must be at least 3 characters long' })
           .optional(),
    description: z.string()
                  .min(5, { message: 'Description must be at least 5 characters long' })
                  .optional(),
    // abilityRules should be an array of objects
    abilityRules: z.array(z.any(), { invalid_type_error: 'Ability rules must be an array' })
                   .optional(),
  }).partial().refine(data => Object.keys(data).length > 0, { // Ensure at least one field is being updated
      message: "At least one field (name, description, or abilityRules) must be provided for update",
      path: ["body"], // Associate error with the body object
  }),
  // Ensure ID in params is a number-like string
  params: z.object({
      id: z.string().refine(val => /^\d+$/.test(val), { message: "ID must be a positive integer string" })
  })
});

// Schema just for validating the ID parameter (validates req.params)
export const roleIdParamSchema = z.object({
    params: z.object({
        id: z.string().refine(val => /^\d+$/.test(val), { message: "ID must be a positive integer string" })
    })
});
