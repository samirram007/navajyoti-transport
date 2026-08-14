import { createFileRoute } from '@tanstack/react-router'
import { MonthlyTrendReportPage } from '@/features/reports/pages/monthly-trend-report'

export const Route = createFileRoute('/_protected/reports/monthly-trend')({
  component: MonthlyTrendReportPage,
})
