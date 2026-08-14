import { createFileRoute } from '@tanstack/react-router'
import { VehicleFeeCollectionReportPage } from '@/features/reports/pages/vehicle-fee-collection-report'

export const Route = createFileRoute('/_protected/reports/vehicle-fee-collection')({
  component: VehicleFeeCollectionReportPage,
})
