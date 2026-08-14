import { createFileRoute } from '@tanstack/react-router'
import { IncomeExpenseReportPage } from '@/features/reports/pages/income-expense-report'

export const Route = createFileRoute('/_protected/reports/income-expense')({
  component: IncomeExpenseReportPage,
})
