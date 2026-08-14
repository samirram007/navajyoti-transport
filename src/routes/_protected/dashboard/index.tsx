import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/features/dashboard/pages/dashboard'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: DashboardPage,
})
