import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { VehicleFeeCollectionReportPage } from '@/features/reports/pages/vehicle-fee-collection-report'

const vehicleFeeCollectionSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  fiscal_year_id: z.coerce.number().optional(),
  search: z.string().optional(),
})

export type VehicleFeeCollectionSearchParams = z.infer<typeof vehicleFeeCollectionSearchSchema>

export const Route = createFileRoute('/_protected/reports/vehicle-fee-collection')({
  validateSearch: vehicleFeeCollectionSearchSchema,
  component: VehicleFeeCollectionReportPage,
})
