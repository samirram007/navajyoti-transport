import { useQuery } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Truck, Users, Wallet, Receipt, TrendingUp, TrendingDown,
  Activity, PiggyBank, AlertTriangle, Clock,
  ParkingCircle, Plus, Minus, RefreshCw,
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
  total_vehicles: number
  active_vehicles: number
  total_slots: number
  active_slots: number
  total_fees_collected: number
  total_expenses: number
  total_pending_balance: number
  total_fee_count: number
  net_revenue: number
  monthly_fees: MonthlyDataPoint[]
  monthly_expenses: MonthlyDataPoint[]
  fee_status: {
    total_collected: number
    total_pending: number
    total_fees_count: number
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
  recent_fees: ActivityItem[]
  recent_expenses: ActivityItem[]
  current_fiscal_year: {
    name: string
    fees_collected: number
    expenses: number
    net: number
  } | null
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
function StatCard({ label, value, icon: Icon, color, trend, subtitle }: {
  label: string; value: string | number; icon: any; color: string
  trend?: { value: number; positive: boolean } | null; subtitle?: string
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
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, icon, children, className }: {
  title: string; icon?: any; children: React.ReactNode; className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
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
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard')
      return res.data.data as DashboardData
    },
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 60_000, // auto-refresh every minute
  })

  if (isLoading) return <DashboardSkeleton />
  if (isError || !data) return <DashboardError error={(error as Error) || new Error('No data')} refetch={refetch} />

  const d = data
  const stats = [
    {
      label: 'Total Revenue', value: formatCurrency(d.total_fees_collected),
      icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', subtitle: `${d.total_fee_count} fee collections`,
    },
    {
      label: 'Pending Balance', value: formatCurrency(d.total_pending_balance),
      icon: Clock, color: 'text-amber-600 dark:text-amber-400', subtitle: d.fee_status.unpaid_count > 0 ? `${d.fee_status.unpaid_count} unpaid fees` : undefined,
      trend: d.total_pending_balance > 0 ? { value: Math.round((d.total_pending_balance / (d.total_fees_collected || 1)) * 100), positive: false } : undefined,
    },
    {
      label: 'Total Expenses', value: formatCurrency(d.total_expenses),
      icon: Receipt, color: 'text-red-600', subtitle: `${(d.expenses_by_group || []).length} categories`,
      trend: d.total_expenses > 0 ? { value: Math.round((d.total_expenses / (d.total_fees_collected || 1)) * 100), positive: true } : undefined,
    },
    {
      label: 'Net Revenue', value: formatCurrency(d.net_revenue),
      icon: TrendingUp, color: d.net_revenue >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400',
      subtitle: d.current_fiscal_year ? `FY ${d.current_fiscal_year.name}` : undefined,
    },
  ]

  const resourceStats = [
    { label: 'Riders', value: `${d.active_riders} / ${d.total_riders}`, icon: Users, color: 'text-blue-600 dark:text-blue-400', subtitle: 'active / total' },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Transport Management Overview
            {d.current_fiscal_year && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs">
                <PiggyBank className="h-3 w-3" />
                FY {d.current_fiscal_year.name}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue vs Expenses Chart */}
        <ChartCard title="Revenue vs Expenses (Monthly)" icon={<TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />}>
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
        <ChartCard title="Fee Collection Status" icon={<PieChart className="h-4 w-4 text-blue-500 dark:text-blue-400" />}>
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
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Activities */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.recent_activities && d.recent_activities.length > 0 ? (
              <div className="space-y-1">
                {d.recent_activities.slice(0, 8).map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-full ${activity.type === 'fee' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
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
                      <span className={`text-sm font-medium tabular-nums ${activity.type === 'fee' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {activity.type === 'fee' ? '+' : '-'}{formatCurrency(activity.amount)}
                      </span>
                      <Badge variant={activity.type === 'fee' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {activity.type === 'fee' ? 'Fee' : 'Expense'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Fiscal Year Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              {d.current_fiscal_year ? `FY ${d.current_fiscal_year.name}` : 'Fiscal Year'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {d.current_fiscal_year ? (
              <>
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
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No fiscal year set</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
