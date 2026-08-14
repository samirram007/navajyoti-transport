import { useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { cn, getGravatarUrl } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, Users, Truck, Building2,
  Wallet, Receipt, Settings, User as UserIcon, LogOut,
  Search, Command, X, ChevronDown, ChevronRight, BarChart3,
  type LucideIcon
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import type { User } from '@/types/api'
import { useEffect } from 'react'

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
      { label: 'Credit Notes', href: '/credit-notes' },
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
    label: 'Organization', icon: Building2, href: '#',
    children: [
      { label: 'Schools', href: '/schools' },
      { label: 'Organizations', href: '/organizations' },
    ],
  },
  {
    label: 'Reports', icon: BarChart3, href: '#',
    children: [
      { label: 'Income vs Expense', href: '/reports/income-expense' },
      { label: 'Monthly Trend', href: '/reports/monthly-trend' },
      { label: 'Daily Collection', href: '/reports/daily-collection' },
      { label: 'Pending Collection', href: '/reports/pending-collection' },
      { label: 'Credit Notes', href: '/reports/credit-notes' },
      { label: 'Rider Fee Collection', href: '/reports/rider-fee-collection' },
      { label: 'Vehicle Fee Collection', href: '/reports/vehicle-fee-collection' },
      { label: 'School Fee Collection', href: '/reports/school-fee-collection' },
    ],
  },
  {
    label: 'Settings', icon: Settings, href: '#',
    children: [
      { label: 'My Preferences', href: '/preferences' },
      { label: 'User Settings', href: '/user-settings' },
      { label: 'Users', href: '/users' },
      { label: 'User Initial Values', href: '/user-initial-values' },
      { label: 'Settings', href: '/settings' },
    ],
  },
] 

const quickItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Riders', icon: Users, href: '/riders' },
  { label: 'Fees', icon: Wallet, href: '/fees' },
  { label: 'Reports', icon: BarChart3, href: '/reports/income-expense' },
]

interface SidebarProps {
  onQuicklaunchOpen?: () => void
  isOpen: boolean
  onClose: () => void
  user?: User | null
}

export function Sidebar({ onQuicklaunchOpen, isOpen, onClose, user }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const [gravatarUrl, setGravatarUrl] = useState<string>()

  useEffect(() => {
    if (user?.email) {
      getGravatarUrl(user.email).then(setGravatarUrl).catch(() => setGravatarUrl(undefined))
    } else {
      setGravatarUrl(undefined)
    }
  }, [user?.email])

  const avatarUrl = gravatarUrl

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

  // Auto-expand groups that contain the active route
  useEffect(() => {
    const newExpanded = new Set(expandedGroups)
    let changed = false
    for (const cat of categories) {
      if (cat.children && cat.children.some(c => isActive(c.href))) {
        if (!newExpanded.has(cat.label)) {
          newExpanded.add(cat.label)
          changed = true
        }
      }
    }
    if (changed) {
      setExpandedGroups(newExpanded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r flex flex-col transition-all duration-200 ease-in-out z-50 shadow-elevation-3",
          "fixed inset-y-0 left-0 w-64",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:translate-x-0 lg:h-screen"
        )}
      >
        {/* Mobile close button */}
        <div className="lg:hidden absolute top-3 right-3">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Brand */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              G
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">GoSchool</h1>
              <p className="text-[10px] text-muted-foreground">Transport Management</p>
            </div>
          </div>
        </div>

        {/* Quicklaunch Search */}
        <div className="p-2 border-b">
          <button
            onClick={() => { onQuicklaunchOpen?.(); handleNavClick() }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left text-xs">Quick search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1 py-0.5 text-[10px] font-medium text-muted-foreground shadow-xs">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>

        {/* Quicklaunch Icons */}
        <div className="px-3 py-2 border-b">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
            Quick Launch
          </div>
          <div className="grid grid-cols-4 gap-1">
            {quickItems.map(item => (
              <Link
                key={item.label}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2 rounded-lg text-center transition-colors group',
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted group-hover:bg-muted-foreground/10'
                )}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-[9px] font-medium leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
            Navigation
          </div>
          <nav className="space-y-0.5">
            {categories.map(cat =>
              cat.children ? (
                <div key={cat.label}>
                  <button
                    onClick={() => toggleGroup(cat.label)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2.5 h-9 px-3 text-sm font-medium rounded-md transition-colors',
                      cat.children.some(c => isActive(c.href))
                        ? 'bg-accent/50 text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <cat.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </span>
                    {expandedGroups.has(cat.label) ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    )}
                  </button>
                  {expandedGroups.has(cat.label) && (
                    <div className="ml-2 mt-0.5 space-y-0.5 border-l pl-2">
                      {cat.children.map(child => (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={handleNavClick}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive(child.href)
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                        >
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            isActive(child.href) ? 'bg-primary' : 'bg-muted-foreground/30'
                          )} />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={cat.href}
                  to={cat.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-2.5 h-9 px-3 text-sm font-medium rounded-md transition-colors',
                    isActive(cat.href)
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <cat.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </Link>
              )
            )}
          </nav>
        </div>

        {/* Bottom section — User profile with dropdown */}
        <div className="border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full p-3 text-left outline-none hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border">
                    <AvatarImage src={avatarUrl} alt={user?.name || 'User'} />
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email || ''}</p>
                    {user?.userType && (
                      <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-medium uppercase tracking-wider">
                        {user.userType}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" sideOffset={4} align="start" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || ''}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: '/profile' })} className="cursor-pointer">
                <UserIcon className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: '/settings' })} className="cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-500 focus:text-red-600 dark:text-red-400 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-950/50">
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
