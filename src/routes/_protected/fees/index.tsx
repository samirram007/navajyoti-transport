import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FeesPage } from '@/features/fees/pages/fees-page'
import { paginationSearchSchema } from '@/lib/search-schemas'

const feesSearchSchema = paginationSearchSchema.extend({
  paymentMode: z.string().optional(),
  status: z.string().optional(),
})

export type FeesSearchParams = z.infer<typeof feesSearchSchema>

export const Route = createFileRoute('/_protected/fees/')({
  validateSearch: feesSearchSchema,
  component: FeesPage,
})
