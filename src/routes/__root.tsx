/* oxlint-disable react/only-export-components */
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from 'sonner'
import { ErrorPage } from '@/components/ui/error-page'
import { NotFoundPage } from '@/components/ui/not-found-page'

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: ({ error, reset }) => (
    <ErrorPage error={error} reset={reset} layout="full" />
  ),
  notFoundComponent: () => <NotFoundPage layout="full" />,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="top-right" richColors />
      <TanStackRouterDevtools />
    </>
  )
}
