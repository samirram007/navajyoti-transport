import { createFileRoute } from '@tanstack/react-router'
import { CreditNotesReportPage } from '@/features/reports/pages/credit-notes-report'

export const Route = createFileRoute('/_protected/reports/credit-notes')({
  component: CreditNotesReportPage,
})
