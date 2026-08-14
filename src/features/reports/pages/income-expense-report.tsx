import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { useReportingPeriod } from '@/hooks/use-reporting-period'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Wallet, Receipt, TrendingUp, TrendingDown, Download, FileText,
  Filter, RefreshCw, AlertTriangle, PieChart as PieChartIcon,
  BarChart3, Table2, ArrowUpDown,
} from 'lucide-react'
import { getIncomeExpenseReportApi, downloadReportCsv, type ReportFilters } from '../services'
import type { IncomeExpenseReport, MonthlyDataPoint } from '../schemas'

// ─── Colors ──────────────────────────────────────────────────────────────
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const CHART_GREEN = '#22c55e'
const CHART_RED = '#ef4444'

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

function getMonthYear(m: string) {
  if (!m) return ''
  const parts = m.split('-')
  if (parts.length < 2) return m
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`
}

// ─── Stat Card ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, subtitle, trend }: {
  label: string; value: string | number; icon: any; color: string
  subtitle?: string; trend?: { value: number; positive: boolean } | null
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

// ─── Chart Card ──────────────────────────────────────────────────────────
function ChartCard({ title, icon, children, className }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string
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

// ─── Chart Tooltip ───────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{getMonthYear(label)}</p>
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

// ─── Skeleton ────────────────────────────────────────────────────────────
function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────
export function IncomeExpenseReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    from: '',
    to: '',
    fiscal_year_id: undefined,
  })
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({})

  // Default the report to the user's global reporting period (FY start → today)
  const { from: periodFrom, to: periodTo, isLoading: periodLoading } = useReportingPeriod()
  const periodAppliedRef = useRef(false)
  useEffect(() => {
    if (periodLoading || periodAppliedRef.current) return
    periodAppliedRef.current = true
    setFilters(prev => ({ ...prev, from: periodFrom || '', to: periodTo || '' }))
    setAppliedFilters(prev => ({ ...prev, from: periodFrom || undefined, to: periodTo || undefined }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodLoading, periodFrom, periodTo])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['income-expense-report', appliedFilters],
    queryFn: () => getIncomeExpenseReportApi(appliedFilters),
    enabled: true,
  })

  const handleApplyFilters = () => {
    setAppliedFilters({
      from: filters.from || undefined,
      to: filters.to || undefined,
      fiscal_year_id: filters.fiscal_year_id || undefined,
    })
  }

  const handleReset = () => {
    setFilters({ from: periodFrom || '', to: periodTo || '', fiscal_year_id: undefined })
    setAppliedFilters({ from: periodFrom || undefined, to: periodTo || undefined })
  }

  const handleCsvExport = async () => {
    await downloadReportCsv('income-expense', appliedFilters)
  }

  const handlePdfExport = () => {
    window.print()
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-semibold">Failed to load report</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          {(error as Error)?.message || 'Could not fetch report data.'}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print-only Header */}
      <div className="hidden print:block print-header">
        <h1>Income vs Expense Report</h1>
        <div className="print-subtitle">GoSchool Transport Management</div>
        <div className="print-meta">
          <span>
            {data?.fiscal_year ? `Fiscal Year: ${data.fiscal_year.name}` : 'All Periods'}
            {appliedFilters.from && appliedFilters.to
              ? ` | ${appliedFilters.from} to ${appliedFilters.to}`
              : appliedFilters.from
              ? ` | From ${appliedFilters.from}`
              : appliedFilters.to
              ? ` | Until ${appliedFilters.to}`
              : ''}
          </span>
          <span>Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Income vs Expense Report</h1>
          <p className="text-sm text-muted-foreground">
            Compare revenue and expenses across periods
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCsvExport} disabled={!data}>
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={!data}>
            <FileText className="h-4 w-4 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="print:hidden">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">From Date</label>
                <Input
                  type="date"
                  value={filters.from || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
                  className="h-9 w-44"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To Date</label>
                <Input
                  type="date"
                  value={filters.to || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                  className="h-9 w-44"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fiscal Year</label>
                <FiscalYearSelect
                  value={filters.fiscal_year_id}
                  onChange={(val) => setFilters(prev => ({ ...prev, fiscal_year_id: val }))}
                />
              </div>
              <Button size="sm" onClick={handleApplyFilters} disabled={isFetching}>
                <Filter className="h-4 w-4 mr-1.5" /> Apply
              </Button>
              <Button size="sm" variant="ghost" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? <ReportSkeleton /> : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Income"
              value={formatCurrency(data.summary.total_income)}
              icon={Wallet}
              color="text-emerald-600 dark:text-emerald-400"
              subtitle={`${data.summary.total_fee_count} collections`}
            />
            <StatCard
              label="Total Expenses"
              value={formatCurrency(data.summary.total_expenses)}
              icon={Receipt}
              color="text-red-600 dark:text-red-400"
              subtitle={`${data.summary.total_expense_count} expenses`}
            />
            <StatCard
              label="Net Revenue"
              value={formatCurrency(data.summary.net_revenue)}
              icon={TrendingUp}
              color={data.summary.net_revenue >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}
            />
            <StatCard
              label="Expense Ratio"
              value={`${data.summary.expense_ratio}%`}
              icon={ArrowUpDown}
              color={data.summary.expense_ratio <= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
              trend={data.summary.expense_ratio > 0 ? {
                value: data.summary.expense_ratio,
                positive: data.summary.expense_ratio > 50,
              } : null}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
            {/* Income vs Expenses Bar Chart */}
            <ChartCard title="Monthly Income vs Expenses" icon={<BarChart3 className="h-4 w-4 text-emerald-500" />}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly_data.map(m => ({ ...m, month: abbreviateMonth(m.month) }))} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="collected" name="Income" fill={CHART_GREEN} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill={CHART_RED} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Net Revenue Trend */}
            <ChartCard title="Monthly Net Revenue" icon={<TrendingUp className="h-4 w-4 text-blue-500" />}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly_data.map(m => ({ ...m, month: abbreviateMonth(m.month) }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="net" name="Net" radius={[4, 4, 0, 0]}>
                      {data.monthly_data.map((entry: MonthlyDataPoint, i: number) => (
                        <Cell key={i} fill={entry.net >= 0 ? CHART_GREEN : CHART_RED} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Bottom Charts Row */}
          <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
            {/* Income by Group */}
            <ChartCard title="Income by Group" icon={<PieChartIcon className="h-4 w-4 text-emerald-500" />}>
              <div className="h-64 flex items-center justify-center">
                {data.income_by_group.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.income_by_group}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        paddingAngle={3}
                        dataKey="total"
                        nameKey="name"
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {data.income_by_group.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No income data</p>
                )}
              </div>
            </ChartCard>

            {/* Expenses by Group */}
            <ChartCard title="Expenses by Group" icon={<PieChartIcon className="h-4 w-4 text-red-500" />}>
              <div className="h-64 flex items-center justify-center">
                {data.expenses_by_group.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.expenses_by_group}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        paddingAngle={3}
                        dataKey="total"
                        nameKey="name"
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {data.expenses_by_group.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No expense data</p>
                )}
              </div>
            </ChartCard>
          </div>

          {/* Monthly Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Table2 className="h-4 w-4 text-muted-foreground" />
                Monthly Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Month</th>
                      <th className="text-right py-3 px-4 font-medium">Income</th>
                      <th className="text-right py-3 px-4 font-medium">Pending</th>
                      <th className="text-right py-3 px-4 font-medium">Expenses</th>
                      <th className="text-right py-3 px-4 font-medium">Net</th>
                      <th className="text-right py-3 px-4 font-medium"># Fees</th>
                      <th className="text-right py-3 px-4 font-medium"># Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly_data.map((row: MonthlyDataPoint) => (
                      <tr key={row.month} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-medium">{getMonthYear(row.month)}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(row.collected)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-amber-600 dark:text-amber-400 tabular-nums">
                          {row.pending > 0 ? formatCurrency(row.pending) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-red-600 dark:text-red-400 tabular-nums">
                          {row.expenses > 0 ? formatCurrency(row.expenses) : '—'}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-medium tabular-nums ${row.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(row.net)}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">{row.income_count}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums">{row.expense_count}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="border-t-2 font-semibold bg-muted/20">
                      <td className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(data.summary.total_income)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatCurrency(data.summary.total_pending)}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 tabular-nums">
                        {formatCurrency(data.summary.total_expenses)}
                      </td>
                      <td className={`py-3 px-4 text-right tabular-nums ${data.summary.net_revenue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(data.summary.net_revenue)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">{data.summary.total_fee_count}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{data.summary.total_expense_count}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment Mode Breakdown */}
          <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                  Income by Payment Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.payment_mode_income.length > 0 ? (
                  <div className="space-y-2">
                    {data.payment_mode_income.map((pm) => (
                      <div key={pm.mode} className="flex items-center justify-between py-1">
                        <span className="text-sm capitalize">{pm.mode.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{pm.count} txns</span>
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(pm.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-red-500" />
                  Expenses by Payment Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.payment_mode_expenses.length > 0 ? (
                  <div className="space-y-2">
                    {data.payment_mode_expenses.map((pm) => (
                      <div key={pm.mode} className="flex items-center justify-between py-1">
                        <span className="text-sm capitalize">{pm.mode.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{pm.count} txns</span>
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(pm.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Print footer */}
          <div className="hidden print:block print-footer">
            GoSchool Transport Management — Income vs Expense Report
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Fiscal Year Select ──────────────────────────────────────────────────
function FiscalYearSelect({ value, onChange }: { value?: number; onChange: (val?: number) => void }) {
  const { data: fiscalYears, isLoading } = useQuery({
    queryKey: ['fiscal-years-for-report'],
    queryFn: async () => {
      const res = await axiosClient.get('/fiscal_years')
      return (res.data.data || []) as { id: number; name: string; isCurrent?: boolean }[]
    },
  })

  return (
    <SearchableSelect
      value={value ? String(value) : ''}
      onValueChange={(v) => onChange(v ? Number(v) : undefined)}
      options={[
        { label: 'All Fiscal Years', value: '' },
        ...(fiscalYears ?? []).map((fy) => ({
          label: fy.isCurrent ? `${fy.name} (Current)` : fy.name,
          value: String(fy.id),
        })),
      ]}
      placeholder="All Fiscal Years"
      loading={isLoading}
      className="h-9 w-44"
    />
  )
}
