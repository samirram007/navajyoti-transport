import { createFileRoute, redirect } from '@tanstack/react-router'
import { DashboardLayout } from '@/layouts/dashboard-layout'
import { ErrorPage } from '@/components/ui/error-page'
import { NotFoundPage } from '@/components/ui/not-found-page'

export const Route = createFileRoute('/_protected')({
  beforeLoad: () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardLayout,
  errorComponent: ({ error, reset }) => (
    <DashboardLayout>
      <ErrorPage error={error} reset={reset} layout="dashboard" />
    </DashboardLayout>
  ),
  notFoundComponent: () => (
    <DashboardLayout>
      <NotFoundPage layout="dashboard" />
    </DashboardLayout>
  ),
})
