import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PendingCollectionReportPage } from '@/features/reports/pages/pending-collection-report'

const pendingCollectionSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  fiscal_year_id: z.coerce.number().optional(),
  month_id: z.coerce.number().optional(),
  school_id: z.coerce.number().optional(),
  search: z.string().optional(),
})

export type PendingCollectionSearchParams = z.infer<typeof pendingCollectionSearchSchema>

export const Route = createFileRoute('/_protected/reports/pending-collection')({
  validateSearch: pendingCollectionSearchSchema,
  component: PendingCollectionReportPage,
})
