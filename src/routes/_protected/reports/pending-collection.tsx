import { createFileRoute } from '@tanstack/react-router'
import { PendingCollectionReportPage } from '@/features/reports/pages/pending-collection-report'

export const Route = createFileRoute('/_protected/reports/pending-collection')({
  component: PendingCollectionReportPage,
})
