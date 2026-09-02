import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { IncomeExpenseReportPage } from '@/features/reports/pages/income-expense-report'

const incomeExpenseSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  fiscal_year_id: z.coerce.number().optional(),
})

export type IncomeExpenseSearchParams = z.infer<typeof incomeExpenseSearchSchema>

export const Route = createFileRoute('/_protected/reports/income-expense')({
  validateSearch: incomeExpenseSearchSchema,
  component: IncomeExpenseReportPage,
})
