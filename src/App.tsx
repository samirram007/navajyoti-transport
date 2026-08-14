import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { UserInitialValuesProvider } from '@/contexts/user-initial-values-context'
import { ErrorPage } from '@/components/ui/error-page'

const router = createRouter({
  routeTree,
  context: {},
  defaultErrorComponent: ({ error, reset }) => (
    <ErrorPage error={error} reset={reset} layout="full" />
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UserInitialValuesProvider>
            <RouterProvider router={router} />
          </UserInitialValuesProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
