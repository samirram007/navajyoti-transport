import { useState, useMemo, useEffect, useRef, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_protected/reports/pending-collection'
import axiosClient from '@/lib/axios-client'
import { useReportingPeriod } from '@/hooks/use-reporting-period'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { cn } from '@/lib/utils'
import {
  Wallet, TrendingUp, Download, FileText, Filter, RefreshCw,
  AlertTriangle, Clock, Hourglass, Users, BarChart3, ChevronDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts'
import { getPendingCollectionReportApi, downloadReportCsv, downloadReportXlsx, downloadReportPdf, type ReportFilters } from '../services'
import type { PendingFeeDetail, PendingMonthData, PendingDueRider } from '../schemas'

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

const CHART_GREEN = '#10b981'
const CHART_ORANGE = '#f97316'
const CHART_AMBER = '#f59e0b'

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

// ─── Stat Card ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, subtitle, sparklineData, sparklineColor }: {
  label: string; value: string | number; icon: any; color: string; subtitle?: string
  sparklineData?: { label: string; value: number }[]; sparklineColor?: string
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
        {sparklineData && sparklineData.length >= 2 && (
          <div className="mt-2 -mb-1">
            <ResponsiveContainer width="100%" height={28}>
              <LineChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor || '#6366f1'}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Status Badge ────────────────────────────────────────────────────────
function PendingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { label: string; color: string }> = {
    paid: { label: 'Paid', color: 'bg-green-100 !text-emerald-800 dark:bg-green-900/30 dark:!text-green-400' },
    partial: { label: 'Partial', color: 'bg-amber-100 !text-amber-800 dark:bg-amber-900/30 dark:!text-amber-400' },
    unpaid: { label: 'Unpaid', color: 'bg-red-100 !text-red-800 dark:bg-red-900/30 dark:!text-red-400' },
    due: { label: 'Due', color: 'bg-orange-100 !text-orange-800 dark:bg-orange-900/30 dark:!text-orange-400' },
    due_collected: { label: 'Due Collected', color: 'bg-purple-100 !text-purple-800 dark:bg-purple-900/30 dark:!text-purple-400' },
  }
  const s = styles[status?.toLowerCase()] || { label: status, color: 'bg-gray-100 !text-gray-800' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
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

// ─── Monthly Collection Table ────────────────────────────────────────────
function MonthlyCollectionTable({ months, showUnbilled = true }: { months: PendingMonthData[]; showUnbilled?: boolean }) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)

  const totalBilled = months.reduce((s, m) => s + m.billed, 0)
  const totalCollected = months.reduce((s, m) => s + m.collected, 0)
  const totalDueCollected = months.reduce((s, m) => s + (m.due_collected ?? 0), 0)
  const totalPending = months.reduce((s, m) => s + m.pending, 0)
  const totalDue = months.reduce((s, m) => s + (m.due ?? 0), 0)
  const totalFees = months.reduce((s, m) => s + m.fee_count, 0)
  const totalRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Monthly Collection Overview
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Click a month to expand fee details</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2.5 px-3 font-medium w-8"></th>
                <th className="text-left py-2.5 px-3 font-medium">Month</th>
                <th className="text-right py-2.5 px-3 font-medium">Billed</th>
                <th className="text-right py-2.5 px-3 font-medium">Collected</th>
                <th className="text-right py-2.5 px-3 font-medium">Due Collected</th>
                <th className="text-right py-2.5 px-3 font-medium">Pending</th>
                {showUnbilled && <th className="text-right py-2.5 px-3 font-medium">Due</th>}
                <th className="text-center py-2.5 px-3 font-medium">Fees</th>
                <th className="text-center py-2.5 px-3 font-medium">Riders</th>
                <th className="text-center py-2.5 px-3 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => {
                const rate = m.billed > 0 ? Math.round((m.collected / m.billed) * 100) : 0
                const hasPending = m.pending_fee_count > 0
                const hasDue = (m.due ?? 0) > 0
                const hasDueCollected = (m.due_collected ?? 0) > 0
                const dueCollectedFeeCount = m.fees.filter(f => (f.due_collected ?? 0) > 0).length
                const isExpanded = expandedMonth === m.month_id
                const dueRiderCount = m.due_riders?.length ?? 0
                return (
                  <Fragment key={`${m.fiscal_year_id}-${m.month_id}`}>
                    <tr
                      className={cn(
                        'border-b transition-colors cursor-pointer',
                        isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20'
                      )}
                      onClick={() => setExpandedMonth(isExpanded ? null : m.month_id)}
                    >
                      <td className="py-2 px-3 text-center">
                        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-180')} />
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium">{m.month_name}</span>
                        {m.fiscal_year_name && <span className="ml-1.5 text-xs text-muted-foreground">{m.fiscal_year_name}</span>}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{formatCurrency(m.billed)}</td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(m.collected)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <span className={hasDueCollected ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'text-muted-foreground'}>
                          {formatCurrency(m.due_collected ?? 0)}
                          {hasDueCollected && (
                            <span className="ml-1 text-[10px] opacity-70">({dueCollectedFeeCount})</span>
                          )}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <span className={hasPending ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}>
                          {formatCurrency(m.pending)}
                        </span>
                      </td>
                      {showUnbilled && (
                        <td className="py-2 px-3 text-right tabular-nums">
                          <span className={hasDue ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-muted-foreground'}>
                            {formatCurrency(m.due ?? 0)}
                          </span>
                        </td>
                      )}
                      <td className="py-2 px-3 text-center text-muted-foreground">{m.fee_count}</td>
                      <td className="py-2 px-3 text-center text-muted-foreground">{m.rider_count}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={cn(
                          'tabular-nums text-xs font-medium',
                          rate >= 100 ? 'text-emerald-600 dark:text-emerald-400'
                            : rate >= 50 ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        )}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={showUnbilled ? 10 : 9} className="p-0">
                          <div className="bg-muted/10 px-4 py-3 border-b">
                            {/* Pending fees */}
                            {m.fees.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fee Vouchers ({m.fees.length})</p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-1.5 px-2 font-medium">Voucher</th>
                                      <th className="text-left py-1.5 px-2 font-medium">Rider</th>
                                      <th className="text-left py-1.5 px-2 font-medium">School</th>
                                      <th className="text-right py-1.5 px-2 font-medium">Billed</th>
                                      <th className="text-right py-1.5 px-2 font-medium">Collected</th>
                                      <th className="text-right py-1.5 px-2 font-medium">Due Collected</th>
                                      <th className="text-right py-1.5 px-2 font-medium">Pending</th>
                                      <th className="text-center py-1.5 px-2 font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.fees.map((fee: PendingFeeDetail) => (
                                      <tr key={fee.fee_id} className="border-b last:border-0">
                                        <td className="py-1.5 px-2 font-medium">{fee.fee_no || '—'}</td>
                                        <td className="py-1.5 px-2">
                                          <span className="font-medium">{fee.rider_name}</span>
                                          {fee.rider_code && <span className="ml-1 text-muted-foreground">({fee.rider_code})</span>}
                                        </td>
                                        <td className="py-1.5 px-2 text-muted-foreground">{fee.school}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{formatCurrency(fee.billed)}</td>
                                        <td className="py-1.5 px-2 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(fee.collected)}</td>
                                        <td className="py-1.5 px-2 text-right text-purple-600 dark:text-purple-400 tabular-nums font-semibold">{formatCurrency(fee.due_collected ?? 0)}</td>
                                        <td className="py-1.5 px-2 text-right text-amber-600 dark:text-amber-400 tabular-nums font-semibold">{formatCurrency(fee.pending)}</td>
                                        <td className="py-1.5 px-2 text-center"><PendingStatusBadge status={fee.status} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {/* Due collection received in this month */}
                            {hasDueCollected && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                                  Due Collection Received ({dueCollectedFeeCount} fees · {formatCurrency(m.due_collected ?? 0)})
                                </p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-1.5 px-2 font-medium">Rider</th>
                                      <th className="text-left py-1.5 px-2 font-medium">School</th>
                                      <th className="text-right py-1.5 px-2 font-medium">Billed</th>
                                      <th className="text-right py-1.5 px-2 font-medium">Due Collected</th>
                                      <th className="text-center py-1.5 px-2 font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.fees.filter(f => (f.due_collected ?? 0) > 0).map((fee: PendingFeeDetail) => (
                                      <tr key={fee.fee_id} className="border-b last:border-0">
                                        <td className="py-1.5 px-2">
                                          <span className="font-medium">{fee.rider_name}</span>
                                          {fee.rider_code && <span className="ml-1 text-muted-foreground">({fee.rider_code})</span>}
                                        </td>
                                        <td className="py-1.5 px-2 text-muted-foreground">{fee.school}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{formatCurrency(fee.billed)}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-purple-600 dark:text-purple-400 font-semibold">{formatCurrency(fee.due_collected)}</td>
                                        <td className="py-1.5 px-2 text-center"><PendingStatusBadge status="due_collected" /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {/* Due riders */}
                            {showUnbilled && dueRiderCount > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">
                                  Not Yet Billed ({dueRiderCount} riders)
                                </p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-1.5 px-2 font-medium">Rider</th>
                                      <th className="text-left py-1.5 px-2 font-medium">Code</th>
                                      <th className="text-left py-1.5 px-2 font-medium">School</th>
                                      <th className="text-right py-1.5 px-2 font-medium">Pending (Prev Month)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.due_riders.map((rider: PendingDueRider) => (
                                      <tr key={rider.rider_id} className="border-b last:border-0">
                                        <td className="py-1.5 px-2 font-medium">{rider.rider_name}</td>
                                        <td className="py-1.5 px-2 text-muted-foreground">{rider.rider_code || '—'}</td>
                                        <td className="py-1.5 px-2 text-muted-foreground">{rider.school}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-orange-600 dark:text-orange-400 font-semibold">{formatCurrency(rider.pending_from_prev_month || rider.monthly_charge)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {m.fees.length === 0 && (!showUnbilled || dueRiderCount === 0) && (
                              <p className="text-xs text-muted-foreground text-center py-2">No data for this month.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            {months.length > 0 && (
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td></td>
                  <td className="py-2.5 px-3">Total</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(totalBilled)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(totalCollected)}</td>
                  <td className="py-2.5 px-3 text-right text-purple-600 dark:text-purple-400 tabular-nums">{formatCurrency(totalDueCollected)}</td>
                  <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(totalPending)}</td>
                  {showUnbilled && <td className="py-2.5 px-3 text-right text-orange-600 dark:text-orange-400 tabular-nums">{formatCurrency(totalDue)}</td>}
                  <td className="py-2.5 px-3 text-center">{totalFees}</td>
                  <td className="py-2.5 px-3 text-center">—</td>
                  <td className="py-2.5 px-3 text-center tabular-nums">{totalRate}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────
export function PendingCollectionReportPage() {
  const { getValue } = useUserInitialValues()
  const savedFiscalYearId = getValue('fiscalYearId')
  const defaultFyId = savedFiscalYearId ? Number(savedFiscalYearId) : undefined

  const navigate = useNavigate({ from: '/reports/pending-collection' })
  const search = Route.useSearch()

  // Local editing state (draft filters before Apply)
  const [draft, setDraft] = useState<ReportFilters>({})
  const [showUnbilled, setShowUnbilled] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Derive applied filters from URL search params + defaults
  const { from: periodFrom, to: periodTo, isLoading: periodLoading } = useReportingPeriod()
  useEffect(() => {
    if (periodLoading || initialized) return
    setInitialized(true)
    // Only apply defaults when URL has no filter params at all
    const hasAnyParam = search.from || search.to || search.fiscal_year_id || search.month_id || search.school_id || search.search
    if (!hasAnyParam) {
      navigate({ search: {
        from: periodFrom || undefined,
        to: periodTo || undefined,
        fiscal_year_id: defaultFyId,
      }, replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodLoading, periodFrom, periodTo, initialized])

  // Sync draft form state with URL search params (e.g. browser back/forward)
  useEffect(() => {
    setDraft({
      from: search.from || '',
      to: search.to || '',
      fiscal_year_id: search.fiscal_year_id,
      month_id: search.month_id,
      school_id: search.school_id,
      search: search.search || '',
    })
  }, [search.from, search.to, search.fiscal_year_id, search.month_id, search.school_id, search.search])

  // Applied filters = URL search params (what the API sees)
  const appliedFilters: ReportFilters = useMemo(() => ({
    from: search.from || undefined,
    to: search.to || undefined,
    fiscal_year_id: search.fiscal_year_id || undefined,
    month_id: search.month_id || undefined,
    school_id: search.school_id || undefined,
    search: search.search || undefined,
  }), [search.from, search.to, search.fiscal_year_id, search.month_id, search.school_id, search.search])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['pending-collection-report', appliedFilters],
    queryFn: () => getPendingCollectionReportApi(appliedFilters),
    enabled: true,
  })

  const updateSearch = (patch: Partial<ReportFilters>) => {
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
  }

  const handleApplyFilters = () => {
    navigate({
      search: {
        from: draft.from || undefined,
        to: draft.to || undefined,
        fiscal_year_id: draft.fiscal_year_id || undefined,
        month_id: draft.month_id || undefined,
        school_id: draft.school_id || undefined,
        search: draft.search || undefined,
      },
      replace: true,
    })
  }

  const handleReset = () => {
    setDraft({})
    navigate({
      search: {
        from: periodFrom || undefined,
        to: periodTo || undefined,
        fiscal_year_id: defaultFyId,
      },
      replace: true,
    })
  }

  const handleCsvExport = async () => {
    await downloadReportCsv('pending-collection', appliedFilters)
  }

  const handleXlsxExport = async () => {
    await downloadReportXlsx('pending-collection', appliedFilters)
  }

  const handlePdfExport = async () => {
    await downloadReportPdf('pending-collection', appliedFilters)
  }

  const sortedMonths = useMemo(() => {
    if (!data?.months) return []
    // Months with pending or due first, then by fiscal_year_id + month_id
    return [...data.months].sort((a, b) => {
      const aHasWork = (a.pending_fee_count > 0 || (a.due ?? 0) > 0) ? 1 : 0
      const bHasWork = (b.pending_fee_count > 0 || (b.due ?? 0) > 0) ? 1 : 0
      if (aHasWork !== bHasWork) return bHasWork - aHasWork
      if ((a.fiscal_year_id ?? 0) !== (b.fiscal_year_id ?? 0)) return (a.fiscal_year_id ?? 0) - (b.fiscal_year_id ?? 0)
      return (a.month_id ?? 0) - (b.month_id ?? 0)
    })
  }, [data?.months])

  // Last 3 months trend for sparklines (chronological order)
  const sparklineTrend = useMemo(() => {
    if (!sortedMonths.length) return null
    const last3 = sortedMonths.slice(-3)
    return {
      collected: last3.map(m => ({ label: m.month_name, value: m.collected })),
      pending: last3.map(m => ({ label: m.month_name, value: m.pending })),
      due: last3.map(m => ({ label: m.month_name, value: m.due ?? 0 })),
      billed: last3.map(m => ({ label: m.month_name, value: m.billed })),
      dueCollected: last3.map(m => ({ label: m.month_name, value: m.due_collected ?? 0 })),
    }
  }, [sortedMonths])

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
        <h1>Pending Collection Report (Month-wise)</h1>
        <div className="print-subtitle">GoSchool Transport Management</div>
        <div className="print-meta">
          <span>
            {data?.fiscal_year ? `FY: ${data.fiscal_year.name}` : 'All Periods'}
            {appliedFilters.search ? ` | Search: ${appliedFilters.search}` : ''}
          </span>
          <span>Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Collection</h1>
          <p className="text-sm text-muted-foreground">
            Month-wise collection, pending, and due fees for the fiscal year
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCsvExport} disabled={!data}>
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleXlsxExport} disabled={!data}>
            <Download className="h-4 w-4 mr-1.5" /> XLSX
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fiscal Year</label>
                <FiscalYearSelect
                  value={draft.fiscal_year_id}
                  onChange={(val) => setDraft(prev => ({ ...prev, fiscal_year_id: val }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Month</label>
                <MonthSelect
                  value={draft.month_id}
                  onChange={(val) => setDraft(prev => ({ ...prev, month_id: val }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">School</label>
                <SchoolSelect
                  value={draft.school_id}
                  onChange={(val) => setDraft(prev => ({ ...prev, school_id: val }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <Input
                  placeholder="Name, code, roll no..."
                  value={draft.search || ''}
                  onChange={(e) => setDraft(prev => ({ ...prev, search: e.target.value }))}
                  className="h-9 w-44"
                />
              </div>
              <Button size="sm" onClick={handleApplyFilters} disabled={isFetching}>
                <Filter className="h-4 w-4 mr-1.5" /> Apply
              </Button>
              <Button size="sm" variant="ghost" onClick={handleReset}>
                Reset
              </Button>
              <div className="border-l pl-3 ml-1">
                <button
                  type="button"
                  onClick={() => setShowUnbilled(v => !v)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    showUnbilled
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <div className={cn(
                    'h-3.5 w-3.5 rounded-full border-2 transition-colors',
                    showUnbilled ? 'border-orange-500 bg-orange-500' : 'border-muted-foreground/40 bg-transparent'
                  )} />
                  Unbilled Riders
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? <ReportSkeleton /> : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              label="Collected"
              value={formatCurrency(data.summary.total_collected)}
              icon={TrendingUp}
              color="text-emerald-600 dark:text-emerald-400"
              subtitle={`${data.summary.collection_rate}% collection rate`}
              sparklineData={sparklineTrend?.collected}
              sparklineColor="#10b981"
            />
            <StatCard
              label="Due Collected"
              value={formatCurrency(data.summary.total_due_collected ?? 0)}
              icon={Clock}
              color="text-purple-600 dark:text-purple-400"
              subtitle="Fees collected after due date"
              sparklineData={sparklineTrend?.dueCollected}
              sparklineColor="#a855f7"
            />
            <StatCard
              label="Pending"
              value={formatCurrency(data.summary.total_pending)}
              icon={Hourglass}
              color={data.summary.total_pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
              subtitle={`${data.summary.pending_fee_count} fees · ${data.summary.riders_with_pending} riders`}
              sparklineData={sparklineTrend?.pending}
              sparklineColor="#f59e0b"
            />
            <StatCard
              label="Due (Billed)"
              value={formatCurrency(data.summary.billed_due ?? 0)}
              icon={AlertTriangle}
              color={(data.summary.billed_due ?? 0) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}
              subtitle="Past-grace billed fees (matches dashboard)"
            />
            <StatCard
              label="Total Billed"
              value={formatCurrency(data.summary.total_billed)}
              icon={Wallet}
              color="text-blue-600 dark:text-blue-400"
              subtitle={`${data.summary.total_fee_count} fee vouchers · ${data.summary.month_count} months`}
              sparklineData={sparklineTrend?.billed}
              sparklineColor="#3b82f6"
            />
          </div>

          {/* Unbilled Due Summary */}
          {(data.summary.unbilled_due ?? 0) > 0 && (
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                    Unbilled Due: {formatCurrency(data.summary.unbilled_due ?? 0)}
                  </span>
                  <span className="text-xs text-orange-600/70 dark:text-orange-400/70">
                    ({data.summary.active_riders} active riders not yet billed)
                  </span>
                </div>
                <span className="text-xs text-orange-600/70 dark:text-orange-400/70">
                  Not included in dashboard totals
                </span>
              </CardContent>
            </Card>
          )}

          {/* Collection Chart */}
          {sortedMonths.length > 0 && (
            <ChartCard
              title="Collection Overview"
              icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedMonths.map(m => ({
                      name: m.month_name,
                      collected: m.collected,
                      dueCollected: m.due_collected ?? 0,
                      pending: m.pending,
                      due: m.due ?? 0,
                    }))}
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="collected" name="Collected" fill={CHART_GREEN} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dueCollected" name="Due Collected" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pending" fill={CHART_AMBER} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="due" name="Due" fill={CHART_ORANGE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {/* Monthly Collection Table */}
          {sortedMonths.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No fee data found for the selected filters.
              </CardContent>
            </Card>
          ) : (
            <MonthlyCollectionTable months={sortedMonths} showUnbilled={showUnbilled} />
          )}

          {/* Rider-wise Pending */}
          {sortedMonths.length > 0 && (
            <RiderWiseView months={sortedMonths} showUnbilled={showUnbilled} />
          )}

          {/* Due Collection Received */}
          {sortedMonths.length > 0 && (
            <DueCollectionReceived months={sortedMonths} />
          )}

          {/* Print footer */}
          <div className="hidden print:block print-footer">
            GoSchool Transport Management — Pending Collection Report
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Due Collection Received ─────────────────────────────────────────────
interface DueCollectionFee {
  fee_id: number
  fee_no: string | null
  rider_id: number | null
  rider_name: string
  rider_code: string | null
  school: string
  month_name: string
  due_collected: number
  billed: number
  collected: number
}

function DueCollectionReceived({ months }: { months: PendingMonthData[] }) {
  const [search, setSearch] = useState('')

  const { dueFees, totalDueCollected, riderMap } = useMemo(() => {
    const fees: DueCollectionFee[] = []
    const rMap = new Map<number, { name: string; code: string | null; school: string; total: number; months: Set<string> }>()
    let total = 0

    for (const month of months) {
      for (const fee of month.fees) {
        if ((fee.due_collected ?? 0) <= 0) continue
        fees.push({
          fee_id: fee.fee_id,
          fee_no: fee.fee_no,
          rider_id: fee.rider_id,
          rider_name: fee.rider_name,
          rider_code: fee.rider_code,
          school: fee.school,
          month_name: month.month_name,
          due_collected: fee.due_collected,
          billed: fee.billed,
          collected: fee.collected,
        })
        total += fee.due_collected
        if (fee.rider_id) {
          const existing = rMap.get(fee.rider_id)
          if (existing) {
            existing.total += fee.due_collected
            existing.months.add(month.month_name)
          } else {
            rMap.set(fee.rider_id, {
              name: fee.rider_name,
              code: fee.rider_code,
              school: fee.school,
              total: fee.due_collected,
              months: new Set([month.month_name]),
            })
          }
        }
      }
    }

    return { dueFees: fees, totalDueCollected: total, riderMap: rMap }
  }, [months])

  const filteredFees = useMemo(() => {
    if (!search) return dueFees
    const q = search.toLowerCase()
    return dueFees.filter(f =>
      f.rider_name.toLowerCase().includes(q) ||
      (f.rider_code ?? '').toLowerCase().includes(q) ||
      f.school.toLowerCase().includes(q)
    )
  }, [dueFees, search])

  const filteredRiders = useMemo(() => {
    const arr = Array.from(riderMap.entries()).map(([id, r]) => ({ rider_id: id, ...r }))
    if (!search) return arr
    const q = search.toLowerCase()
    return arr.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.code ?? '').toLowerCase().includes(q) ||
      r.school.toLowerCase().includes(q)
    )
  }, [riderMap, search])

  if (dueFees.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-purple-600 dark:text-purple-400">●</span>
              Due Collection Received
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Fees collected after their due date · {filteredRiders.length} riders · {filteredFees.length} fee entries
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 tabular-nums">
              Total: {formatCurrency(totalDueCollected)}
            </span>
            <Input
              placeholder="Search rider, code, school..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-56 text-xs"
            />
          </div>
        </div>
      </CardHeader>

      {/* Rider Summary */}
      <CardContent className="pb-0">
        <div className="flex flex-wrap gap-2">
          {filteredRiders.map(r => (
            <span key={r.rider_id} className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-3 py-1.5 text-xs">
              <span className="font-medium text-purple-800 dark:text-purple-300">{r.name}</span>
              {r.code && <span className="text-purple-500 dark:text-purple-400">({r.code})</span>}
              <span className="text-purple-600 dark:text-purple-400 font-semibold tabular-nums">{formatCurrency(r.total)}</span>
              <span className="text-purple-400 dark:text-purple-500 text-[10px]">{Array.from(r.months).join(', ')}</span>
            </span>
          ))}
        </div>
      </CardContent>

      {/* Detailed Table */}
      <CardContent className="p-0 pt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2.5 px-3 font-medium">Rider</th>
                <th className="text-left py-2.5 px-3 font-medium">School</th>
                <th className="text-left py-2.5 px-3 font-medium">Month</th>
                <th className="text-left py-2.5 px-3 font-medium">Voucher</th>
                <th className="text-right py-2.5 px-3 font-medium">Billed</th>
                <th className="text-right py-2.5 px-3 font-medium">Due Collected</th>
                <th className="text-center py-2.5 px-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredFees.map((fee, i) => (
                <tr key={`${fee.fee_id}-${i}`} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3">
                    <div className="font-medium">{fee.rider_name}</div>
                    {fee.rider_code && <div className="text-xs text-muted-foreground">{fee.rider_code}</div>}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground text-xs max-w-[120px] truncate" title={fee.school}>{fee.school}</td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center rounded-md bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                      {fee.month_name}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs font-medium">{fee.fee_no || '—'}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{formatCurrency(fee.billed)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">{formatCurrency(fee.due_collected)}</span>
                  </td>
                  <td className="py-2 px-3 text-center"><PendingStatusBadge status="due_collected" /></td>
                </tr>
              ))}
              {filteredFees.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No due collections found.</td>
                </tr>
              )}
            </tbody>
            {filteredFees.length > 0 && (
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="py-2.5 px-3" colSpan={4}>Total Due Collection Received</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{formatCurrency(filteredFees.reduce((s, f) => s + f.billed, 0))}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-purple-600 dark:text-purple-400">{formatCurrency(filteredFees.reduce((s, f) => s + f.due_collected, 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Rider-wise View ─────────────────────────────────────────────────────
interface RiderAgg {
  rider_id: number
  rider_name: string
  rider_code: string | null
  school: string
  total_billed: number
  total_collected: number
  total_pending: number
  total_due: number
  total_due_collected: number
  months: { month_name: string; billed: number; collected: number; due_collected: number; pending: number }[]
  fee_count: number
  status: 'paid' | 'partial' | 'unpaid' | 'due' | 'due_collected'
}

function RiderWiseView({ months, showUnbilled = true }: { months: PendingMonthData[]; showUnbilled?: boolean }) {
  const [search, setSearch] = useState('')

  const riders = useMemo(() => {
    const map = new Map<number, RiderAgg>()
    const dueMap = new Map<number, { rider_name: string; rider_code: string | null; school: string; charge: number }>()

    for (const month of months) {
      // Collect billed riders from fee vouchers
      for (const fee of month.fees) {
        if (! fee.rider_id) continue
        let agg = map.get(fee.rider_id)
        if (! agg) {
          agg = {
            rider_id: fee.rider_id,
            rider_name: fee.rider_name,
            rider_code: fee.rider_code,
            school: fee.school,
            total_billed: 0,
            total_collected: 0,
            total_pending: 0,
            total_due: 0,
            total_due_collected: 0,
            months: [],
            fee_count: 0,
            status: 'paid',
          }
          map.set(fee.rider_id, agg)
        }
        agg.total_billed += fee.billed
        agg.total_collected += fee.collected
        agg.total_pending += fee.pending
        agg.total_due_collected += fee.due_collected ?? 0
        agg.fee_count++
        agg.months.push({
          month_name: month.month_name,
          billed: fee.billed,
          collected: fee.collected,
          due_collected: fee.due_collected ?? 0,
          pending: fee.pending,
        })
      }

      // Collect due riders (only when showUnbilled is on)
      if (showUnbilled) {
        for (const dr of month.due_riders ?? []) {
          dueMap.set(dr.rider_id, { rider_name: dr.rider_name, rider_code: dr.rider_code, school: dr.school, charge: dr.monthly_charge })
        }
      }
    }

    // Add due-only riders (only when showUnbilled is on)
    if (showUnbilled) {
      for (const [id, dr] of dueMap) {
        if (! map.has(id)) {
          map.set(id, {
            rider_id: id,
            rider_name: dr.rider_name,
            rider_code: dr.rider_code,
            school: dr.school,
            total_billed: 0,
            total_collected: 0,
            total_pending: 0,
            total_due: dr.charge * months.length,
            total_due_collected: 0,
            months: [],
            fee_count: 0,
            status: 'due',
          })
        }
      }
    }

    // Compute status
    for (const agg of map.values()) {
      if (agg.fee_count === 0 && agg.total_due > 0) {
        agg.status = 'due'
      } else if (agg.total_pending > 0) {
        agg.status = agg.total_collected > 0 ? 'partial' : 'unpaid'
      } else if (agg.total_due_collected > 0) {
        agg.status = 'due_collected'
      } else {
        agg.status = 'paid'
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      // Due/pending first
      const order: Record<string, number> = { due: 0, unpaid: 1, partial: 2, due_collected: 3, paid: 4 }
      const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4)
      if (diff !== 0) return diff
      return a.rider_name.localeCompare(b.rider_name)
    })
  }, [months, showUnbilled])

  const filtered = useMemo(() => {
    if (! search) return riders
    const q = search.toLowerCase()
    return riders.filter(r =>
      r.rider_name.toLowerCase().includes(q) ||
      (r.rider_code ?? '').toLowerCase().includes(q) ||
      r.school.toLowerCase().includes(q)
    )
  }, [riders, search])

  const statusStyles: Record<string, string> = {
    paid: 'bg-green-100 !text-emerald-800 dark:bg-green-900/30 dark:!text-green-400',
    partial: 'bg-amber-100 !text-amber-800 dark:bg-amber-900/30 dark:!text-amber-400',
    unpaid: 'bg-red-100 !text-red-800 dark:bg-red-900/30 dark:!text-red-400',
    due: 'bg-orange-100 !text-orange-800 dark:bg-orange-900/30 dark:!text-orange-400',
    due_collected: 'bg-purple-100 !text-purple-800 dark:bg-purple-900/30 dark:!text-purple-400',
  }
  const statusLabel: Record<string, string> = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid', due: 'Due', due_collected: 'Due Collected' }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Rider-wise Pending Overview</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} riders · aggregated across all months</p>
          </div>
          <Input
            placeholder="Search rider, code, school..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-56 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2.5 px-3 font-medium">Rider</th>
                <th className="text-left py-2.5 px-3 font-medium">School</th>
                <th className="text-right py-2.5 px-3 font-medium">Billed</th>
                <th className="text-right py-2.5 px-3 font-medium">Collected</th>
                <th className="text-right py-2.5 px-3 font-medium">Due Collected</th>
                <th className="text-right py-2.5 px-3 font-medium">Pending</th>
                <th className="text-right py-2.5 px-3 font-medium">Due</th>
                <th className="text-center py-2.5 px-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.rider_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3">
                    <div className="font-medium">{r.rider_name}</div>
                    {r.rider_code && <div className="text-xs text-muted-foreground">{r.rider_code}</div>}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground text-xs max-w-[120px] truncate" title={r.school}>{r.school}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{formatCurrency(r.total_billed)}</td>
                  <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(r.total_collected)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    <span className={r.total_due_collected > 0 ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'text-muted-foreground'}>
                      {formatCurrency(r.total_due_collected)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    <span className={r.total_pending > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}>
                      {formatCurrency(r.total_pending)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    <span className={r.total_due > 0 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-muted-foreground'}>
                      {formatCurrency(r.total_due)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[r.status] ?? ''}`}>
                      {statusLabel[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No riders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}



// ─── Fiscal Year Select ──────────────────────────────────────────────────
function FiscalYearSelect({ value, onChange }: { value?: number; onChange: (val?: number) => void }) {
  const { data: fiscalYears, isLoading } = useQuery({
    queryKey: ['fiscal-years-for-pending-report'],
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
      placeholder="All FY"
      loading={isLoading}
      className="h-9 w-40"
    />
  )
}

// ─── Month Select ────────────────────────────────────────────────────────
function MonthSelect({ value, onChange }: { value?: number; onChange: (val?: number) => void }) {
  const { data: months, isLoading } = useQuery({
    queryKey: ['months-for-pending-report'],
    queryFn: async () => {
      const res = await axiosClient.get('/months')
      return (res.data.data || []) as { id: number; name: string; number: number }[]
    },
  })

  return (
    <SearchableSelect
      value={value ? String(value) : ''}
      onValueChange={(v) => onChange(v ? Number(v) : undefined)}
      options={[
        { label: 'All Months', value: '' },
        ...(months ?? []).map((m) => ({ label: m.name, value: String(m.id) })),
      ]}
      placeholder="All Months"
      loading={isLoading}
      className="h-9 w-40"
    />
  )
}

// ─── School Select ───────────────────────────────────────────────────────
function SchoolSelect({ value, onChange }: { value?: number; onChange: (val?: number) => void }) {
  const { data: schools, isLoading } = useQuery({
    queryKey: ['schools-for-pending-report'],
    queryFn: async () => {
      const res = await axiosClient.get('/schools?per_page=500&page=1')
      return (res.data.data || []) as { id: number; name: string }[]
    },
  })

  return (
    <SearchableSelect
      value={value ? String(value) : ''}
      onValueChange={(v) => onChange(v ? Number(v) : undefined)}
      options={[
        { label: 'All Schools', value: '' },
        ...(schools ?? []).map((s) => ({ label: s.name, value: String(s.id) })),
      ]}
      placeholder="All Schools"
      loading={isLoading}
      className="h-9 w-40"
    />
  )
}
