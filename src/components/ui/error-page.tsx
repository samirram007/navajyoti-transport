import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react'

interface ErrorPageProps {
  error?: Error
  reset?: () => void
  layout?: 'dashboard' | 'auth' | 'full'
}

export function ErrorPage({ error, reset, layout = 'full' }: ErrorPageProps) {
  const isAuth = layout === 'auth'

  if (layout === 'dashboard') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground text-sm mb-4 text-center max-w-md">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex gap-3">
          {reset && (
            <Button variant="default" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" /> Try again
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            <Home className="h-4 w-4 mr-2" /> Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center p-8 max-w-md text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
          <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
          <p className="text-muted-foreground mb-6">
            {error?.message || 'An error occurred on the login page. Please try again.'}
          </p>
          <div className="flex gap-3">
            {reset && (
              <Button variant="default" onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-2" /> Try again
              </Button>
            )}
            <Button variant="outline" onClick={() => window.location.href = '/login'}>
              <LogIn className="h-4 w-4 mr-2" /> Back to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Full-screen fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center p-8 max-w-md text-center">
        <AlertTriangle className="h-20 w-20 text-destructive mb-6" />
        <h1 className="text-3xl font-bold mb-2">Unexpected Error</h1>
        <p className="text-muted-foreground mb-2">
          {error?.message || 'Something went wrong.'}
        </p>
        <p className="text-xs text-muted-foreground mb-8">
          If this persists, please contact support.
        </p>
        <div className="flex gap-3">
          {reset && (
            <Button variant="default" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" /> Try again
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            <Home className="h-4 w-4 mr-2" /> Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
