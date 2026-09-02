import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SchoolFeeCollectionReportPage } from '@/features/reports/pages/school-fee-collection-report'

const schoolFeeCollectionSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  fiscal_year_id: z.coerce.number().optional(),
})

export type SchoolFeeCollectionSearchParams = z.infer<typeof schoolFeeCollectionSearchSchema>

export const Route = createFileRoute('/_protected/reports/school-fee-collection')({
  validateSearch: schoolFeeCollectionSearchSchema,
  component: SchoolFeeCollectionReportPage,
})
