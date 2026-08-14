import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface PageHeaderProps {
  title: string
  onAdd?: () => void
  addLabel?: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, onAdd, addLabel, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onAdd && (
          <Button onClick={onAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {addLabel || `Add ${title}`}
          </Button>
        )}
      </div>
    </div>
  )
}
