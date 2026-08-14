import { createFileRoute } from '@tanstack/react-router'
import { RiderFeeCollectionReportPage } from '@/features/reports/pages/rider-fee-collection-report'

export const Route = createFileRoute('/_protected/reports/rider-fee-collection')({
  component: RiderFeeCollectionReportPage,
})
