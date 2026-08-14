import { createFileRoute } from '@tanstack/react-router'
import { FeesPage } from '@/features/fees/pages/fees-page'

export const Route = createFileRoute('/_protected/fees/')({
  component: FeesPage,
})
