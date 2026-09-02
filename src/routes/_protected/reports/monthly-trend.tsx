import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { MonthlyTrendReportPage } from '@/features/reports/pages/monthly-trend-report'

const monthlyTrendSearchSchema = z.object({
  fiscal_year_ids: z.string().optional(),
  include_expenses: z.coerce.boolean().optional(),
})

export type MonthlyTrendSearchParams = z.infer<typeof monthlyTrendSearchSchema>

export const Route = createFileRoute('/_protected/reports/monthly-trend')({
  validateSearch: monthlyTrendSearchSchema,
  component: MonthlyTrendReportPage,
})
