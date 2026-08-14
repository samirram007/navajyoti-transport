import { z } from 'zod'

export const UserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be at most 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .optional()
    .or(z.literal('')),
  contactNo: z
    .string()
    .max(20, 'Contact number must be at most 20 characters')
    .regex(/^[+]?[\d\s\-()]{0,20}$/, 'Invalid contact number format')
    .optional()
    .or(z.literal('')),
  userType: z
    .string()
    .max(50, 'User type must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  status: z
    .string()
    .max(50, 'Status must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  emergencyContactNo: z
    .string()
    .max(20, 'Emergency contact must be at most 20 characters')
    .optional()
    .or(z.literal('')),
})

export type UserInput = z.infer<typeof UserSchema>
