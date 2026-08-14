import { z } from 'zod'

export const FeeItemMonthSchema = z.object({
  month_id: z.number(),
  amount: z.number().default(0),
  is_waived: z.boolean().default(false),
})
export type FeeItemMonthInput = z.infer<typeof FeeItemMonthSchema>

export const FeeItemSchema = z.object({
  fee_head_id: z.number().optional(),
  quantity: z.number().min(0).default(0),
  amount: z.number().min(0, 'Amount must be positive'),
  total_amount: z.number().min(0),
  months: z.array(FeeItemMonthSchema).default([]),
})
export type FeeItemInput = z.infer<typeof FeeItemSchema>

export const FeeCreateSchema = z.object({
  rider_id: z.number({ message: 'Please select a rider' }),
  fee_date: z.string().min(1, 'Date is required'),
  fiscal_year_id: z.number().optional(),
  payment_mode: z.string().optional(),
  paid_amount: z.number().min(0, 'Paid amount must be positive').default(0),
  total_amount: z.number().min(0).default(0),
  balance_amount: z.number().default(0),
  note: z.string().optional(),
  payment_details: z.record(z.string(), z.string()).optional(),
  fee_items: z.array(FeeItemSchema).min(1, 'At least one fee item is required'),
})
export type FeeCreateInput = z.infer<typeof FeeCreateSchema>
