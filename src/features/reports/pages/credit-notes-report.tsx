import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_protected/reports/credit-notes'
import { useReportingPeriod } from '@/hooks/use-reporting-period'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  BadgePercent, TrendingUp, Download, FileText, Filter, RefreshCw,
  AlertTriangle, ArrowUpDown, ReceiptText, Scale,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getCreditNotesReportApi, downloadReportCsv, type ReportFilters } from '../services'
import type { CreditNotesMonthData } from '../schemas'

const CHART_GREEN = 'hsl(152 60% 40%)'
const CHART_RED = 'hsl(0 72% 51%)'
const CHART_PURPLE = 'hsl(263 70% 50%)'

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function abbreviateMonth(month: string) {
  if (!month || month.length !== 7) return month
  const [y, m] = month.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(m) - 1]} ${y.slice(2)}`
}

// ─── Stat Card ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, subtitle }: {
  label: string; value: string | number; icon: any; color: string; subtitle?: string
}) {
  return (
    <Card className="hover:shadow-elevation-3 transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Chart Card ──────────────────────────────────────────────────────────
function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
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
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-medium tabular-nums">{formatCurrency(Number(p.value) || 0)}</span>
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
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────
export function CreditNotesReportPage() {
  const navigate = useNavigate({ from: '/reports/credit-notes' })
  const search = Route.useSearch()

  const [draft, setDraft] = useState<ReportFilters>({})
  const [initialized, setInitialized] = useState(false)

  const { from: periodFrom, to: periodTo, isLoading: periodLoading } = useReportingPeriod()
  useEffect(() => {
    if (periodLoading || initialized) return
    setInitialized(true)
    if (!search.from && !search.to) {
      navigate({ search: { from: periodFrom || undefined, to: periodTo || undefined }, replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodLoading, periodFrom, periodTo, initialized])

  useEffect(() => {
    setDraft({ from: search.from || '', to: search.to || '' })
  }, [search.from, search.to])

  const appliedFilters: ReportFilters = { from: search.from || undefined, to: search.to || undefined }

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['credit-notes-report', appliedFilters],
    queryFn: () => getCreditNotesReportApi(appliedFilters),
    enabled: true,
  })

  const handleApplyFilters = () => {
    navigate({ search: { from: draft.from || undefined, to: draft.to || undefined }, replace: true })
  }

  const handleReset = () => {
    setDraft({})
    navigate({ search: { from: periodFrom || undefined, to: periodTo || undefined }, replace: true })
  }

  const handleCsvExport = async () => {
    await downloadReportCsv('credit-notes', appliedFilters)
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
        <h1>Credit Notes Report (Issued vs Applied)</h1>
        <div className="print-subtitle">GoSchool Transport Management</div>
        <div className="print-meta">
          <span>
            {appliedFilters.from || appliedFilters.to
              ? `${appliedFilters.from || 'Start'} — ${appliedFilters.to || 'Today'}`
              : 'All Periods'}
          </span>
          <span>Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credit Notes</h1>
          <p className="text-sm text-muted-foreground">
            Credit issued (from cancelled vouchers) vs credit applied over time
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
                  value={draft.from || ''}
                  onChange={(e) => setDraft(prev => ({ ...prev, from: e.target.value }))}
                  className="h-9 w-40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To Date</label>
                <Input
                  type="date"
                  value={draft.to || ''}
                  onChange={(e) => setDraft(prev => ({ ...prev, to: e.target.value }))}
                  className="h-9 w-40"
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
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Credit Issued"
              value={formatCurrency(data.summary.total_issued)}
              icon={BadgePercent}
              color="text-purple-600 dark:text-purple-400"
              subtitle={`${data.summary.issued_count} note${data.summary.issued_count !== 1 ? 's' : ''}`}
            />
            <StatCard
              label="Credit Applied"
              value={formatCurrency(data.summary.total_applied)}
              icon={TrendingUp}
              color="text-emerald-600 dark:text-emerald-400"
              subtitle={`${data.summary.applied_count} application${data.summary.applied_count !== 1 ? 's' : ''}`}
            />
            <StatCard
              label="Net (In Range)"
              value={formatCurrency(data.summary.net)}
              icon={ArrowUpDown}
              color={data.summary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
              subtitle={`Opening balance: ${formatCurrency(data.summary.opening_balance)}`}
            />
            <StatCard
              label="Outstanding Balance"
              value={formatCurrency(data.summary.outstanding_balance)}
              icon={Scale}
              color={data.summary.outstanding_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
              subtitle="Live credit liability"
            />
          </div>

          {/* Chart */}
          <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
            <ChartCard title="Issued vs Applied per Month" icon={<BarChart className="h-4 w-4 text-purple-500" />}>
              <div className="h-72">
                {data.monthly_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthly_data.map(m => ({ ...m, month: abbreviateMonth(m.month) }))} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Bar dataKey="issued" name="Issued" fill={CHART_PURPLE} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="applied" name="Applied" fill={CHART_GREEN} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No credit activity in the selected period.
                  </div>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Net per Month (Issued − Applied)" icon={<ReceiptText className="h-4 w-4 text-blue-500" />}>
              <div className="h-72">
                {data.monthly_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthly_data.map(m => ({ ...m, month: abbreviateMonth(m.month) }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Bar dataKey="net" name="Net" radius={[4, 4, 0, 0]}>
                        {data.monthly_data.map((entry: CreditNotesMonthData, i: number) => (
                          <Cell key={i} fill={entry.net >= 0 ? CHART_GREEN : CHART_RED} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No credit activity in the selected period.
                  </div>
                )}
              </div>
            </ChartCard>
          </div>

          {/* Monthly Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                Month-wise Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-3 font-medium">Month</th>
                      <th className="text-right py-3 px-3 font-medium">Issued</th>
                      <th className="text-center py-3 px-3 font-medium">Notes</th>
                      <th className="text-right py-3 px-3 font-medium">Applied</th>
                      <th className="text-center py-3 px-3 font-medium">Uses</th>
                      <th className="text-right py-3 px-3 font-medium">Net</th>
                      <th className="text-right py-3 px-3 font-medium">Cumulative Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly_data.map((m) => (
                      <tr key={m.month} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-medium">{abbreviateMonth(m.month)}</td>
                        <td className="py-2 px-3 text-right text-purple-600 dark:text-purple-400 tabular-nums">{formatCurrency(m.issued)}</td>
                        <td className="py-2 px-3 text-center text-xs text-muted-foreground tabular-nums">{m.issued_count}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(m.applied)}</td>
                        <td className="py-2 px-3 text-center text-xs text-muted-foreground tabular-nums">{m.applied_count}</td>
                        <td className={`py-2 px-3 text-right tabular-nums font-medium ${m.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                        </td>
                        <td className={`py-2 px-3 text-right tabular-nums font-semibold ${m.cumulative_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                          {formatCurrency(m.cumulative_balance)}
                        </td>
                      </tr>
                    ))}
                    {data.monthly_data.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          No credit activity found for the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {data.monthly_data.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-semibold bg-muted/20">
                        <td className="py-3 px-3">Total</td>
                        <td className="py-3 px-3 text-right text-purple-600 dark:text-purple-400 tabular-nums">{formatCurrency(data.summary.total_issued)}</td>
                        <td className="py-3 px-3 text-center tabular-nums">{data.summary.issued_count}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(data.summary.total_applied)}</td>
                        <td className="py-3 px-3 text-center tabular-nums">{data.summary.applied_count}</td>
                        <td className={`py-3 px-3 text-right tabular-nums ${data.summary.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {data.summary.net >= 0 ? '+' : ''}{formatCurrency(data.summary.net)}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(data.summary.outstanding_balance)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Print footer */}
          <div className="hidden print:block print-footer">
            GoSchool Transport Management — Credit Notes Report
          </div>
        </>
      ) : null}
    </div>
  )
}
