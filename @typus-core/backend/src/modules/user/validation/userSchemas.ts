// src/modules/user/validation/userSchemas.ts
import { z } from 'zod';

export const userSearchSchema = z.object({
  body: z.object({
    search: z.string().nullable().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    sortBy: z.string().nullable().optional(),
    orderBy: z.enum(['asc', 'desc']).optional()
  })
});


export const userCreateSchema = z.object({
  body: z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phoneNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  dateOfBirth: z.union([z.string(), z.date()]).nullable().optional().transform(value => value === '' ? null : value),
  role: z.string().nullable().optional(),
  isApproved: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
  isTwoFactorEnabled: z.boolean().optional(),
  twoFactorMethod: z.enum(['email', 'sms', 'totp']).nullable().optional(),

  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),

})
.partial()
.refine(data => Object.keys(data).length > 0, {
  message: "Request body for create cannot be empty",
  path: ["body"],
})
});


export const userUpdateSchema = z.object({
  body: z.object({
    firstName: z.string().nullable().optional(),
    middleName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    userName: z.string().nullable().optional(),
    email: z.string().email(),
    password: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),

    dateOfBirth: z.union([z.string(), z.date()]).nullable().optional(),
    role: z.string().nullable().optional(),

    isApproved: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    isAdmin: z.boolean().optional(),
    isEmailVerified: z.boolean().optional(),
    isTwoFactorEnabled: z.boolean().optional(),
    twoFactorMethod: z.enum(['email', 'sms', 'totp']).nullable().optional(),

    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),

  })
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    message: "Request body for update cannot be empty",
    path: ["body"],
  })
});


export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().refine(val => /^\d+$/.test(val), { message: "User ID must be a number" })
  })
});

export type UserCreateDTO = z.infer<typeof userCreateSchema.shape.body>;
export type UserUpdateDTO = z.infer<typeof userUpdateSchema.shape.body>;