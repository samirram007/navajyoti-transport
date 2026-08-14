import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { useReportingPeriod } from '@/hooks/use-reporting-period'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Truck, TrendingUp, Download, FileText, Filter, RefreshCw,
  AlertTriangle, Users, ArrowUpDown,
} from 'lucide-react'
import { getVehicleFeeCollectionReportApi, downloadReportCsv, type ReportFilters } from '../services'
import type { VehicleFeeCollectionReport, VehicleFeeData } from '../schemas'

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
export function VehicleFeeCollectionReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    from: '',
    to: '',
    fiscal_year_id: undefined,
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
    queryKey: ['vehicle-fee-collection-report', appliedFilters],
    queryFn: () => getVehicleFeeCollectionReportApi(appliedFilters),
    enabled: true,
  })

  const handleApplyFilters = () => {
    setAppliedFilters({
      from: filters.from || undefined,
      to: filters.to || undefined,
      fiscal_year_id: filters.fiscal_year_id || undefined,
      search: filters.search || undefined,
    })
  }

  const handleReset = () => {
    setFilters({ from: periodFrom || '', to: periodTo || '', fiscal_year_id: undefined, search: '' })
    setAppliedFilters({ from: periodFrom || undefined, to: periodTo || undefined })
  }

  const handleCsvExport = async () => {
    await downloadReportCsv('vehicle-fee-collection', appliedFilters)
  }

  const handlePdfExport = () => {
    window.print()
  }

  // Sort vehicles: with fees first, then by total paid descending
  const sortedVehicles = useMemo(() => {
    if (!data?.vehicles) return []
    return [...data.vehicles].sort((a, b) => {
      const aHasFees = a.fee_count > 0
      const bHasFees = b.fee_count > 0
      if (aHasFees !== bHasFees) return aHasFees ? -1 : 1
      return b.total_paid - a.total_paid
    })
  }, [data?.vehicles])

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
        <h1>Vehicle-wise Fee Collection Report</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Vehicle Fee Collection</h1>
          <p className="text-sm text-muted-foreground">
            Fees collected per vehicle with summary statistics
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
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <Input
                  placeholder="Vehicle or rider name..."
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
              label="Total Fees"
              value={formatCurrency(data.summary.total_fees)}
              icon={TrendingUp}
              color="text-blue-600 dark:text-blue-400"
              subtitle={`${data.summary.total_fee_count} fee collections`}
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
              label="Vehicles"
              value={`${data.summary.vehicles_with_fees} / ${data.summary.total_vehicles}`}
              icon={Truck}
              color="text-purple-600 dark:text-purple-400"
              subtitle="with fees / total"
            />
          </div>

          {/* Collection Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Collection Progress</span>
                  <span className="font-medium">{data.summary.collection_rate}% collected</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, data.summary.collection_rate)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Vehicle Fee Details
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
                      <th className="text-left py-3 px-3 font-medium">Vehicle</th>
                      <th className="text-left py-3 px-3 font-medium">Type</th>
                      <th className="text-center py-3 px-3 font-medium">Capacity</th>
                      <th className="text-center py-3 px-3 font-medium">Riders</th>
                      <th className="text-right py-3 px-3 font-medium">Total Fees</th>
                      <th className="text-right py-3 px-3 font-medium">Collected</th>
                      <th className="text-right py-3 px-3 font-medium">Balance</th>
                      <th className="text-center py-3 px-3 font-medium">Fees</th>
                      <th className="text-left py-3 px-3 font-medium">Last Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVehicles.map((v: VehicleFeeData, idx: number) => (
                      <tr key={v.vehicle_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground text-xs tabular-nums">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{v.vehicle_name}</span>
                            <span className="text-xs text-muted-foreground">{v.registration_no || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{v.vehicle_type}</td>
                        <td className="py-2 px-3 text-center tabular-nums text-muted-foreground">{v.capacity}</td>
                        <td className="py-2 px-3 text-center tabular-nums">
                          <span className="inline-flex items-center gap-1 text-xs bg-muted/50 rounded-full px-2 py-0.5">
                            <Users className="h-3 w-3" />
                            {v.rider_count}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(v.total_fees)}</td>
                        <td className={`py-2 px-3 text-right tabular-nums font-medium ${v.total_paid > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          {v.total_paid > 0 ? formatCurrency(v.total_paid) : '—'}
                        </td>
                        <td className={`py-2 px-3 text-right tabular-nums font-medium ${v.total_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                          {v.total_balance > 0 ? formatCurrency(v.total_balance) : '—'}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums text-muted-foreground">{v.fee_count || '—'}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{v.last_payment_date || '—'}</td>
                      </tr>
                    ))}
                    {sortedVehicles.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                          No vehicle data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {sortedVehicles.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-semibold bg-muted/20">
                        <td colSpan={5} className="py-3 px-3">Total ({sortedVehicles.length} vehicles)</td>
                        <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(data.summary.total_fees)}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(data.summary.total_paid)}</td>
                        <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(data.summary.total_balance)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Print footer */}
          <div className="hidden print:block print-footer">
            GoSchool Transport Management — Vehicle Fee Collection Report
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Fiscal Year Select ──────────────────────────────────────────────────
function FiscalYearSelect({ value, onChange }: { value?: number; onChange: (val?: number) => void }) {
  const { data: fiscalYears, isLoading } = useQuery({
    queryKey: ['fiscal-years-for-vehicle-report'],
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
