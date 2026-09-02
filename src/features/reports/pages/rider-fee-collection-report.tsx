import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_protected/reports/rider-fee-collection'
import axiosClient from '@/lib/axios-client'
import { useReportingPeriod } from '@/hooks/use-reporting-period'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Wallet, TrendingUp, Download, FileText, Filter, RefreshCw,
  AlertTriangle, Users, PieChart as PieChartIcon, ArrowUpDown,
} from 'lucide-react'
import { getRiderFeeCollectionReportApi, downloadReportCsv, type ReportFilters } from '../services'
import type { RiderFeeCollectionReport, RiderFeeData } from '../schemas'

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
function RiderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { label: string; color: string }> = {
    paid: { label: 'Paid', color: 'bg-green-100 !text-emerald-800 dark:bg-green-900/30 dark:!text-green-400' },
    partial: { label: 'Partial', color: 'bg-amber-100 !text-amber-800 dark:bg-amber-900/30 dark:!text-amber-400' },
    unpaid: { label: 'Unpaid', color: 'bg-red-100 !text-red-800 dark:bg-red-900/30 dark:!text-red-400' },
    no_fees: { label: 'No Fees', color: 'bg-gray-100 !text-gray-800 dark:bg-gray-800 dark:!text-gray-300' },
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

// ─── Main Page ──────────────────────────────────────────────────────────
export function RiderFeeCollectionReportPage() {
  const { getValue } = useUserInitialValues()
  const savedFiscalYearId = getValue('fiscalYearId')
  const defaultFyId = savedFiscalYearId ? Number(savedFiscalYearId) : undefined

  const navigate = useNavigate({ from: '/reports/rider-fee-collection' })
  const search = Route.useSearch()

  const [draft, setDraft] = useState<ReportFilters>({})
  const [initialized, setInitialized] = useState(false)

  const { from: periodFrom, to: periodTo, isLoading: periodLoading } = useReportingPeriod()
  useEffect(() => {
    if (periodLoading || initialized) return
    setInitialized(true)
    if (!search.from && !search.to && !search.fiscal_year_id && !search.school_id && !search.search) {
      navigate({ search: { from: periodFrom || undefined, to: periodTo || undefined, fiscal_year_id: defaultFyId }, replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodLoading, periodFrom, periodTo, initialized])

  useEffect(() => {
    setDraft({ from: search.from || '', to: search.to || '', fiscal_year_id: search.fiscal_year_id, school_id: search.school_id, search: search.search || '' })
  }, [search.from, search.to, search.fiscal_year_id, search.school_id, search.search])

  const appliedFilters: ReportFilters = { from: search.from || undefined, to: search.to || undefined, fiscal_year_id: search.fiscal_year_id || undefined, school_id: search.school_id || undefined, search: search.search || undefined }

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['rider-fee-collection-report', appliedFilters],
    queryFn: () => getRiderFeeCollectionReportApi(appliedFilters),
    enabled: true,
  })

  const handleApplyFilters = () => {
    navigate({ search: { from: draft.from || undefined, to: draft.to || undefined, fiscal_year_id: draft.fiscal_year_id || undefined, school_id: draft.school_id || undefined, search: draft.search || undefined }, replace: true })
  }

  const handleReset = () => {
    setDraft({})
    navigate({ search: { from: periodFrom || undefined, to: periodTo || undefined, fiscal_year_id: defaultFyId }, replace: true })
  }

  const handleCsvExport = async () => {
    await downloadReportCsv('rider-fee-collection', appliedFilters)
  }

  const handlePdfExport = () => {
    window.print()
  }

  // Sort riders by status: unpaid first, then partial, then paid
  const sortedRiders = useMemo(() => {
    if (!data?.riders) return []
    const statusOrder: Record<string, number> = { unpaid: 0, partial: 1, paid: 2, no_fees: 3 }
    return [...data.riders].sort((a, b) => {
      const sa = statusOrder[a.status] ?? 99
      const sb = statusOrder[b.status] ?? 99
      if (sa !== sb) return sa - sb
      return b.total_paid - a.total_paid
    })
  }, [data?.riders])

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
        <h1>Rider-wise Fee Collection Report</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Rider Fee Collection</h1>
          <p className="text-sm text-muted-foreground">
            Fees collected per rider with status breakdown
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fiscal Year</label>
                <FiscalYearSelect
                  value={draft.fiscal_year_id}
                  onChange={(val) => setDraft(prev => ({ ...prev, fiscal_year_id: val }))}
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
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? <ReportSkeleton /> : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Total Fees"
              value={formatCurrency(data.summary.total_fees)}
              icon={Wallet}
              color="text-blue-600 dark:text-blue-400"
              subtitle={`${data.summary.riders_with_fees} riders`}
            />
            <StatCard
              label="Total Collected"
              value={formatCurrency(data.summary.total_paid)}
              icon={TrendingUp}
              color="text-emerald-600 dark:text-emerald-400"
              subtitle={`${data.summary.collection_rate}% collection rate`}
            />
            <StatCard
              label="Pending Balance"
              value={formatCurrency(data.summary.total_balance)}
              icon={ArrowUpDown}
              color={data.summary.total_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
            />
            <StatCard
              label="Collection Status"
              value={`${data.summary.paid_count} / ${data.summary.partial_count} / ${data.summary.unpaid_count}`}
              icon={PieChartIcon}
              color="text-purple-600 dark:text-purple-400"
              subtitle="Paid / Partial / Unpaid"
            />
          </div>

          {/* Status Breakdown Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Collection Progress</span>
                  <span className="font-medium">{data.summary.collection_rate}% collected</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden flex">
                  {data.summary.paid_count > 0 && (
                    <div
                      className="bg-green-500 h-full transition-all"
                      style={{ width: `${(data.summary.paid_count / Math.max(1, data.summary.riders_with_fees)) * 100}%` }}
                      title={`Paid: ${data.summary.paid_count}`}
                    />
                  )}
                  {data.summary.partial_count > 0 && (
                    <div
                      className="bg-amber-500 h-full transition-all"
                      style={{ width: `${(data.summary.partial_count / Math.max(1, data.summary.riders_with_fees)) * 100}%` }}
                      title={`Partial: ${data.summary.partial_count}`}
                    />
                  )}
                  {data.summary.unpaid_count > 0 && (
                    <div
                      className="bg-red-500 h-full transition-all"
                      style={{ width: `${(data.summary.unpaid_count / Math.max(1, data.summary.riders_with_fees)) * 100}%` }}
                      title={`Unpaid: ${data.summary.unpaid_count}`}
                    />
                  )}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Paid ({data.summary.paid_count})</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Partial ({data.summary.partial_count})</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Unpaid ({data.summary.unpaid_count})</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rider Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Rider Fee Details
                {appliedFilters.search && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    (filtered by "{appliedFilters.search}")
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-3 font-medium">#</th>
                      <th className="text-left py-3 px-3 font-medium">Rider</th>
                      <th className="text-left py-3 px-3 font-medium">Class/Sec</th>
                      <th className="text-left py-3 px-3 font-medium">School</th>
                      <th className="text-right py-3 px-3 font-medium">Total Fees</th>
                      <th className="text-right py-3 px-3 font-medium">Paid</th>
                      <th className="text-right py-3 px-3 font-medium">Balance</th>
                      <th className="text-center py-3 px-3 font-medium">Fees</th>
                      <th className="text-left py-3 px-3 font-medium">Last Payment</th>
                      <th className="text-center py-3 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRiders.map((rider: RiderFeeData, idx: number) => (
                      <tr key={rider.rider_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground text-xs tabular-nums">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{rider.rider_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {[rider.rider_code, rider.roll_no].filter(Boolean).join(' · ') || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {[rider.class, rider.section].filter(Boolean).join(' - ') || '—'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground max-w-[120px] truncate" title={rider.school}>
                          {rider.school}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(rider.total_fees)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums font-medium">
                          {formatCurrency(rider.total_paid)}
                        </td>
                        <td className={`py-2 px-3 text-right tabular-nums font-medium ${rider.total_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                          {rider.total_balance > 0 ? formatCurrency(rider.total_balance) : '—'}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums text-muted-foreground">{rider.fee_count}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {rider.last_payment_date || '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <RiderStatusBadge status={rider.status} />
                        </td>
                      </tr>
                    ))}
                    {sortedRiders.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                          No fee data found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {sortedRiders.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-semibold bg-muted/20">
                        <td colSpan={4} className="py-3 px-3">Total ({sortedRiders.length} riders)</td>
                        <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(data.summary.total_fees)}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(data.summary.total_paid)}</td>
                        <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(data.summary.total_balance)}</td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Print footer */}
          <div className="hidden print:block print-footer">
            GoSchool Transport Management — Rider Fee Collection Report
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Fiscal Year Select ──────────────────────────────────────────────────
function FiscalYearSelect({ value, onChange }: { value?: number; onChange: (val?: number) => void }) {
  const { data: fiscalYears, isLoading } = useQuery({
    queryKey: ['fiscal-years-for-rider-report'],
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

// ─── School Select ───────────────────────────────────────────────────────
function SchoolSelect({ value, onChange }: { value?: number; onChange: (val?: number) => void }) {
  const { data: schools, isLoading } = useQuery({
    queryKey: ['schools-for-rider-report'],
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
