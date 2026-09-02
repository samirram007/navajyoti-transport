import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RiderFeeCollectionReportPage } from '@/features/reports/pages/rider-fee-collection-report'

const riderFeeCollectionSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  fiscal_year_id: z.coerce.number().optional(),
  school_id: z.coerce.number().optional(),
  search: z.string().optional(),
})

export type RiderFeeCollectionSearchParams = z.infer<typeof riderFeeCollectionSearchSchema>

export const Route = createFileRoute('/_protected/reports/rider-fee-collection')({
  validateSearch: riderFeeCollectionSearchSchema,
  component: RiderFeeCollectionReportPage,
})
