import { createFileRoute } from '@tanstack/react-router'
import { SchoolFeeCollectionReportPage } from '@/features/reports/pages/school-fee-collection-report'

export const Route = createFileRoute('/_protected/reports/school-fee-collection')({
  component: SchoolFeeCollectionReportPage,
})
