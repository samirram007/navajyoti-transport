import { Button } from '@/components/ui/button'
import { Home, SearchX } from 'lucide-react'

interface NotFoundPageProps {
  layout?: 'dashboard' | 'auth' | 'full'
}

export function NotFoundPage({ layout = 'full' }: NotFoundPageProps) {
  const goHome = layout === 'auth' ? '/login' : '/dashboard'

  const content = (
    <div className="flex flex-col items-center p-8 max-w-md text-center">
      <SearchX className="h-20 w-20 text-muted-foreground mb-6" />
      <h1 className="text-3xl font-bold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button variant="default" onClick={() => window.location.href = goHome}>
        <Home className="h-4 w-4 mr-2" /> {layout === 'auth' ? 'Back to Login' : 'Go to Dashboard'}
      </Button>
    </div>
  )

  if (layout === 'dashboard') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <SearchX className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground text-sm mb-4 text-center max-w-md">
          The page you're looking for doesn't exist.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          <Home className="h-4 w-4 mr-2" /> Dashboard
        </Button>
      </div>
    )
  }

  if (layout === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {content}
    </div>
  )
}
