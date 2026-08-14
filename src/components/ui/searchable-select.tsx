import * as React from 'react'
import { Check, ChevronDown, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  label: string
  value: string | number
}

interface SearchableSelectProps {
  value?: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  error?: boolean
  allowClear?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
  loading = false,
  className,
  error,
  allowClear = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selected = options.find(o => String(o.value) === value)

  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Reset search when closing
  const close = React.useCallback(() => {
    setOpen(false)
    setSearch('')
  }, [])

  const handleSelect = (optValue: string | number) => {
    const strValue = String(optValue)
    if (allowClear && strValue === value) {
      onValueChange('')
    } else {
      onValueChange(strValue)
    }
    close()
  }

  const listRef = React.useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const first = listRef.current?.querySelector<HTMLElement>('[data-opt="0"]')
      first?.focus()
    }
  }

  const handleItemKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = listRef.current?.querySelector<HTMLElement>(`[data-opt="${idx + 1}"]`)
      next?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (idx === 0) {
        inputRef.current?.focus()
      } else {
        const prev = listRef.current?.querySelector<HTMLElement>(`[data-opt="${idx - 1}"]`)
        prev?.focus()
      }
    } else if (e.key === 'Escape') {
      close()
    }
  }

  // Escape key
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled || loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (!disabled && !loading) setOpen(prev => !prev)
        }}
        className={cn(
          'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-shadow duration-150',
          'hover:bg-background',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive ring-1 ring-destructive/30',
          !value && 'text-muted-foreground',
          loading && 'opacity-60',
          className
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        {loading ? (
          <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground/60" />
        ) : (
          <ChevronDown className={cn(
            'ml-2 h-4 w-4 shrink-0 transition-transform duration-150',
            open ? 'rotate-180 opacity-80' : 'opacity-50'
          )} />
        )}
      </button>

      {/* Transparent backdrop - catches clicks outside the dropdown */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => close()}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden"
          style={{ maxHeight: '320px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 shrink-0 bg-muted/40">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex h-8 w-full rounded-md bg-background px-2.5 text-sm outline-none ring-1 ring-border/50 focus:ring-primary/30 focus:ring-2 transition-all duration-150 placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="border-t border-border/50" />

          {/* Options */}
          <div ref={listRef} className="overflow-y-auto p-1 flex-1" role="listbox">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading options...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = String(opt.value) === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-opt={idx}
                    onClick={() => handleSelect(opt.value)}
                    onKeyDown={e => handleItemKeyDown(e, idx)}
                    className={cn(
                      'relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                      'focus:bg-accent focus:text-accent-foreground',
                      'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      'hover:bg-accent/70'
                    )}
                  >
                    <Check className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
