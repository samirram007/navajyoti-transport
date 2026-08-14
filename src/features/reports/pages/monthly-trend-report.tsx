import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  TrendingUp, TrendingDown, Download, FileText, RefreshCw,
  AlertTriangle, BarChart3, LineChart, ArrowUpDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend,
} from 'recharts'
import { getMonthlyTrendReportApi, downloadReportCsv, type ReportFilters } from '../services'
import type { MonthlyTrendReport, YearTrend } from '../schemas'

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

const FY_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

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
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────
export function MonthlyTrendReportPage() {
  const [selectedFyIds, setSelectedFyIds] = useState<string>('')
  const [includeExpenses, setIncludeExpenses] = useState(true)
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({
    include_expenses: true,
  })

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['monthly-trend-report', appliedFilters],
    queryFn: () => getMonthlyTrendReportApi(appliedFilters),
    enabled: true,
  })

  const handleApplyFilters = () => {
    setAppliedFilters({
      fiscal_year_ids: selectedFyIds || undefined,
      include_expenses: includeExpenses,
    })
  }

  const handleReset = () => {
    setSelectedFyIds('')
    setIncludeExpenses(true)
    setAppliedFilters({ include_expenses: true })
  }

  const handleCsvExport = async () => {
    await downloadReportCsv('monthly-trend', appliedFilters)
  }

  const handlePdfExport = () => window.print()

  // Merge all FY data into chart-compatible format
  const chartData = useMemo(() => {
    if (!data?.years || !data.all_month_labels) return []
    return data.all_month_labels.map(month => {
      const point: any = { month: abbreviateMonth(month) }
      data.years.forEach((year: YearTrend) => {
        const md = year.monthly_data.find(m => m.month === month)
        point[`income_${year.fiscal_year.id}`] = md ? md.income : 0
        if (includeExpenses) {
          point[`expenses_${year.fiscal_year.id}`] = md ? md.expenses : 0
        }
      })
      return point
    })
  }, [data, includeExpenses])

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
        <h1>Monthly Collection Trend Report</h1>
        <div className="print-subtitle">GoSchool Transport Management</div>
        <div className="print-meta">
          <span>{data?.years?.length ? `${data.years.length} fiscal years` : 'All years'}</span>
          <span>Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Collection Trend</h1>
          <p className="text-sm text-muted-foreground">Compare fee collection trends across multiple fiscal years</p>
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
                <label className="text-xs font-medium text-muted-foreground">Fiscal Years</label>
                <MultiFiscalYearSelect
                  value={selectedFyIds}
                  onChange={setSelectedFyIds}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Show Expenses</label>
                <SearchableSelect
                  value={String(includeExpenses)}
                  onValueChange={(v) => setIncludeExpenses(v === 'true')}
                  options={[
                    { label: 'Include', value: 'true' },
                    { label: 'Hide', value: 'false' },
                  ]}
                  className="h-9 w-32"
                />
              </div>
              <Button size="sm" onClick={handleApplyFilters} disabled={isFetching}><BarChart3 className="h-4 w-4 mr-1.5" /> Apply</Button>
              <Button size="sm" variant="ghost" onClick={handleReset}>Reset</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? <ReportSkeleton /> : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total Income (All Years)" value={formatCurrency(data.summary.total_income_all_years)} icon={TrendingUp} color="text-emerald-600" subtitle={`${data.summary.years_count} fiscal years`} />
            <StatCard label="Total Expenses (All Years)" value={formatCurrency(data.summary.total_expenses_all_years)} icon={TrendingDown} color="text-red-600" />
            <StatCard label="Net (All Years)" value={formatCurrency(data.summary.net_all_years)} icon={ArrowUpDown} color={data.summary.net_all_years >= 0 ? 'text-blue-600' : 'text-red-600'} />
            <StatCard label="Years Compared" value={data.summary.years_count} icon={LineChart} color="text-purple-600" />
          </div>

          {/* Combined Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Monthly Income Comparison by Fiscal Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend />
                    {data.years.map((year: YearTrend, i: number) => (
                      <Bar
                        key={`income_${year.fiscal_year.id}`}
                        dataKey={`income_${year.fiscal_year.id}`}
                        name={`${year.fiscal_year.name} (Income)`}
                        fill={FY_COLORS[i % FY_COLORS.length]}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Year-over-year comparison table */}
          <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
            {data.years.map((year: YearTrend, i: number) => (
              <Card key={year.fiscal_year.id}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2" style={{ color: FY_COLORS[i % FY_COLORS.length] }}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: FY_COLORS[i % FY_COLORS.length] }} />
                    {year.fiscal_year.name}
                    {year.fiscal_year.is_current && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Current</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="px-4 py-2 flex items-center justify-between text-sm border-b bg-muted/20">
                    <span className="text-muted-foreground">Year Total</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-600 font-medium">{formatCurrency(year.total_income)}</span>
                      {includeExpenses && <span className="text-red-600 font-medium">{formatCurrency(year.total_expenses)}</span>}
                      <span className={`font-semibold ${year.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(year.net)}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 px-3 font-medium">Month</th>
                          <th className="text-right py-2 px-3 font-medium">Income</th>
                          {includeExpenses && <th className="text-right py-2 px-3 font-medium">Expenses</th>}
                          <th className="text-center py-2 px-3 font-medium">#</th>
                        </tr>
                      </thead>
                      <tbody>
                        {year.monthly_data.map((md) => (
                          <tr key={md.month} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-1.5 px-3 font-medium">{getMonthYear(md.month)}</td>
                            <td className="py-1.5 px-3 text-right text-emerald-600 tabular-nums">{formatCurrency(md.income)}</td>
                            {includeExpenses && <td className="py-1.5 px-3 text-right text-red-600 tabular-nums">{md.expenses > 0 ? formatCurrency(md.expenses) : '—'}</td>}
                            <td className="py-1.5 px-3 text-center text-muted-foreground tabular-nums">{md.income_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden print:block print-footer">GoSchool Transport Management — Monthly Collection Trend Report</div>
        </>
      ) : null}
    </div>
  )
}

// ─── Multi Fiscal Year Select ────────────────────────────────────────────
function MultiFiscalYearSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['fiscal-years-for-trend'],
    queryFn: async () => {
      const res = await axiosClient.get('/fiscal_years')
      return (res.data.data || []) as { id: number; name: string; isCurrent?: boolean }[]
    },
  })

  const selectedIds = value ? value.split(',').map(Number) : []

  const toggleFy = (id: number) => {
    const set = new Set(selectedIds)
    if (set.has(id)) {
      set.delete(id)
    } else {
      set.add(id)
    }
    onChange(Array.from(set).join(','))
  }

  const selectAll = () => {
    onChange(fiscalYears.map(fy => fy.id).join(','))
  }

  const clearAll = () => {
    onChange('')
  }

  return (
    <div className="w-56">
      <div className="flex gap-1 mb-1">
        <button type="button" onClick={selectAll} className="text-[10px] text-primary underline underline-offset-2 hover:no-underline">All</button>
        <span className="text-[10px] text-muted-foreground">·</span>
        <button type="button" onClick={clearAll} className="text-[10px] text-muted-foreground underline underline-offset-2 hover:no-underline">None</button>
      </div>
      <div className="border rounded-md p-1 max-h-32 overflow-y-auto space-y-0.5">
        {fiscalYears.map((fy) => {
          const isSelected = selectedIds.includes(fy.id)
          return (
            <label
              key={fy.id}
              className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleFy(fy.id)}
                className="accent-primary h-3 w-3"
              />
              <span className="truncate">{fy.name}</span>
              {fy.isCurrent && <span className="text-[8px] bg-primary/10 text-primary px-1 rounded-full shrink-0">Current</span>}
            </label>
          )
        })}
      </div>
      <p className="text-[9px] text-muted-foreground mt-1">{selectedIds.length} selected</p>
    </div>
  )
}
