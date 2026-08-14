import { z } from 'zod'

export const IncomeGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  code: z
    .string()
    .max(50, 'Code must be at most 50 characters')
    .optional()
    .or(z.literal('')),
})

export type IncomeGroupInput = z.infer<typeof IncomeGroupSchema>
