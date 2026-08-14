import { z } from 'zod'

export const OrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  code: z
    .string()
    .max(50, 'Code must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  contactNo: z
    .string()
    .max(20, 'Contact number must be at most 20 characters')
    .regex(/^[+]?[\d\s\-()]{0,20}$/, 'Invalid contact number format')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be at most 255 characters')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(500, 'Address must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .max(255, 'Website must be at most 255 characters')
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
})

export type OrganizationInput = z.infer<typeof OrganizationSchema>
