import { z } from 'zod'

export const ExpenseHeadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  code: z
    .string()
    .max(50, 'Code must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  expense_group_id: z.coerce
    .number({ message: 'Expense group must be a number' })
    .positive('Expense group must be a positive number')
    .optional(),
})

export type ExpenseHeadInput = z.infer<typeof ExpenseHeadSchema>
