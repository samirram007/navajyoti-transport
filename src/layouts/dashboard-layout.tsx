import { Outlet, useNavigate } from '@tanstack/react-router'
import { Sidebar } from '@/components/sidebar'
import { TopNav } from '@/components/top-nav'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { getGravatarUrl } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { ReportingPeriodControl } from '@/components/reporting-period-control'
import { Quicklaunch, useQuicklaunch } from '@/components/quicklaunch'
import { useAuth } from '@/contexts/auth-context'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { useQuery } from '@tanstack/react-query'
import { getFiscalYearsApi } from '@/features/fees/services'
import {
  LogOut, Search, Command, Users, Truck, Wallet, Receipt, Menu, User, Settings,
  Calendar, ChevronDown, CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { useState, useEffect, type ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

const quickActions: { label: string; icon: LucideIcon; href: string; shortcut: string }[] = [
  { label: 'Add Rider', icon: Users, href: '/riders', shortcut: 'R' },
  { label: 'Add Vehicle', icon: Truck, href: '/vehicles', shortcut: 'V' },
  { label: 'Collect Fee', icon: Wallet, href: '/fees', shortcut: 'F' },
  { label: 'Add Expense', icon: Receipt, href: '/expenses', shortcut: 'E' },
]

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { open: quicklaunchOpen, setOpen: setQuicklaunchOpen } = useQuicklaunch()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const [avatarUrl, setAvatarUrl] = useState<string>()
  useEffect(() => {
    if (user?.email) {
      getGravatarUrl(user.email).then(setAvatarUrl).catch(() => setAvatarUrl(undefined))
    } else {
      setAvatarUrl(undefined)
    }
  }, [user?.email])

  // Fiscal year display & quick-switch
  const { getValue, saveValue } = useUserInitialValues()
  const savedFiscalYearId = getValue('fiscalYearId')
  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['fiscal-years-switch'],
    queryFn: getFiscalYearsApi,
    staleTime: 5 * 60 * 1000,
  })
  const currentFiscalYear = fiscalYears.find((fy: any) => String(fy.id) === savedFiscalYearId)
  const fiscalYearLabel = currentFiscalYear?.name

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onQuicklaunchOpen={() => setQuicklaunchOpen(true)}
          user={user}
        />

        <div className="flex-1 flex flex-col">
          {/* Navbar */}
          <header className="h-14 border-b bg-card shadow-elevation-1 flex items-center justify-between px-4 shrink-0 gap-2">
            {/* Left: Breadcrumb / Page context */}
            <div className="flex items-center gap-2">
              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open sidebar menu"
              >
                <Menu className="h-4 w-4" />
              </Button>

              {/* Quicklaunch trigger */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 text-muted-foreground hover:text-foreground hidden sm:flex"
                    onClick={() => setQuicklaunchOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                    <span className="text-xs">Search...</span>
                    <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground shadow-xs">
                      <Command className="h-2.5 w-2.5" />K
                    </kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Press <kbd className="rounded bg-muted-foreground/20 px-1 py-0.5 text-[10px]">⌘K</kbd> to search
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Right: Actions and User */}
            <div className="flex items-center gap-1">
              {/* Quick Actions */}
              <div className="hidden md:flex items-center gap-0.5 mr-2 border-r pr-2">
                <span className="text-[10px] text-muted-foreground font-medium mr-1">Quick:</span>
                {quickActions.map(action => (
                  <Tooltip key={action.label}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate({ to: action.href })}
                      >
                        <action.icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {action.label} <kbd className="rounded bg-muted-foreground/20 px-1 py-0.5 text-[10px]">G then {action.shortcut}</kbd>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Mobile quicklaunch */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground md:hidden"
                onClick={() => setQuicklaunchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Global Reporting Period (per user, applies to reports by default) */}
              <ReportingPeriodControl />

              {/* Fiscal Year Quick-Switch Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden sm:inline-flex h-7 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 text-xs font-medium text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <Calendar className="h-3 w-3" />
                    <span>{fiscalYearLabel || 'Select FY'}</span>
                    <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className="w-56 max-h-72 overflow-y-auto">
                  {fiscalYears.length === 0 ? (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground justify-center">
                      No fiscal years available
                    </DropdownMenuItem>
                  ) : (
                    fiscalYears.map((fy: any) => {
                      const isActive = String(fy.id) === savedFiscalYearId
                      return (
                        <DropdownMenuItem
                          key={fy.id}
                          className="flex items-center justify-between cursor-pointer gap-2"
                          onClick={() => {
                            if (!isActive) {
                              saveValue('fiscalYearId', String(fy.id))
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                            <span className="text-sm truncate">{fy.name}</span>
                          </div>
                          {isActive && (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          )}
                        </DropdownMenuItem>
                      )
                    })
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs text-muted-foreground justify-center cursor-pointer gap-1.5"
                    onClick={() => navigate({ to: '/preferences' })}
                  >
                    <Settings className="h-3 w-3" />
                    Manage Fiscal Years
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Theme */}
              <ThemeToggle />

              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 border-l pl-2 ml-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
                    <Avatar className="h-7 w-7 ring-2 ring-transparent transition-all duration-200 hover:ring-primary/30">
                      <AvatarImage src={avatarUrl} alt={user?.name || 'User'} />
                      <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:inline">{user?.name || 'User'}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || `${user?.username || 'user'}@goschool.com`}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: '/profile' })} className="cursor-pointer">
                    <User className="h-4 w-4" />
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
          </header>

          {/* Top Navigation */}
          <TopNav />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children || <Outlet />}
          </main>
        </div>

        {/* Quicklaunch Command Palette */}
        <Quicklaunch open={quicklaunchOpen} onOpenChange={setQuicklaunchOpen} />
      </div>
    </TooltipProvider>
  )
}
