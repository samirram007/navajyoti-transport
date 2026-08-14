/* oxlint-disable react/only-export-components */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, LayoutDashboard, Truck, Wallet, Receipt, Building2, Settings, Users, School, ParkingCircle, CalendarDays, PiggyBank, UserCog, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuicklaunchItem {
  id: string
  label: string
  description: string
  icon: LucideIcon
  href: string
  category: string
}

const items: QuicklaunchItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview & statistics', icon: LayoutDashboard, href: '/dashboard', category: 'Overview' },
  { id: 'riders', label: 'Riders', description: 'Manage student riders', icon: Users, href: '/riders', category: 'Transport' },
  { id: 'vehicles', label: 'Vehicles', description: 'Manage transport vehicles', icon: Truck, href: '/vehicles', category: 'Transport' },
  { id: 'vehicle-types', label: 'Vehicle Types', description: 'Vehicle type categories', icon: Truck, href: '/vehicle-types', category: 'Transport' },
  { id: 'slots', label: 'Slots', description: 'Time slots & routes', icon: ParkingCircle, href: '/slots', category: 'Transport' },
  { id: 'fees', label: 'Fee Collections', description: 'Manage fee collections', icon: Wallet, href: '/fees', category: 'Fees' },
  { id: 'fee-heads', label: 'Fee Heads', description: 'Fee head categories', icon: PiggyBank, href: '/fee-heads', category: 'Fees' },
  { id: 'income-groups', label: 'Income Groups', description: 'Income group categories', icon: Wallet, href: '/income-groups', category: 'Fees' },
  { id: 'fiscal-years', label: 'Fiscal Years', description: 'Fiscal year periods', icon: CalendarDays, href: '/fiscal-years', category: 'Fees' },
  { id: 'expenses', label: 'Expenses', description: 'Track expenses', icon: Receipt, href: '/expenses', category: 'Expenses' },
  { id: 'expense-groups', label: 'Expense Groups', description: 'Expense group categories', icon: Receipt, href: '/expense-groups', category: 'Expenses' },
  { id: 'expense-heads', label: 'Expense Heads', description: 'Expense head categories', icon: Receipt, href: '/expense-heads', category: 'Expenses' },
  { id: 'schools', label: 'Schools', description: 'Manage schools', icon: School, href: '/schools', category: 'Organization' },
  { id: 'organizations', label: 'Organizations', description: 'Manage organizations', icon: Building2, href: '/organizations', category: 'Organization' },
  { id: 'users', label: 'Users', description: 'Manage system users', icon: UserCog, href: '/users', category: 'Settings' },
  { id: 'settings', label: 'Settings', description: 'App configuration', icon: Settings, href: '/settings', category: 'Settings' },
]

interface QuicklaunchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Quicklaunch({ open, onOpenChange }: QuicklaunchProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const filtered = query.trim()
    ? items.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      )
    : items

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSelect = useCallback((item: QuicklaunchItem) => {
    onOpenChange(false)
    navigate({ to: item.href })
  }, [navigate, onOpenChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      handleSelect(filtered[selectedIndex])
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  // Group results by category
  const grouped = filtered.reduce<Record<string, QuicklaunchItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  if (!open) return null

  let globalIndex = -1

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
        className="fixed left-[50%] top-[15%] z-50 w-full max-w-lg translate-x-[-50%]"
      >
        <div className="bg-popover border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages, actions, or resources..."
              aria-label="Search pages"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-14 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">ESC</span>
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
              </div>
            ) : (
              Object.entries(grouped).map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  {categoryItems.map(item => {
                    globalIndex++
                    const idx = globalIndex
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm transition-colors',
                          idx === selectedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50'
                        )}
                      >
                        <div className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-md border shrink-0',
                          idx === selectedIndex ? 'bg-background' : 'bg-muted'
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium truncate">{item.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 font-mono hidden sm:inline">
                          ⌘{idx + 1}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">↵</kbd>
              <span>Open</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook to manage quicklaunch open state globally
export function useQuicklaunch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
