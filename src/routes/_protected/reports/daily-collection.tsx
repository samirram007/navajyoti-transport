import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DailyCollectionReportPage } from '@/features/reports/pages/daily-collection-report'

const dailyCollectionSearchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export type DailyCollectionSearchParams = z.infer<typeof dailyCollectionSearchSchema>

export const Route = createFileRoute('/_protected/reports/daily-collection')({
  validateSearch: dailyCollectionSearchSchema,
  component: DailyCollectionReportPage,
})
