import { z } from 'zod'

export const ExpenseItemSchema = z.object({
  expense_group_id: z
    .union([z.number(), z.literal('')])
    .optional()
    .or(z.literal('')),
  expense_head_id: z
    .union([z.number(), z.literal('')])
    .optional()
    .or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  quantity: z.coerce.number().min(0).default(1),
  amount: z.coerce.number().min(0, 'Amount must be positive').default(0),
  total_amount: z.coerce.number().min(0).default(0),
})

export type ExpenseItemInput = z.infer<typeof ExpenseItemSchema>

export const ExpenseSchema = z.object({
  expense_no: z
    .string()
    .max(50, 'Expense number must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  voucher_no: z
    .string()
    .max(50, 'Voucher number must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  fiscal_year_id: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number({ message: 'Fiscal year must be a number' }).positive().optional()
  ),
  total_amount: z.coerce
    .number({ message: 'Amount must be a number' })
    .min(0, 'Amount must be 0 or greater')
    .default(0),
  payment_mode: z
    .string()
    .max(50, 'Payment mode must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  note: z
    .string()
    .max(1000, 'Note must be at most 1000 characters')
    .optional()
    .or(z.literal('')),
  status: z
    .string()
    .max(50, 'Status must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  expense_items: z.array(ExpenseItemSchema).optional().default([]),
})

export type ExpenseInput = z.infer<typeof ExpenseSchema>
