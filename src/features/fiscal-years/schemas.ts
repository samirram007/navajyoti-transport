import { z } from 'zod'

export const FiscalYearSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  isCurrent: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  previousFiscalYearId: z.coerce.number().positive().optional(),
  nextFiscalYearId: z.coerce.number().positive().optional(),
})
// Refinement: endDate must be after startDate
.refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true
      return new Date(data.endDate) > new Date(data.startDate)
    },
    { message: 'End date must be after start date', path: ['endDate'] }
  )

export type FiscalYearInput = z.infer<typeof FiscalYearSchema>
