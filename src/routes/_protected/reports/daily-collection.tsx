import { createFileRoute } from '@tanstack/react-router'
import { DailyCollectionReportPage } from '@/features/reports/pages/daily-collection-report'

export const Route = createFileRoute('/_protected/reports/daily-collection')({
  component: DailyCollectionReportPage,
})
