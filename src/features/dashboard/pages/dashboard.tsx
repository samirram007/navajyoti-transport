import { useState, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { getFiscalYearsApi } from '@/features/fees/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import {
  Truck, Users, Wallet, Receipt, TrendingUp, TrendingDown,
  Activity, PiggyBank, AlertTriangle, Clock,
  ParkingCircle, Plus, Minus, RefreshCw, CircleDollarSign, Calendar,
  ChevronLeft, ChevronRight, ExternalLink, Inbox, CircleCheckBig,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────
interface MonthlyDataPoint {
  month: string
  collected?: number
  pending?: number
  count?: number
  amount?: number
}

interface ActivityItem {
  id: number
  type: 'fee' | 'expense'
  title: string
  description: string
  amount: number
  date: string
  status: string
}

interface DashboardData {
  total_riders: number
  active_riders: number
  rider_status_breakdown: {
    active: number
    inactive: number
    suspended: number
    permanent: number
    withdrawn: number
  }
  total_vehicles: number
  active_vehicles: number
  total_slots: number
  active_slots: number
  total_fees_collected: number
  total_expenses: number
  total_pending_balance: number
  total_due: number
  pending_collected: number
  due_collected: number
  advance_paid: number
  total_fee_count: number
  total_expense_count: number
  net_revenue: number
  monthly_fees: MonthlyDataPoint[]
  monthly_expenses: MonthlyDataPoint[]
  fee_status: {
    total_billed: number
    total_collected: number
    total_pending: number
    total_due: number
    pending_collected: number
    due_collected: number
    advance_paid: number
    advance_fee_count: number
    due_from_prev_year: number
    due_from_prev_year_fee_count: number
    total_fees_count: number
    pending_fee_count: number
    due_fee_count: number
    paid_in_full_count: number
    partially_paid_count: number
    unpaid_count: number
  }
  expenses_by_group: { name: string; total: number }[]
  vehicle_utilization: {
    total: number
    active_with_riders: number
    total_capacity: number
    total_riders_assigned: number
  }
  recent_activities: ActivityItem[]
  recent_activities_pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
  recent_fees: ActivityItem[]
  recent_expenses: ActivityItem[]
  current_fiscal_year: {
    name: string
    fees_collected: number
    expenses: number
    net: number
    previous_net?: number
  } | null
  due_collections: DueCollectionItem[]
  due_collections_summary: {
    total_pending: number
    count: number
    rider_count: number
  }
  due_collections_trend: { month: string; pending: number; count: number }[]
  current_rider_stats: {
    current_count: number
    pending_balance: number
    due_count: number
    due_balance: number
    collected: number
    total: number
    advance_paid: number
  }
  total_activities_all_fys: number
  total_fees_all_fys: number
  total_expenses_all_fys: number
}

interface DueCollectionItem {
  id: number
  fee_no: string
  rider_name: string
  total_amount: number
  paid_amount: number
  balance_amount: number
  fee_date: string
  fee_heads: string[]
}

// ─── Colors ──────────────────────────────────────────────────────────────
const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444']

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function abbreviateMonth(m: string) {
  if (!m) return ''
  const parts = m.split('-')
  if (parts.length < 2) return m
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return months[parseInt(parts[1], 10) - 1] || m
}

// ─── Components ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, trend, subtitle, sparklineData, details }: {
  label: string; value: string | number; icon: any; color: string
  trend?: { value: number; positive: boolean } | null; subtitle?: string
  sparklineData?: { month: string; value: number }[]
  details?: { label: string; value: number; color?: string }[]
}) {
  return (
    <Card className="hover:shadow-elevation-3 transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span className={`flex items-center text-xs font-medium ${trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trend.positive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {trend.value}%
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
        {details && details.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t">
            {details.map((d) => (
              <span key={d.label} className="text-[10px]">
                <span className="font-medium">{d.value}</span>{' '}
                <span className="text-muted-foreground">{d.label}</span>
              </span>
            ))}
          </div>
        )}
        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-2 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={1.5} fill="url(#sparkGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, icon, badge, children, className }: {
  title: string; icon?: any; badge?: string; children: React.ReactNode; className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
          {badge && (
            <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground ml-auto">
              {badge}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} elevation={1}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    </div>
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Error State ────────────────────────────────────────────────────────
function DashboardError({ error, refetch }: { error: Error; refetch: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || 'Could not fetch dashboard data. The backend may be unavailable or your session may have expired.'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.href = '/login'}>
          Go to Login
        </Button>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate()
  const { getValue, saveValue } = useUserInitialValues()
  const savedFiscalYearId = getValue('fiscalYearId')
  const savedActivityType = (getValue('dashboardActivityType') as 'all' | 'fees' | 'expenses') || 'all'
  const [activityPage, setActivityPage] = useState(1)
  const [activityPerPage, setActivityPerPage] = useState(10)
  const [activityType, setActivityType] = useState<'all' | 'fees' | 'expenses'>(savedActivityType)
  const [dueCollectionSearch, setDueCollectionSearch] = useState('')

  // Fiscal years for the dropdown
  const { data: fiscalYears = [], isLoading: fyLoading } = useQuery({
    queryKey: ['fiscal-years-switch'],
    queryFn: getFiscalYearsApi,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', savedFiscalYearId ?? '', activityPage, activityPerPage, activityType],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (savedFiscalYearId) params.fiscal_year_id = savedFiscalYearId
      params.activity_page = String(activityPage)
      params.activity_per_page = String(activityPerPage)
      params.activity_type = activityType
      const res = await axiosClient.get('/dashboard', { params })
      return res.data.data as DashboardData
    },
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 60_000, // auto-refresh every minute
  })

  // Reset activity page when FY, page size, or type filter changes
  useEffect(() => { setActivityPage(1) }, [savedFiscalYearId, activityPerPage, activityType])

  if (isLoading) return <DashboardSkeleton />
  if (isError || !data) return <DashboardError error={(error as Error) || new Error('No data')} refetch={refetch} />

  const d = data
  const selectedFY = fiscalYears.find((fy: any) => String(fy.id) === savedFiscalYearId)
  const fyLabel = selectedFY?.name ?? d.current_fiscal_year?.name

  const stats = [
    {
      label: 'Total Revenue', value: formatCurrency(d.total_fees_collected),
      icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400',
      subtitle: `${d.fee_status.total_fees_count} fees · ${formatCurrency(d.fee_status.total_billed)} billed`,
    },
    {
      label: 'Pending Balance', value: formatCurrency(d.total_pending_balance),
      icon: Clock, color: 'text-amber-600 dark:text-amber-400',
      subtitle: `${d.fee_status.pending_fee_count ?? 0} fees · ${d.fee_status.total_fees_count > 0 ? ((d.total_pending_balance / (d.fee_status.total_billed || 1)) * 100).toFixed(1) : 0}% of billed`,
    },
    {
      label: 'Total Expenses', value: formatCurrency(d.total_expenses),
      icon: Receipt, color: 'text-red-600',
      subtitle: `${d.total_expense_count} vouchers · ${(d.expenses_by_group || []).length} categories`,
    },
    {
      label: 'Net Revenue', value: formatCurrency(d.net_revenue),
      icon: TrendingUp, color: d.net_revenue >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400',
      subtitle: fyLabel ? `FY ${fyLabel}` : undefined,
      trend: d.current_fiscal_year?.previous_net != null && d.current_fiscal_year.previous_net !== 0
        ? {
            value: Math.round(Math.abs((d.net_revenue - d.current_fiscal_year.previous_net) / Math.abs(d.current_fiscal_year.previous_net)) * 100),
            positive: d.net_revenue >= d.current_fiscal_year.previous_net,
          }
        : undefined,
    },
    {
      label: 'Advance Paid', value: formatCurrency(d.advance_paid),
      icon: PiggyBank, color: 'text-purple-600 dark:text-purple-400',
      subtitle: d.fee_status.advance_fee_count > 0 ? `${d.fee_status.advance_fee_count} fee${d.fee_status.advance_fee_count !== 1 ? 's' : ''} paid before payable month` : 'No advance payments',
    },
    {
      label: 'Due from Prev Year', value: formatCurrency(d.fee_status.due_from_prev_year),
      icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400',
      subtitle: d.fee_status.due_from_prev_year_fee_count > 0 ? `${d.fee_status.due_from_prev_year_fee_count} fee${d.fee_status.due_from_prev_year_fee_count !== 1 ? 's' : ''} from previous FY` : 'No previous year dues',
    },
  ]

  const resourceStats = [
    { label: 'Riders', value: d.active_riders, icon: Users, color: 'text-blue-600 dark:text-blue-400', subtitle: `${d.total_riders} total · ${d.rider_status_breakdown?.active ?? 0} active`,
      details: d.rider_status_breakdown ? [
        { label: 'Active', value: d.rider_status_breakdown.active, color: 'text-green-600' },
        { label: 'Suspended', value: d.rider_status_breakdown.suspended, color: 'text-red-600' },
        { label: 'Inactive', value: d.rider_status_breakdown.inactive, color: 'text-gray-600' },
        { label: 'Permanent', value: d.rider_status_breakdown.permanent, color: 'text-red-500' },
        { label: 'Withdrawn', value: d.rider_status_breakdown.withdrawn, color: 'text-purple-600' },
      ] : undefined,
    },
    { label: 'Vehicles', value: `${d.active_vehicles} / ${d.total_vehicles}`, icon: Truck, color: 'text-green-600 dark:text-green-400', subtitle: 'in use / total' },
    { label: 'Slots', value: `${d.active_slots} / ${d.total_slots}`, icon: ParkingCircle, color: 'text-purple-600 dark:text-purple-400', subtitle: 'active / total' },
    { label: 'Capacity', value: d.vehicle_utilization.total_capacity > 0 ? `${Math.round((d.vehicle_utilization.total_riders_assigned / d.vehicle_utilization.total_capacity) * 100)}%` : 'N/A', icon: Activity, color: 'text-orange-600 dark:text-orange-400', subtitle: `${d.vehicle_utilization.total_riders_assigned} riders` },
  ]

  // Merge fee + expense monthly data for the combined chart
  const monthlyData: any[] = []
  const feeMap = new Map(d.monthly_fees?.map((m: any) => [m.month, m]))
  const expMap = new Map(d.monthly_expenses?.map((m: any) => [m.month, m]))
  const allMonths = new Set([...feeMap.keys(), ...expMap.keys()])
  for (const month of [...allMonths].sort()) {
    const fee = feeMap.get(month)
    const exp = expMap.get(month)
    monthlyData.push({
      month: abbreviateMonth(month),
      collected: fee ? Number(fee.collected) : 0,
      pending: fee ? Number(fee.pending) : 0,
      expenses: exp ? Number(exp.amount) : 0,
    })
  }

  // Fee status pie data
  const pieData = [
    { name: 'Paid in Full', value: d.fee_status.paid_in_full_count },
    { name: 'Partial', value: d.fee_status.partially_paid_count },
    { name: 'Unpaid', value: d.fee_status.unpaid_count },
  ].filter(p => p.value > 0)

  // Collection breakdown for secondary chart
  const collectionBreakdown = [
    { name: 'Total Collected', value: d.fee_status.total_collected, color: '#22c55e' },
    { name: 'Advance (Same FY, Early Payment)', value: d.fee_status.advance_paid, color: '#8b5cf6' },
    { name: 'Due from Previous Year', value: d.fee_status.due_from_prev_year, color: '#f97316' },
    { name: 'Due Collection', value: d.fee_status.due_collected, color: '#3b82f6' },
    { name: 'Pending Balance', value: d.fee_status.total_pending, color: '#f59e0b' },
    { name: 'Due Balance', value: d.fee_status.total_due, color: '#ef4444' },
  ].filter(p => p.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Transport Management Overview
            {fyLabel && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs">
                <PiggyBank className="h-3 w-3" />
                FY {fyLabel}
              </span>
            )}
          </p>
        </div>
        {/* Fiscal Year Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <SearchableSelect
            value={savedFiscalYearId ?? ''}
            onValueChange={(val) => saveValue('fiscalYearId', val)}
            options={fiscalYears.map((fy: any) => ({ label: fy.name, value: String(fy.id) }))}
            placeholder="All Fiscal Years"
            searchPlaceholder="Search fiscal year..."
            disabled={fyLoading}
            loading={fyLoading}
            className="w-48"
            allowClear
          />
          {savedFiscalYearId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => saveValue('fiscalYearId', '')}
            >
              <RefreshCw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map(stat => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Resource Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {resourceStats.map(stat => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Current Rider Stats */}
      {d.current_rider_stats && (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Current Riders"
          value={d.current_rider_stats.current_count}
          icon={Users}
          color="text-blue-600 dark:text-blue-400"
          subtitle={`of ${d.total_riders} total`}
        />
        <StatCard
          label="Pending (Current)"
          value={formatCurrency(d.current_rider_stats.pending_balance)}
          icon={Clock}
          color="text-amber-600 dark:text-amber-400"
          subtitle={d.current_rider_stats.total > 0 ? `${((d.current_rider_stats.pending_balance / d.current_rider_stats.total) * 100).toFixed(1)}% of total` : undefined}
        />
        <StatCard
          label="Due (Current)"
          value={formatCurrency(d.current_rider_stats.due_balance)}
          icon={AlertTriangle}
          color="text-red-600 dark:text-red-400"
          subtitle={d.current_rider_stats.due_count > 0 ? `${d.current_rider_stats.due_count} fee${d.current_rider_stats.due_count !== 1 ? 's' : ''}` : 'All clear'}
        />
        <StatCard
          label="Collected (Current)"
          value={formatCurrency(d.current_rider_stats.collected)}
          icon={Wallet}
          color="text-emerald-600 dark:text-emerald-400"
          subtitle={d.current_rider_stats.total > 0 ? `${((d.current_rider_stats.collected / d.current_rider_stats.total) * 100).toFixed(1)}% collection rate` : undefined}
        />
        <StatCard
          label="Advance Paid (Current)"
          value={formatCurrency(d.current_rider_stats.advance_paid)}
          icon={PiggyBank}
          color="text-purple-600 dark:text-purple-400"           subtitle={d.current_rider_stats.advance_paid > 0 ? 'Paid before payable month (same FY)' : 'No advance payments'}
        />
      </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue vs Expenses Chart */}
        <ChartCard title="Revenue vs Expenses (Monthly)" icon={<TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />} badge={fyLabel ? `FY ${fyLabel}` : undefined}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Fee Status Pie */}
        <ChartCard title="Fee Collection Status" icon={<PieChart className="h-4 w-4 text-blue-500 dark:text-blue-400" />} badge={fyLabel ? `FY ${fyLabel}` : undefined}>
          <div className="h-72 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No fee data yet</p>
            )}
          </div>
          {/* Collection breakdown summary */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
            {collectionBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                <span className="text-xs font-medium ml-auto tabular-nums">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Due Collection Received */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                Due Collection Received
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {d.due_collections_summary.count} fee{d.due_collections_summary.count !== 1 ? 's' : ''} with outstanding balance across {d.due_collections_summary.rider_count} rider{d.due_collections_summary.rider_count !== 1 ? 's' : ''} — {formatCurrency(d.due_collections_summary.total_pending)} pending
              </p>
            </div>
            {d.due_collections.length > 0 && (
              <input
                type="text"
                placeholder="Search rider or fee..."
                value={dueCollectionSearch}
                onChange={(e) => setDueCollectionSearch(e.target.value)}
                className="h-7 w-44 rounded-md border bg-background px-2 text-xs placeholder:text-muted-foreground"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredDue = dueCollectionSearch
              ? d.due_collections.filter((item) =>
                  item.rider_name.toLowerCase().includes(dueCollectionSearch.toLowerCase()) ||
                  item.fee_no.toLowerCase().includes(dueCollectionSearch.toLowerCase())
                )
              : d.due_collections
            return filteredDue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Rider</th>
                    <th className="pb-2 font-medium">Fee No.</th>
                    <th className="pb-2 font-medium">Fee Heads</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Paid</th>
                    <th className="pb-2 font-medium text-right">Due</th>
                    <th className="pb-2 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDue.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">{item.rider_name}</td>
                      <td className="py-2.5 text-muted-foreground">{item.fee_no}</td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {item.fee_heads.map((head, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                              {head}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{formatCurrency(item.total_amount)}</td>
                      <td className="py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(item.paid_amount)}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-amber-600 dark:text-amber-400">{formatCurrency(item.balance_amount)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{item.fee_date ? new Date(item.fee_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CircleCheckBig className="h-10 w-10 text-emerald-400 dark:text-emerald-500 mb-3" />
              <p className="text-sm text-muted-foreground">
                {fyLabel ? `No due collections for FY ${fyLabel}` : 'No due collections'}
              </p>
              {fyLabel && (
                <>
                  {d.total_fees_all_fys > 0 && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {d.total_fees_all_fys} fee{d.total_fees_all_fys !== 1 ? 's' : ''} across all fiscal years
                    </p>
                  )}
                  <button
                    onClick={() => saveValue('fiscalYearId', '')}
                    className="mt-2 text-xs text-primary hover:underline cursor-pointer"
                  >
                    Clear filter
                  </button>
                </>
              )}
            </div>
          )
          })()}
        </CardContent>
      </Card>

      {/* Expense by Group Breakdown */}
      {d.expenses_by_group && d.expenses_by_group.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4 text-red-500 dark:text-red-400" />
            Expenses by Group
            {fyLabel && (
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground ml-auto">
                FY {fyLabel}
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {d.expenses_by_group.length} categories — {formatCurrency(d.total_expenses)} total
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {d.expenses_by_group.map((group) => {
              const pct = d.total_expenses > 0 ? (group.total / d.total_expenses) * 100 : 0
              return (
                <Link
                  key={group.name}
                  to="/expenses"
                  search={{ search: group.name }}
                  className="block space-y-1 hover:bg-accent/50 rounded-md px-2 py-1 -mx-2 transition-colors"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{group.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground tabular-nums">{formatCurrency(group.total)}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 tabular-nums min-w-[3rem] justify-center">
                        {pct.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500 dark:bg-red-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Activities */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Recent Activities
              </CardTitle>
              <div className="flex items-center gap-1">
                {(['all', 'fees', 'expenses'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={activityType === type ? 'default' : 'ghost'}
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => { setActivityType(type); saveValue('dashboardActivityType', type) }}
                  >
                    {type === 'all' ? 'All' : type === 'fees' ? 'Fees' : 'Expenses'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {d.recent_activities && d.recent_activities.length > 0 ? (
              <>
                <div className="space-y-1">
                  {d.recent_activities.map((activity) => {
                    const linkClasses = "group flex items-center justify-between py-2 border-b last:border-0 hover:bg-accent/50 rounded-md px-1 -mx-1 transition-colors"
                    const iconClasses = `p-1.5 rounded-full ${activity.type === 'fee' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`
                    const amountClasses = `text-sm font-medium tabular-nums ${activity.type === 'fee' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`

                    const content = (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={iconClasses}>
                            {activity.type === 'fee'
                              ? <Plus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              : <Minus className="h-3 w-3 text-red-600 dark:text-red-400" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{activity.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={amountClasses}>
                            {activity.type === 'fee' ? '+' : '-'}{formatCurrency(activity.amount)}
                          </span>
                          <Badge variant={activity.type === 'fee' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                            {activity.type === 'fee' ? 'Fee' : 'Expense'}
                          </Badge>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </>
                    )

                    const handleKeyDown = (e: React.KeyboardEvent, to: string, params: Record<string, string>) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        navigate({ to, params })
                      }
                    }

                    if (activity.type === 'fee') {
                      return (
                        <Link
                          key={`fee-${activity.id}`}
                          to="/fees/$feeId/edit"
                          params={{ feeId: String(activity.id) }}
                          className={linkClasses}
                          tabIndex={0}
                          onKeyDown={(e) => handleKeyDown(e, '/fees/$feeId/edit', { feeId: String(activity.id) })}
                        >
                          {content}
                        </Link>
                      )
                    }
                    return (
                      <Link
                        key={`expense-${activity.id}`}
                        to="/expenses/$expenseId/edit"
                        params={{ expenseId: String(activity.id) }}
                        className={linkClasses}
                        tabIndex={0}
                        onKeyDown={(e) => handleKeyDown(e, '/expenses/$expenseId/edit', { expenseId: String(activity.id) })}
                      >
                        {content}
                      </Link>
                    )
                  })}
                </div>
                {/* Pagination */}
                {d.recent_activities_pagination.total > 0 && (
                  <div className="flex items-center justify-between pt-3 mt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {d.recent_activities_pagination.total} total
                      </span>
                      <select
                        value={activityPerPage}
                        onChange={(e) => setActivityPerPage(Number(e.target.value))}
                        className="h-6 rounded border bg-background px-1.5 text-xs text-muted-foreground"
                      >
                        {[10, 25, 50].map((n) => (
                          <option key={n} value={n}>{n} / page</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground mr-1">
                        {d.recent_activities_pagination.current_page} / {d.recent_activities_pagination.last_page}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={d.recent_activities_pagination.current_page <= 1}
                        onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={d.recent_activities_pagination.current_page >= d.recent_activities_pagination.last_page}
                        onClick={() => setActivityPage(p => p + 1)}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {fyLabel ? `No recent activity for FY ${fyLabel}` : 'No recent activity'}
                </p>
                {fyLabel && (
                  <>
                    {d.total_activities_all_fys > 0 && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {d.total_fees_all_fys} fee{d.total_fees_all_fys !== 1 ? 's' : ''} · {d.total_expenses_all_fys} expense{d.total_expenses_all_fys !== 1 ? 's' : ''} across all fiscal years
                      </p>
                    )}
                    <button
                      onClick={() => saveValue('fiscalYearId', '')}
                      className="mt-2 text-xs text-primary hover:underline cursor-pointer"
                    >
                      Clear filter
                    </button>
                  </>
                )}
              </div>
            )}
            {/* View All link */}
            {d.recent_activities_pagination.total > 0 && (
              <div className="flex justify-end pt-2">
                <div className="flex items-center gap-3">
                  {(activityType === 'all' || activityType === 'fees') && (
                    <Link to="/fees" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      View All Fees →
                    </Link>
                  )}
                  {(activityType === 'all' || activityType === 'expenses') && (
                    <Link to="/expenses" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      View All Expenses →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fiscal Year Summary — hidden when a specific FY is selected (redundant with filtered stats) */}
        {!savedFiscalYearId && d.current_fiscal_year && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              FY {d.current_fiscal_year.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fees Collected</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(d.current_fiscal_year.fees_collected)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(d.current_fiscal_year.expenses)}</span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between text-sm font-semibold">
                <span>Net</span>
                <span className={d.current_fiscal_year.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                  {formatCurrency(d.current_fiscal_year.net)}
                </span>
              </div>
            </div>

            {/* Simple progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Collected vs Expenses</span>
                <span>{d.current_fiscal_year.expenses > 0
                  ? `${Math.round((d.current_fiscal_year.expenses / (d.current_fiscal_year.fees_collected || 1)) * 100)}%`
                  : '0%'}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (d.current_fiscal_year.expenses / (d.current_fiscal_year.fees_collected || 1)) * 100)}%`,
                    background: 'linear-gradient(90deg, #22c55e, #ef4444)',
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}
