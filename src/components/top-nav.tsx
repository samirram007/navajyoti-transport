import { useLocation, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, Truck, Wallet, Receipt, Building2, Settings, ChevronDown, BarChart3,
  type LucideIcon,
} from 'lucide-react'

interface NavCategory {
  label: string
  icon: LucideIcon
  href: string
  children?: { label: string; href: string }[]
}

const categories: NavCategory[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: 'Transport', icon: Truck, href: '#',
    children: [
      { label: 'Riders', href: '/riders' },
      { label: 'Vehicles', href: '/vehicles' },
      { label: 'Vehicle Types', href: '/vehicle-types' },
      { label: 'Slots', href: '/slots' },
    ],
  },
  {
    label: 'Fees', icon: Wallet, href: '#',
    children: [
      { label: 'Fee Collections', href: '/fees' },
      { label: 'Fee Heads', href: '/fee-heads' },
      { label: 'Income Groups', href: '/income-groups' },
      { label: 'Fiscal Years', href: '/fiscal-years' },
    ],
  },
  {
    label: 'Expenses', icon: Receipt, href: '#',
    children: [
      { label: 'Expenses', href: '/expenses' },
      { label: 'Expense Groups', href: '/expense-groups' },
      { label: 'Expense Heads', href: '/expense-heads' },
    ],
  },
  {
    label: 'Reports', icon: BarChart3, href: '#',
    children: [
      { label: 'Income vs Expense', href: '/reports/income-expense' },
      { label: 'Monthly Trend', href: '/reports/monthly-trend' },
      { label: 'Daily Collection', href: '/reports/daily-collection' },
      { label: 'Rider Fee Collection', href: '/reports/rider-fee-collection' },
      { label: 'Vehicle Fee Collection', href: '/reports/vehicle-fee-collection' },
      { label: 'School Fee Collection', href: '/reports/school-fee-collection' },
    ],
  },
  {
    label: 'Organization', icon: Building2, href: '#',
    children: [
      { label: 'Schools', href: '/schools' },
      { label: 'Organizations', href: '/organizations' },
    ],
  },
  {
    label: 'Settings', icon: Settings, href: '#',
    children: [
      { label: 'Users', href: '/users' },
      { label: 'Settings', href: '/settings' },
    ],
  },
]

export function TopNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/')

  const isCategoryActive = (cat: NavCategory) => {
    if (cat.children) {
      return cat.children.some(c => isActive(c.href))
    }
    return isActive(cat.href)
  }

  return (
    <div className="hidden lg:flex h-10 border-b bg-muted/20 px-4 items-center gap-0.5">
      {categories.map(cat =>
        cat.children ? (
          <DropdownMenu key={cat.label}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'inline-flex h-8 items-center justify-center gap-1 rounded-md px-3 text-xs font-medium transition-colors',
                  isCategoryActive(cat)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <cat.icon className="h-3.5 w-3.5" />
                {cat.label}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6} className="w-48 p-1">
              {cat.children.map(child => (
                <DropdownMenuItem
                  key={child.href}
                  onClick={() => navigate({ to: child.href })}
                  className={cn(
                    'cursor-pointer text-xs py-2',
                    isActive(child.href) && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  <span className={cn(
                    'w-1 h-1 rounded-full shrink-0',
                    isActive(child.href) ? 'bg-primary' : 'bg-muted-foreground/30'
                  )} />
                  {child.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            key={cat.label}
            onClick={() => navigate({ to: cat.href })}
            className={cn(
              'inline-flex h-8 items-center justify-center gap-1 rounded-md px-3 text-xs font-medium transition-colors',
              isCategoryActive(cat)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        )
      )}
    </div>
  )
}
