import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_protected/reports/school-fee-collection'
import axiosClient from '@/lib/axios-client'
import { useReportingPeriod } from '@/hooks/use-reporting-period'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Building2, TrendingUp, Download, FileText, Filter, RefreshCw,
  AlertTriangle, Users, ArrowUpDown,
} from 'lucide-react'
import { getSchoolFeeCollectionReportApi, downloadReportCsv, type ReportFilters } from '../services'
import type { SchoolFeeCollectionReport, SchoolFeeData } from '../schemas'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

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

export function SchoolFeeCollectionReportPage() {
  const { getValue } = useUserInitialValues()
  const savedFiscalYearId = getValue('fiscalYearId')
  const defaultFyId = savedFiscalYearId ? Number(savedFiscalYearId) : undefined

  const navigate = useNavigate({ from: '/reports/school-fee-collection' })
  const search = Route.useSearch()

  const [draft, setDraft] = useState<ReportFilters>({})
  const [initialized, setInitialized] = useState(false)

  const { from: periodFrom, to: periodTo, isLoading: periodLoading } = useReportingPeriod()
  useEffect(() => {
    if (periodLoading || initialized) return
    setInitialized(true)
    if (!search.from && !search.to && !search.fiscal_year_id) {
      navigate({ search: { from: periodFrom || undefined, to: periodTo || undefined, fiscal_year_id: defaultFyId }, replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodLoading, periodFrom, periodTo, initialized])

  useEffect(() => {
    setDraft({ from: search.from || '', to: search.to || '', fiscal_year_id: search.fiscal_year_id })
  }, [search.from, search.to, search.fiscal_year_id])

  const appliedFilters: ReportFilters = { from: search.from || undefined, to: search.to || undefined, fiscal_year_id: search.fiscal_year_id || undefined }

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['school-fee-collection-report', appliedFilters],
    queryFn: () => getSchoolFeeCollectionReportApi(appliedFilters),
    enabled: true,
  })

  const handleApplyFilters = () => {
    navigate({ search: { from: draft.from || undefined, to: draft.to || undefined, fiscal_year_id: draft.fiscal_year_id || undefined }, replace: true })
  }

  const handleReset = () => {
    setDraft({})
    navigate({ search: { from: periodFrom || undefined, to: periodTo || undefined, fiscal_year_id: defaultFyId }, replace: true })
  }

  const handleCsvExport = async () => {
    await downloadReportCsv('school-fee-collection', appliedFilters)
  }

  const handlePdfExport = () => window.print()

  const sortedSchools = useMemo(() => {
    if (!data?.schools) return []
    return [...data.schools].sort((a, b) => {
      const aHasFees = a.fee_count > 0
      const bHasFees = b.fee_count > 0
      if (aHasFees !== bHasFees) return aHasFees ? -1 : 1
      return b.total_paid - a.total_paid
    })
  }, [data?.schools])

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30"><AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" /></div>
        <h2 className="text-xl font-semibold">Failed to load report</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">{(error as Error)?.message || 'Could not fetch report data.'}</p>
        <Button onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="hidden print:block print-header">
        <h1>School-wise Fee Collection Report</h1>
        <div className="print-subtitle">GoSchool Transport Management</div>
        <div className="print-meta">
          <span>{data?.fiscal_year ? `FY: ${data.fiscal_year.name}` : 'All Periods'}</span>
          <span>Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School Fee Collection</h1>
          <p className="text-sm text-muted-foreground">Fees aggregated by school with summary statistics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCsvExport} disabled={!data}><Download className="h-4 w-4 mr-1.5" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={!data}><FileText className="h-4 w-4 mr-1.5" /> PDF</Button>
        </div>
      </div>

      <div className="print:hidden">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">From Date</label>
                <Input type="date" value={draft.from || ''} onChange={(e) => setDraft(prev => ({ ...prev, from: e.target.value }))} className="h-9 w-40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To Date</label>
                <Input type="date" value={draft.to || ''} onChange={(e) => setDraft(prev => ({ ...prev, to: e.target.value }))} className="h-9 w-40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fiscal Year</label>
                <FiscalYearSelect value={draft.fiscal_year_id} onChange={(val) => setDraft(prev => ({ ...prev, fiscal_year_id: val }))} />
              </div>
              <Button size="sm" onClick={handleApplyFilters} disabled={isFetching}><Filter className="h-4 w-4 mr-1.5" /> Apply</Button>
              <Button size="sm" variant="ghost" onClick={handleReset}>Reset</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? <ReportSkeleton /> : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total Fees" value={formatCurrency(data.summary.total_fees)} icon={TrendingUp} color="text-blue-600 dark:text-blue-400" subtitle={`${data.summary.total_fee_count} collections`} />
            <StatCard label="Total Collected" value={formatCurrency(data.summary.total_paid)} icon={TrendingUp} color="text-emerald-600 dark:text-emerald-400" subtitle={`${data.summary.collection_rate}% collection rate`} />
            <StatCard label="Pending Balance" value={formatCurrency(data.summary.total_balance)} icon={ArrowUpDown} color={data.summary.total_balance > 0 ? 'text-amber-600' : 'text-emerald-600'} />
            <StatCard label="Schools" value={`${data.summary.schools_with_fees} / ${data.summary.total_schools}`} icon={Building2} color="text-purple-600 dark:text-purple-400" subtitle={`${data.summary.total_riders_with_fees} riders`} />
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Collection Progress</span>
                  <span className="font-medium">{data.summary.collection_rate}% collected</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, data.summary.collection_rate)}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" /> School Fee Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-3 font-medium">#</th>
                      <th className="text-left py-3 px-3 font-medium">School</th>
                      <th className="text-center py-3 px-3 font-medium">Riders</th>
                      <th className="text-right py-3 px-3 font-medium">Total Fees</th>
                      <th className="text-right py-3 px-3 font-medium">Collected</th>
                      <th className="text-right py-3 px-3 font-medium">Balance</th>
                      <th className="text-center py-3 px-3 font-medium">Fees</th>
                      <th className="text-left py-3 px-3 font-medium">Last Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSchools.map((s: SchoolFeeData, idx: number) => (
                      <tr key={s.school_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground text-xs tabular-nums">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{s.school_name}</span>
                            <span className="text-xs text-muted-foreground">{s.school_code || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs bg-muted/50 rounded-full px-2 py-0.5">
                            <Users className="h-3 w-3" /> {s.rider_count}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(s.total_fees)}</td>
                        <td className={`py-2 px-3 text-right tabular-nums font-medium ${s.total_paid > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          {s.total_paid > 0 ? formatCurrency(s.total_paid) : '—'}
                        </td>
                        <td className={`py-2 px-3 text-right tabular-nums font-medium ${s.total_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                          {s.total_balance > 0 ? formatCurrency(s.total_balance) : '—'}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums text-muted-foreground">{s.fee_count || '—'}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{s.last_payment_date || '—'}</td>
                      </tr>
                    ))}
                    {sortedSchools.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No school data found.</td></tr>
                    )}
                  </tbody>
                  {sortedSchools.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-semibold bg-muted/20">
                        <td colSpan={3} className="py-3 px-3">Total ({sortedSchools.length} schools)</td>
                        <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(data.summary.total_fees)}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 tabular-nums">{formatCurrency(data.summary.total_paid)}</td>
                        <td className="py-3 px-3 text-right text-amber-600 tabular-nums">{formatCurrency(data.summary.total_balance)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="hidden print:block print-footer">GoSchool Transport Management — School Fee Collection Report</div>
        </>
      ) : null}
    </div>
  )
}

function FiscalYearSelect({ value, onChange }: { value?: number; onChange: (val?: number) => void }) {
  const { data: fiscalYears, isLoading } = useQuery({
    queryKey: ['fiscal-years-for-school-report'],
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
