import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReportingPeriod } from '@/hooks/use-reporting-period'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Wallet, Receipt, TrendingUp, TrendingDown, Download, FileText,
  Filter, RefreshCw, AlertTriangle, CalendarDays, List, Sun,
} from 'lucide-react'
import { getDailyCollectionReportApi, downloadReportCsv } from '../services'
import type { DailyCollectionReport, Transaction, DailySummary } from '../schemas'

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
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
export function DailyCollectionReportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')

  // Default the report to the user's global reporting period (FY start → today)
  const { from: periodFrom, to: periodTo, isLoading: periodLoading } = useReportingPeriod()
  const periodAppliedRef = useRef(false)
  useEffect(() => {
    if (periodLoading || periodAppliedRef.current) return
    periodAppliedRef.current = true
    setFrom(periodFrom || '')
    setTo(periodTo || '')
    setAppliedFrom(periodFrom || '')
    setAppliedTo(periodTo || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodLoading, periodFrom, periodTo])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['daily-collection-report', appliedFrom, appliedTo],
    queryFn: () => getDailyCollectionReportApi({ from: appliedFrom, to: appliedTo }),
    enabled: true,
  })

  const handleApply = () => {
    setAppliedFrom(from)
    setAppliedTo(to)
  }

  const handleCsvExport = async () => {
    await downloadReportCsv('daily-collection', { from: appliedFrom, to: appliedTo })
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
        <h1>Daily Collection Report</h1>
        <div className="print-subtitle">GoSchool Transport Management</div>
        <div className="print-meta">
          <span>
            {appliedFrom && appliedTo
              ? `${appliedFrom} to ${appliedTo}`
              : 'This Month'}
          </span>
          <span>Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Collection Report</h1>
          <p className="text-sm text-muted-foreground">
            Day-by-day fee collections and expense details
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
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-44"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To Date</label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-44"
                />
              </div>
              <Button size="sm" onClick={handleApply} disabled={isFetching}>
                <Filter className="h-4 w-4 mr-1.5" /> Apply
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
              label="Total Collections"
              value={formatCurrency(data.summary.total_income)}
              icon={Wallet}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Total Expenses"
              value={formatCurrency(data.summary.total_expenses)}
              icon={Receipt}
              color="text-red-600 dark:text-red-400"
            />
            <StatCard
              label="Net"
              value={formatCurrency(data.summary.net)}
              icon={data.summary.net >= 0 ? TrendingUp : TrendingDown}
              color={data.summary.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}
            />
            <StatCard
              label="Total Transactions"
              value={data.summary.transaction_count}
              icon={List}
              color="text-purple-600 dark:text-purple-400"
              subtitle={`${formatDate(data.summary.from)} – ${formatDate(data.summary.to)}`}
            />
          </div>

          {/* Tabs: Daily Summary / All Transactions */}
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList className="print:hidden">
              <TabsTrigger value="daily" className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Daily Summary
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-1.5">
                <List className="h-4 w-4" /> All Transactions
              </TabsTrigger>
            </TabsList>

            {/* Daily Summary Tab */}
            <TabsContent value="daily" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    Day-wise Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-right py-3 px-4 font-medium">Collections</th>
                          <th className="text-right py-3 px-4 font-medium">Expenses</th>
                          <th className="text-right py-3 px-4 font-medium">Net</th>
                          <th className="text-right py-3 px-4 font-medium">Transactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.daily_summary.map((day: DailySummary) => (
                          <tr key={day.date} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 font-medium">{formatDate(day.date)}</td>
                            <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {day.total_income > 0 ? formatCurrency(day.total_income) : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right text-red-600 dark:text-red-400 tabular-nums">
                              {day.total_expenses > 0 ? formatCurrency(day.total_expenses) : '—'}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-medium tabular-nums ${day.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {day.net !== 0 ? formatCurrency(day.net) : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums">{day.transaction_count}</td>
                          </tr>
                        ))}
                        {/* Totals */}
                        <tr className="border-t-2 font-semibold bg-muted/20">
                          <td className="py-3 px-4">Total</td>
                          <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(data.summary.total_income)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 tabular-nums">
                            {formatCurrency(data.summary.total_expenses)}
                          </td>
                          <td className={`py-3 px-4 text-right tabular-nums ${data.summary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(data.summary.net)}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">{data.summary.transaction_count}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Transactions Tab */}
            <TabsContent value="all" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <List className="h-4 w-4 text-muted-foreground" />
                    All Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">Type</th>
                          <th className="text-left py-3 px-4 font-medium">Voucher No</th>
                          <th className="text-left py-3 px-4 font-medium">Rider / Description</th>
                          <th className="text-right py-3 px-4 font-medium">Amount</th>
                          <th className="text-right py-3 px-4 font-medium">Balance</th>
                          <th className="text-left py-3 px-4 font-medium">Payment</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.transactions.map((txn: Transaction, idx: number) => (
                          <tr key={`${txn.type}-${txn.id}-${idx}`} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4">{formatDate(txn.date)}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant={txn.type === 'fee' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                {txn.type === 'fee' ? 'Fee' : 'Expense'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs">{txn.voucher_no || '—'}</td>
                            <td className="py-2.5 px-4 max-w-[200px] truncate" title={txn.rider_name}>
                              {txn.type === 'fee' ? txn.rider_name : txn.description}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-medium tabular-nums ${txn.type === 'fee' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {txn.type === 'fee' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                              {txn.balance > 0 ? formatCurrency(txn.balance) : '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="text-xs capitalize">{txn.payment_mode?.replace(/_/g, ' ') || '—'}</span>
                            </td>
                            <td className="py-2.5 px-4">
                              <StatusBadge status={txn.status} type={txn.type} />
                            </td>
                          </tr>
                        ))}
                        {data.transactions.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                              No transactions found for the selected period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Print footer */}
          <div className="hidden print:block print-footer">
            GoSchool Transport Management — Daily Collection Report
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Status Badge ────────────────────────────────────────────────────────
function StatusBadge({ status, type }: { status: string; type: 'fee' | 'expense' }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  const s = status?.toLowerCase() || ''
  const style = styles[s] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${style}`}>
      {status || '—'}
    </span>
  )
}
