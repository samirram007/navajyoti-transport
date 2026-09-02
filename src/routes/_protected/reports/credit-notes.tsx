import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CreditNotesReportPage } from '@/features/reports/pages/credit-notes-report'

const creditNotesSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export type CreditNotesSearchParams = z.infer<typeof creditNotesSearchSchema>

export const Route = createFileRoute('/_protected/reports/credit-notes')({
  validateSearch: creditNotesSearchSchema,
  component: CreditNotesReportPage,
})
