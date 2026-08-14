import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { useReportingPeriod } from '@/hooks/use-reporting-period'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { cn } from '@/lib/utils'
import {
  Wallet, TrendingUp, Download, FileText, Filter, RefreshCw,
  AlertTriangle, Clock, Hourglass, ChevronDown, Users,
} from 'lucide-react'
import { getPendingCollectionReportApi, downloadReportCsv, type ReportFilters } from '../services'
import type { PendingFeeDetail, PendingMonthData } from '../schemas'

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
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

// ─── Status Badge ────────────────────────────────────────────────────────
function PendingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { label: string; color: string }> = {
    paid: { label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    partial: { label: 'Partial', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    unpaid: { label: 'Unpaid', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  }
  const s = styles[status?.toLowerCase()] || { label: status, color: 'bg-gray-100 text-gray-800' }
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

// ─── Month Detail Card ───────────────────────────────────────────────────
function MonthCard({ month }: { month: PendingMonthData }) {
  const [expanded, setExpanded] = useState(month.pending > 0)
  const hasPending = month.pending_fee_count > 0

  return (
    <Card className={cn('transition-shadow duration-200', hasPending && 'hover:shadow-elevation-3')}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left"
      >
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              hasPending
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-green-100 dark:bg-green-900/30'
            )}>
              <Clock className={cn('h-4 w-4', hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400')} />
            </div>
            <div>
              <div className="font-medium">
                {month.month_name}
                {month.fiscal_year_name && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">{month.fiscal_year_name}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {hasPending
                  ? `${month.pending_fee_count} of ${month.fee_count} fees pending · ${month.rider_count} riders`
                  : `${month.fee_count} fees · fully collected`}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">Billed <span className="font-medium text-foreground tabular-nums">{formatCurrency(month.billed)}</span></span>
            <span className="text-muted-foreground">Collected <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(month.collected)}</span></span>
            <span className={cn('text-muted-foreground', hasPending && 'font-medium')}>
              Pending{' '}
              <span className={cn(
                'tabular-nums',
                hasPending ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-green-600 dark:text-green-400'
              )}>
                {formatCurrency(month.pending)}
              </span>
            </span>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')} />
          </div>
        </CardContent>
      </button>

      {expanded && (
        <CardContent className="p-0 border-t">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2.5 px-3 font-medium">Voucher</th>
                  <th className="text-left py-2.5 px-3 font-medium">Date</th>
                  <th className="text-left py-2.5 px-3 font-medium">Rider</th>
                  <th className="text-left py-2.5 px-3 font-medium">School</th>
                  <th className="text-right py-2.5 px-3 font-medium">Billed</th>
                  <th className="text-right py-2.5 px-3 font-medium">Collected</th>
                  <th className="text-right py-2.5 px-3 font-medium">Pending</th>
                  <th className="text-left py-2.5 px-3 font-medium">Mode</th>
                  <th className="text-center py-2.5 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {month.fees.map((fee: PendingFeeDetail) => (
                  <tr key={fee.fee_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 text-xs font-medium">{fee.fee_no || '—'}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{fee.fee_date || '—'}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{fee.rider_name}</span>
                        {fee.rider_code && (
                          <span className="text-xs text-muted-foreground">{fee.rider_code}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground max-w-[120px] truncate" title={fee.school}>
                      {fee.school}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{formatCurrency(fee.billed)}</td>
                    <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(fee.collected)}</td>
                    <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400 tabular-nums font-semibold">
                      {formatCurrency(fee.pending)}
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground capitalize">{fee.payment_mode || '—'}</td>
                    <td className="py-2 px-3 text-center">
                      <PendingStatusBadge status={fee.status} />
                    </td>
                  </tr>
                ))}
                {month.fees.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                      No pending fees for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────
export function PendingCollectionReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    from: '',
    to: '',
    fiscal_year_id: undefined,
    month_id: undefined,
    school_id: undefined,
    search: '',
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
    queryKey: ['pending-collection-report', appliedFilters],
    queryFn: () => getPendingCollectionReportApi(appliedFilters),
    enabled: true,
  })

  const handleApplyFilters = () => {
    setAppliedFilters({
      from: filters.from || undefined,
      to: filters.to || undefined,
      fiscal_year_id: filters.fiscal_year_id || undefined,
      month_id: filters.month_id || undefined,
      school_id: filters.school_id || undefined,
      search: filters.search || undefined,
    })
  }

  const handleReset = () => {
    setFilters({ from: periodFrom || '', to: periodTo || '', fiscal_year_id: undefined, month_id: undefined, school_id: undefined, search: '' })
    setAppliedFilters({ from: periodFrom || undefined, to: periodTo || undefined })
  }

  const handleCsvExport = async () => {
    await downloadReportCsv('pending-collection', appliedFilters)
  }

  const handlePdfExport = () => {
    window.print()
  }

  const sortedMonths = useMemo(() => {
    if (!data?.months) return []
    // Months with pending first, then by name
    return [...data.months].sort((a, b) => {
      if (a.pending_fee_count > 0 && b.pending_fee_count === 0) return -1
      if (a.pending_fee_count === 0 && b.pending_fee_count > 0) return 1
      return (a.month_name || '').localeCompare(b.month_name || '')
    })
  }, [data?.months])

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
            Month-wise pending fees with summary and detailed breakdown
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
                  className="h-9 w-40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To Date</label>
                <Input
                  type="date"
                  value={filters.to || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                  className="h-9 w-40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fiscal Year</label>
                <FiscalYearSelect
                  value={filters.fiscal_year_id}
                  onChange={(val) => setFilters(prev => ({ ...prev, fiscal_year_id: val }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Month</label>
                <MonthSelect
                  value={filters.month_id}
                  onChange={(val) => setFilters(prev => ({ ...prev, month_id: val }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">School</label>
                <SchoolSelect
                  value={filters.school_id}
                  onChange={(val) => setFilters(prev => ({ ...prev, school_id: val }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <Input
                  placeholder="Name, code, roll no..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="h-9 w-44"
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
              label="Total Billed"
              value={formatCurrency(data.summary.total_billed)}
              icon={Wallet}
              color="text-blue-600 dark:text-blue-400"
              subtitle={`${data.summary.total_fee_count} fee vouchers`}
            />
            <StatCard
              label="Total Collected"
              value={formatCurrency(data.summary.total_collected)}
              icon={TrendingUp}
              color="text-emerald-600 dark:text-emerald-400"
              subtitle={`${data.summary.collection_rate}% collection rate`}
            />
            <StatCard
              label="Pending Balance"
              value={formatCurrency(data.summary.total_pending)}
              icon={Hourglass}
              color={data.summary.total_pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
              subtitle={`${data.summary.pending_fee_count} fees · ${data.summary.riders_with_pending} riders`}
            />
            <StatCard
              label="Months with Data"
              value={data.summary.month_count}
              icon={Users}
              color="text-purple-600 dark:text-purple-400"
              subtitle={`${data.months.filter(m => m.pending_fee_count > 0).length} with pending fees`}
            />
          </div>

          {/* Month-wise Detailed Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Month-wise Details</h2>
              {appliedFilters.month_id && (
                <span className="text-xs text-muted-foreground">(filtered by month)</span>
              )}
            </div>
            {sortedMonths.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No fee data found for the selected filters.
                </CardContent>
              </Card>
            ) : (
              sortedMonths.map((month) => (
                <MonthCard key={`${month.fiscal_year_id ?? 0}-${month.month_id}`} month={month} />
              ))
            )}
          </div>

          {/* Print footer */}
          <div className="hidden print:block print-footer">
            GoSchool Transport Management — Pending Collection Report
          </div>
        </>
      ) : null}
    </div>
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
