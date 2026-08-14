import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthLayout } from '@/layouts/auth-layout'
import { ErrorPage } from '@/components/ui/error-page'
import { NotFoundPage } from '@/components/ui/not-found-page'

export const Route = createFileRoute('/_guest')({
  beforeLoad: () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AuthLayout,
  errorComponent: ({ error, reset }) => (
    <ErrorPage error={error} reset={reset} layout="auth" />
  ),
  notFoundComponent: () => (
    <NotFoundPage layout="auth" />
  ),
})
