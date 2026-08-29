import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFeesApi, getFiscalYearsApi } from '@/features/fees/services'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BadgeCheck, Ban, Minus, Wallet, TrendingUp, AlertTriangle, Filter, ChevronLeft, ChevronRight, CreditCard, Clock, Calendar, CalendarDays } from 'lucide-react'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

function getFeeStatus(fee: any): string {
  if (fee.isDeleted) return 'Cancelled'
  const total = Number(fee.totalAmount || 0)
  const paid = Number(fee.paidAmount || 0)
  const balance = Number(fee.balanceAmount || 0)
  if (balance === 0 && paid > 0) return 'Paid'
  if (paid === 0 && total > 0) return 'Unpaid'
  if (balance > 0) return 'Partial'
  return ''
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof BadgeCheck }> = {
  Paid: {
    label: 'Paid',
    color: 'bg-green-100 !text-emerald-800 dark:bg-green-900/30 dark:!text-green-400',
    icon: BadgeCheck,
  },
  Unpaid: {
    label: 'Unpaid',
    color: 'bg-red-100 !text-red-800 dark:bg-red-900/30 dark:!text-red-400',
    icon: Ban,
  },
  Partial: {
    label: 'Partial',
    color: 'bg-amber-100 !text-amber-800 dark:bg-amber-900/30 dark:!text-amber-400',
    icon: Minus,
  },
  Cancelled: {
    label: 'Cancelled',
    color: 'bg-slate-200 !text-slate-700 dark:bg-slate-700 dark:!text-slate-200',
    icon: Ban,
  },
}

const PAYMENT_MODE_STYLES: Record<string, { label: string; color: string; barColor: string }> = {
  cash:         { label: 'Cash',          color: 'bg-emerald-100 !text-emerald-800 dark:bg-emerald-900/30 dark:!text-emerald-400',   barColor: 'bg-emerald-500 dark:bg-emerald-400' },
  bank_transfer:{ label: 'Bank Transfer', color: 'bg-blue-100 !text-blue-800 dark:bg-blue-900/30 dark:!text-blue-400',             barColor: 'bg-blue-500 dark:bg-blue-400' },
  cheque:       { label: 'Cheque',        color: 'bg-amber-100 !text-amber-800 dark:bg-amber-900/30 dark:!text-amber-400',        barColor: 'bg-amber-500 dark:bg-amber-400' },
  card:         { label: 'Card',           color: 'bg-purple-100 !text-purple-800 dark:bg-purple-900/30 dark:!text-purple-400',      barColor: 'bg-purple-500 dark:bg-purple-400' },
  online:       { label: 'Online',         color: 'bg-indigo-100 !text-indigo-800 dark:bg-indigo-900/30 dark:!text-indigo-400',      barColor: 'bg-indigo-500 dark:bg-indigo-400' },
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface PaymentBreakdownItem {
  mode: string
  label: string
  color: string
  barColor: string
  totalPaid: number
  count: number
  percentage: number
}

const PAGE_SIZE = 10

interface RiderFeeSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  riderId: number
  riderName: string
}

export function RiderFeeSummaryDialog({
  open,
  onOpenChange,
  riderId,
  riderName,
}: RiderFeeSummaryDialogProps) {
  // ── Read the user-selected fiscal year from the navbar ──
  const { getValue, saveValue } = useUserInitialValues()
  const savedFiscalYearId = getValue('fiscalYearId')

  // ── Fetch fiscal year details for display ──
  const { data: fiscalYears = [], isLoading: fyLoading } = useQuery({
    queryKey: ['fiscal-years-rider-fee-summary'],
    queryFn: getFiscalYearsApi,
    staleTime: 5 * 60 * 1000,
  })

  // ── Local FY selector state (independent of navbar) ──
  const [localFyId, setLocalFyId] = useState<string>('')

  const selectedFiscalYear = fiscalYears.find(
    (fy: any) => String(fy.id) === String(localFyId),
  )

  // Date range derived from the selected fiscal year
  const fyStartDate = selectedFiscalYear?.startDate
    ? String(selectedFiscalYear.startDate).slice(0, 10)
    : ''
  const fyEndDate = selectedFiscalYear?.endDate
    ? String(selectedFiscalYear.endDate).slice(0, 10)
    : ''

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')
  const savedShowAll = getValue('feeSummaryShowAll') === 'true'
  const [showAll, setShowAll] = useState(savedShowAll)
  const [page, setPage] = useState(1)
  const [paymentMode, setPaymentMode] = useState('')
  const [appliedPaymentMode, setAppliedPaymentMode] = useState('')
  // Month filter: null = all months, string = "YYYY-MM" key
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const savedTab = getValue('feeSummaryTab') || 'monthly'
  const [activeTab, setActiveTab] = useState(savedTab)
  // Expanded fee rows in the vouchers table
  const [expandedFees, setExpandedFees] = useState<Set<number>>(new Set())
  const toggleFeeExpand = (id: number) => {
    setExpandedFees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Apply fiscal year dates as defaults when dialog opens
  useEffect(() => {
    if (open && !fyLoading) {
      // Seed local FY from navbar selection on first open
      if (!localFyId && savedFiscalYearId) {
        setLocalFyId(savedFiscalYearId)
      }
    }
  }, [open, fyLoading, savedFiscalYearId, localFyId])

  // When localFyId changes (or FY list loads), update the date range to match
  useEffect(() => {
    if (open && !fyLoading && localFyId) {
      const fy = fiscalYears.find((f: any) => String(f.id) === String(localFyId))
      if (fy) {
        const start = fy.startDate ? String(fy.startDate).slice(0, 10) : ''
        const end = fy.endDate ? String(fy.endDate).slice(0, 10) : ''
        setDateFrom(start)
        setDateTo(end)
        setAppliedFrom(start)
        setAppliedTo(end)
        setPage(1)
      }
    }
  }, [open, fyLoading, localFyId, fiscalYears])

  // Reset page when filters or view mode change
  useEffect(() => {
    setPage(1)
  }, [appliedFrom, appliedTo, appliedPaymentMode, showAll])

  // When selectedMonth changes, update date range to that month
  const handleMonthClick = (monthKey: string) => {
    if (selectedMonth === monthKey) {
      // Toggle off — restore full FY range
      setSelectedMonth(null)
      const fy = fiscalYears.find((f: any) => String(f.id) === String(localFyId))
      const start = fy?.startDate ? String(fy.startDate).slice(0, 10) : ''
      const end = fy?.endDate ? String(fy.endDate).slice(0, 10) : ''
      setDateFrom(start)
      setDateTo(end)
      setAppliedFrom(start)
      setAppliedTo(end)
    } else {
      setSelectedMonth(monthKey)
      const [yearStr, monthStr] = monthKey.split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      setDateFrom(monthStart)
      setDateTo(monthEnd)
      setAppliedFrom(monthStart)
      setAppliedTo(monthEnd)
    }
  }

  // ── Fetch current page (paginated) ──
  const { data: pageData, isLoading: pageLoading } = useQuery({
    queryKey: ['rider-fee-summary-page', riderId, appliedFrom, appliedTo, appliedPaymentMode, page],
    queryFn: () =>
      getFeesApi({
        filter_rider_id: riderId,
        filter_fee_date_from: appliedFrom || undefined,
        filter_fee_date_to: appliedTo || undefined,
        filter_payment_mode: appliedPaymentMode || undefined,
        page,
        per_page: PAGE_SIZE,
        sort_by: 'fee_date',
        sort_dir: 'desc',
      }),
    enabled: open && !showAll,
  })

  // ── Fetch all (for "all" mode and for summary totals) ──
  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['rider-fee-summary-all', riderId, appliedFrom, appliedTo, appliedPaymentMode],
    queryFn: () =>
      getFeesApi({
        filter_rider_id: riderId,
        filter_fee_date_from: appliedFrom || undefined,
        filter_fee_date_to: appliedTo || undefined,
        filter_payment_mode: appliedPaymentMode || undefined,
        per_page: 500,
        sort_by: 'fee_date',
        sort_dir: 'desc',
      }),
    enabled: open,
  })

  // ── Fetch ALL fees (no filters) for accurate due-till-current-month calc ──
  const { data: allFeesUnfilteredData } = useQuery({
    queryKey: ['rider-fee-summary-unfiltered', riderId],
    queryFn: () =>
      getFeesApi({
        filter_rider_id: riderId,
        per_page: 500,
        sort_by: 'fee_date',
        sort_dir: 'desc',
      }),
    enabled: open,
  })

  // Current month number (1-12) for due calculation
  const currentMonthNumber = new Date().getMonth() + 1

  const isLoading = showAll ? allLoading : pageLoading

  // Fees for summary always use the "all" dataset
  const allFees = allData?.data || []
  const totalRecords = allData?.total || 0
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE))

  // Fees for the table depend on the view mode
  const displayFees = showAll ? allFees : (pageData?.data || [])

  const summary = useMemo(() => {
    let totalFees = 0
    let totalPaid = 0
    let totalPending = 0
    let paidCount = 0
    let unpaidCount = 0
    let partialCount = 0
    const modeMap: Record<string, { totalPaid: number; count: number }> = {}

    for (const fee of allFees) {
      const total = Number(fee.totalAmount || 0)
      const paid = Number(fee.paidAmount || 0)
      const balance = Number(fee.balanceAmount || 0)

      if (fee.isDeleted) continue

      totalFees += total
      totalPaid += paid
      totalPending += balance

      if (balance === 0 && paid > 0) paidCount++
      else if (paid === 0 && total > 0) unpaidCount++
      else if (balance > 0) partialCount++

      // Track payment mode breakdown for paid amounts
      if (paid > 0 && fee.paymentMode) {
        const key = fee.paymentMode.toLowerCase()
        if (!modeMap[key]) modeMap[key] = { totalPaid: 0, count: 0 }
        modeMap[key].totalPaid += paid
        modeMap[key].count++
      }
    }

    const modeEntries: PaymentBreakdownItem[] = Object.entries(modeMap)
      .map(([mode, data]) => {
        const style = PAYMENT_MODE_STYLES[mode] || { label: mode.replace(/_/g, ' '), color: 'bg-gray-100 !text-gray-800 dark:bg-gray-800 dark:!text-gray-300', barColor: 'bg-gray-500 dark:bg-gray-400' }
        return { mode, label: style.label, color: style.color, barColor: style.barColor, ...data, percentage: 0 }
      })
      .sort((a, b) => b.totalPaid - a.totalPaid)

    // Calculate percentages
    if (totalPaid > 0) {
      for (const item of modeEntries) {
        item.percentage = Math.round((item.totalPaid / totalPaid) * 100)
      }
    }

    const paymentBreakdown = modeEntries

    return { totalFees, totalPaid, totalPending, paidCount, unpaidCount, partialCount, paymentBreakdown }
  }, [allFees])

  // ── Due till current month (from ALL unfiltered fees) ──
  const dueSummary = useMemo(() => {
    const unfilteredFees = allFeesUnfilteredData?.data || []
    let dueTillCurrentMonth = 0
    let dueVoucherCount = 0

    for (const fee of unfilteredFees) {
      if (fee.isDeleted) continue
      const balance = Number(fee.balanceAmount || 0)
      if (balance <= 0) continue

      // Check if any fee_item_month covers a month on or before the current month
      const hasDueMonth = (fee.feeItems || []).some((item: any) =>
        (item.feeItemMonths || []).some((m: any) => {
          const monthNum = m.month?.number ?? m.monthId
          const isWaived = m.isWaived ?? false
          return !isWaived && Number(monthNum) <= currentMonthNumber
        })
      )

      if (hasDueMonth) {
        dueTillCurrentMonth += balance
        dueVoucherCount++
      }
    }

    return { dueTillCurrentMonth, dueVoucherCount }
  }, [allFeesUnfilteredData, currentMonthNumber])

  // ── Monthly breakdown by billing month (from fee_item_months) ──
  // Each voucher covers multiple billing months; we split paid/balance
  // proportionally across those months.
  const monthlyBreakdown = useMemo(() => {
    if (!fyStartDate || !fyEndDate) return []

    // Accumulate per-month totals from fee_item_months
    const monthMap: Record<string, { label: string; key: string; total: number; paid: number; balance: number; count: number; voucherIds: Set<number>; vouchers: { id: number; feeNo: string; feeDate: string; amount: number; paid: number; balance: number }[] }> = {}

    const from = new Date(fyStartDate)
    const to = new Date(fyEndDate)

    // Seed all months in the FY range
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
    while (cursor <= to) {
      const mKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      monthMap[mKey] = {
        label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`,
        key: mKey,
        total: 0,
        paid: 0,
        balance: 0,
        count: 0,
        voucherIds: new Set(),
        vouchers: [],
      }
      cursor.setMonth(cursor.getMonth() + 1)
    }

    // Walk every fee → feeItems → feeItemMonths to collect billed amounts per month
    for (const fee of allFees) {
      if (fee.isDeleted) continue
      const feePaid = Number(fee.paidAmount || 0)
      const feeBalance = Number(fee.balanceAmount || 0)

      // Sum all non-waived feeItemMonth amounts for this fee (the billed total)
      let feeBilledTotal = 0
      const monthAmounts: { key: string; amount: number }[] = []

      for (const item of fee.feeItems || []) {
        for (const fim of item.feeItemMonths || []) {
          if (fim.isWaived) continue
          // Build the month key from the month number (1-12) and fee's fiscal year
          const monthNum = Number(fim.month?.number ?? fim.monthId)
          if (!monthNum || monthNum < 1 || monthNum > 12) continue
          // Use the fee's fiscal year to determine the calendar year
          const fyId = String(fee.fiscalYearId || localFyId)
          const fy = fiscalYears.find((f: any) => String(f.id) === fyId)
          const fyStart = fy?.startDate ? new Date(String(fy.startDate).slice(0, 10)) : from
          const calYear = fyStart.getFullYear() + Math.floor((fyStart.getMonth() + monthNum - 1) / 12)
          const mKey = `${calYear}-${String(monthNum).padStart(2, '0')}`
          if (!monthMap[mKey]) continue
          const amt = Number(fim.amount || 0)
          feeBilledTotal += amt
          monthAmounts.push({ key: mKey, amount: amt })
        }
      }

      if (monthAmounts.length === 0) continue

      // Distribute paid and balance proportionally across billing months
      for (const ma of monthAmounts) {
        const share = feeBilledTotal > 0 ? ma.amount / feeBilledTotal : 1 / monthAmounts.length
        const m = monthMap[ma.key]
        m.total += ma.amount
        m.paid += feePaid * share
        m.balance += feeBalance * share
        m.voucherIds.add(fee.id)
        m.vouchers.push({
          id: fee.id,
          feeNo: fee.feeNo || `#${fee.id}`,
          feeDate: fee.feeDate?.slice(0, 10) || '—',
          amount: Math.round(ma.amount),
          paid: Math.round(feePaid * share),
          balance: Math.round(feeBalance * share),
        })
      }
    }

    // Convert to array, keeping only months with vouchers, round values
    return Object.values(monthMap)
      .filter((m) => m.voucherIds.size > 0)
      .map((m) => ({
        ...m,
        count: m.voucherIds.size,
        total: Math.round(m.total),
        paid: Math.round(m.paid),
        balance: Math.round(m.balance),
      }))
  }, [allFees, fyStartDate, fyEndDate, localFyId, fiscalYears])

  const activeCount = allFees.filter((f: any) => !f.isDeleted).length

  // Active month key derived from the applied date range
  const activeMonthKey = useMemo(() => {
    if (!appliedFrom || !appliedTo) return null
    const from = new Date(appliedFrom)
    const to = new Date(appliedTo)
    // Only treat as single-month if the range spans exactly one calendar month
    if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
      return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`
    }
    return null
  }, [appliedFrom, appliedTo])

  // Click a bar segment or legend card to toggle-filter by that payment mode
  const handleBarModeClick = (mode: string) => {
    const newMode = appliedPaymentMode === mode ? '' : mode
    setPaymentMode(newMode)
    setAppliedPaymentMode(newMode)
  }

  // Format the fiscal year label for display
  const fiscalYearLabel = selectedFiscalYear?.name || 'All Time'
  const fyMonthRange = fyStartDate && fyEndDate
    ? `${new Date(fyStartDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – ${new Date(fyEndDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Fee Summary — {riderName}
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3 w-3 text-primary" />
              <span className="font-medium text-foreground">
                Fiscal Year: {fiscalYearLabel}
              </span>
              {fyMonthRange && (
                <span className="text-muted-foreground">
                  ({fyMonthRange})
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Viewing fees collected for this rider within the selected fiscal year.
            </p>
          </DialogDescription>
        </DialogHeader>

        {/* Fiscal Year Selector + Date Range + Payment Mode + View Toggle */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fiscal Year</label>
              <select
                value={localFyId}
                onChange={(e) => setLocalFyId(e.target.value)}
                className="h-9 w-48 rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {fiscalYears.length === 0 && (
                  <option value="" disabled>Loading…</option>
                )}
                {fiscalYears.map((fy: any) => (
                  <option key={fy.id} value={String(fy.id)}>
                    {fy.name}{fy.isCurrent ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Modes</option>
                {Object.entries(PAYMENT_MODE_STYLES).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setAppliedFrom(dateFrom)
                setAppliedTo(dateTo)
                setAppliedPaymentMode(paymentMode)
              }}
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" /> Apply
            </Button>
            <div className="flex items-center gap-0.5 rounded-lg border bg-muted p-0.5 ml-auto">
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  !showAll
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => { setShowAll(false); saveValue('feeSummaryShowAll', 'false') }}
              >
                Page
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  showAll
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => { setShowAll(true); saveValue('feeSummaryShowAll', 'true') }}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Paid</span>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summary.totalPaid)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {summary.paidCount} paid voucher{summary.paidCount !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Due till Current Month</span>
                  <Clock className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(dueSummary.dueTillCurrentMonth)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {dueSummary.dueVoucherCount} voucher{dueSummary.dueVoucherCount !== 1 ? 's' : ''} past due
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Pending Balance</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(summary.totalPending)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {summary.unpaidCount + summary.partialCount} pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Fees</span>
                  <Wallet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-lg font-bold">{formatCurrency(summary.totalFees)}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeCount} voucher{activeCount !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Mode Breakdown */}
        {!isLoading && summary.paymentBreakdown.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Paid by Payment Mode</span>
              </div>

              {/* Stacked horizontal bar — click a segment to filter */}
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden flex mb-3">
                {summary.paymentBreakdown.map((item) => {
                  const isActive = appliedPaymentMode === item.mode
                  return (
                    <div
                      key={item.mode}
                      className={`h-full transition-all cursor-pointer ${item.barColor} ${isActive ? 'ring-2 ring-ring ring-offset-1 ring-offset-background' : 'hover:brightness-110'}`}
                      style={{ width: `${item.percentage}%` }}
                      title={`${item.label}: ${formatCurrency(item.totalPaid)} (${item.percentage}%) — click to ${isActive ? 'clear filter' : 'filter'}`}
                      onClick={() => handleBarModeClick(item.mode)}
                    />
                  )
                })}
              </div>

              {/* Legend cards — also clickable to toggle filter */}
              <div className="flex flex-wrap gap-2">
                {summary.paymentBreakdown.map((item) => {
                  const isActive = appliedPaymentMode === item.mode
                  return (
                    <button
                      key={item.mode}
                      onClick={() => handleBarModeClick(item.mode)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${isActive ? 'bg-muted ring-1 ring-ring' : 'hover:bg-muted/50'}`}
                    >
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${item.color}`}>
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{formatCurrency(item.totalPaid)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.percentage}% · {item.count} voucher{item.count !== 1 ? 's' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs: Monthly Breakdown + Fee Vouchers */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); saveValue('feeSummaryTab', v) }} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="monthly" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Monthly Breakdown
              {monthlyBreakdown.length > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">({monthlyBreakdown.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Fee Vouchers
              {allFees.length > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">({allFees.filter((f: any) => !f.isDeleted).length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Monthly Breakdown Tab */}
          <TabsContent value="monthly">
            {!isLoading && monthlyBreakdown.length > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Monthly Breakdown — {fiscalYearLabel}
                      </span>
                    </div>
                    {activeMonthKey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleMonthClick(activeMonthKey)}
                      >
                        ✕ Clear month filter
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Click a month row to narrow the fee list. Click the chevron to expand voucher details.
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-2 px-3 font-medium text-xs">Month</th>
                          <th className="text-left py-2 px-3 font-medium text-xs">Voucher No</th>
                          <th className="text-left py-2 px-3 font-medium text-xs">Date</th>
                          <th className="text-right py-2 px-3 font-medium text-xs">Amount</th>
                          <th className="text-right py-2 px-3 font-medium text-xs">Total</th>
                          <th className="text-right py-2 px-3 font-medium text-xs">Paid / Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyBreakdown.map((m) => {
                          const isRowActive = activeMonthKey === m.key
                          const voucherRows = m.vouchers.length > 0 ? m.vouchers : [{ id: 0, feeNo: '—', feeDate: '—', amount: 0, paid: 0, balance: 0 }]
                          return voucherRows.map((v, vi) => (
                            <tr
                              key={vi === 0 ? m.key : `${m.key}-${v.id}`}
                              className={`border-b transition-colors ${
                                isRowActive
                                  ? 'bg-primary/10 hover:bg-primary/15'
                                  : 'hover:bg-muted/30'
                              }`}
                            >
                              {/* Month name — rowSpan on first voucher row only */}
                              {vi === 0 && (
                                <td
                                  className="py-2 px-3 text-xs font-medium cursor-pointer select-none align-top"
                                  rowSpan={voucherRows.length}
                                  onClick={() => handleMonthClick(m.key)}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <span className={`w-1 h-1 rounded-full shrink-0 ${isRowActive ? 'bg-primary' : 'bg-transparent'}`} />
                                    {m.label}
                                  </span>
                                </td>
                              )}
                              {/* Voucher details */}
                              <td className="py-1.5 px-3 text-xs font-medium text-foreground">{v.feeNo}</td>
                              <td className="py-1.5 px-3 text-xs text-muted-foreground">{v.feeDate}</td>
                              <td className="py-1.5 px-3 text-right text-xs tabular-nums">{formatCurrency(v.amount)}</td>
                              {/* Summary columns — rowSpan on first voucher row only */}
                              {vi === 0 && (
                                <>
                                  <td className="py-2 px-3 text-right text-xs tabular-nums align-top" rowSpan={voucherRows.length}>{formatCurrency(m.total)}</td>
                                  <td className="py-2 px-3 text-right text-xs tabular-nums align-top" rowSpan={voucherRows.length}>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      {formatCurrency(m.paid)}
                                    </span>
                                    {m.balance > 0 && (
                                      <span className="text-amber-600 dark:text-amber-400 ml-1.5">
                                        / {formatCurrency(m.balance)}
                                      </span>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))
                        })}
                        {/* Totals row */}
                        <tr className="border-t-2 bg-muted/40 font-semibold">
                          <td className="py-2 px-3 text-xs">Total</td>
                          <td colSpan={3}></td>
                          <td className="py-2 px-3 text-right text-xs tabular-nums">
                            {formatCurrency(monthlyBreakdown.reduce((s, m) => s + m.total, 0))}
                          </td>
                          <td className="py-2 px-3 text-right text-xs tabular-nums">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(monthlyBreakdown.reduce((s, m) => s + m.paid, 0))}
                            </span>
                            {monthlyBreakdown.reduce((s, m) => s + m.balance, 0) > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 ml-1.5">
                                / {formatCurrency(monthlyBreakdown.reduce((s, m) => s + m.balance, 0))}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : !isLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No monthly data available for this fiscal year.
              </div>
            ) : null}
          </TabsContent>

          {/* Fee Vouchers Tab */}
          <TabsContent value="vouchers">
            {/* Compact monthly summary bar */}
            {!isLoading && monthlyBreakdown.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <CalendarDays className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">Billing Months</span>
                  {activeMonthKey && (
                    <button
                      className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                      onClick={() => handleMonthClick(activeMonthKey)}
                    >
                      clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {monthlyBreakdown.map((m) => {
                    const isActive = activeMonthKey === m.key
                    const hasBalance = m.balance > 0
                    return (
                      <button
                        key={m.key}
                        onClick={() => handleMonthClick(m.key)}
                        title={`${m.label}: ${m.count} voucher${m.count !== 1 ? 's' : ''}, Paid ${formatCurrency(m.paid)}${hasBalance ? `, Balance ${formatCurrency(m.balance)}` : ''}`}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <span>{m.label.split(' ')[0].slice(0, 3)}</span>
                        <span className={`tabular-nums ${
                          hasBalance
                            ? (isActive ? 'text-amber-200' : 'text-amber-600 dark:text-amber-400')
                            : (isActive ? 'text-green-200' : 'text-emerald-600 dark:text-emerald-400')
                        }`}>
                          {formatCurrency(m.paid)}
                        </span>
                        {hasBalance && (
                          <span className={`tabular-nums ${isActive ? 'text-amber-200/70' : 'text-amber-500/70 dark:text-amber-400/60'}`}>
                            bal {formatCurrency(m.balance)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : displayFees.length > 0 ? (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-8"></th>
                        <th className="text-left py-2 px-3 font-medium text-xs">Fee No</th>
                        <th className="text-left py-2 px-3 font-medium text-xs">Date</th>
                        <th className="text-left py-2 px-3 font-medium text-xs">FY</th>
                        <th className="text-center py-2 px-3 font-medium text-xs">Payment</th>
                        <th className="text-right py-2 px-3 font-medium text-xs">Total</th>
                        <th className="text-right py-2 px-3 font-medium text-xs">Paid</th>
                        <th className="text-right py-2 px-3 font-medium text-xs">Balance</th>
                        <th className="text-center py-2 px-3 font-medium text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayFees.map((fee: any) => {
                        const status = getFeeStatus(fee)
                        const config = STATUS_CONFIG[status]
                        const Icon = config?.icon || Ban
                        const feeFyName = fee.fiscalYear?.name || '—'
                        const isCrossFy = localFyId && fee.fiscalYearId && String(fee.fiscalYearId) !== String(localFyId)
                        const isExpanded = expandedFees.has(fee.id)
                        const feeItems = fee.feeItems || []
                        return (
                          <>
                            <tr
                              key={fee.id}
                              className={`border-b transition-colors ${
                                isCrossFy
                                  ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30'
                                  : 'hover:bg-muted/30'
                              }`}
                            >
                              <td className="py-2 pl-2 pr-0">
                                <button
                                  className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-muted transition-colors"
                                  onClick={() => toggleFeeExpand(fee.id)}
                                  title={isExpanded ? 'Collapse' : 'Expand fee items'}
                                >
                                  <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              </td>
                              <td className="py-2 px-3 text-xs font-medium">
                                {fee.feeNo || `#${fee.id}`}
                              </td>
                              <td className="py-2 px-3 text-xs text-muted-foreground">
                                {fee.feeDate?.slice(0, 10) || '—'}
                              </td>
                              <td className="py-2 px-3 text-xs">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                  isCrossFy
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {feeFyName}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {(() => {
                                  const mode = fee.paymentMode?.toLowerCase()
                                  const modeStyle = mode ? (PAYMENT_MODE_STYLES[mode] || { label: fee.paymentMode, color: 'bg-gray-100 !text-gray-800 dark:bg-gray-800 dark:!text-gray-300' }) : null
                                  return modeStyle ? (
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${modeStyle.color}`}>
                                      {modeStyle.label}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )
                                })()}
                              </td>
                              <td className="py-2 px-3 text-right text-xs tabular-nums">
                                {formatCurrency(Number(fee.totalAmount || 0))}
                              </td>
                              <td className="py-2 px-3 text-right text-xs tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                                {formatCurrency(Number(fee.paidAmount || 0))}
                              </td>
                              <td className="py-2 px-3 text-right text-xs tabular-nums">
                                <span
                                  className={
                                    Number(fee.balanceAmount || 0) > 0
                                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                                      : 'text-muted-foreground'
                                  }
                                >
                                  {formatCurrency(Number(fee.balanceAmount || 0))}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {config ? (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.color}`}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {config.label}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                            </tr>
                            {/* Expanded fee items */}
                            {isExpanded && (
                              <tr key={`${fee.id}-detail`}>
                                <td colSpan={9} className="p-0">
                                  <div className="bg-muted/30 border-b px-8 py-2">
                                    {feeItems.length > 0 ? (
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-muted-foreground">
                                            <th className="text-left py-1 font-medium">Fee Head</th>
                                            <th className="text-center py-1 font-medium">Qty</th>
                                            <th className="text-right py-1 font-medium">Amount</th>
                                            <th className="text-right py-1 font-medium">Total</th>
                                            <th className="text-left py-1 font-medium pl-4">Billing Months</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {feeItems.map((item: any) => (
                                            <tr key={item.id} className="text-muted-foreground">
                                              <td className="py-0.5 font-medium text-foreground">{item.feeHead?.name || 'Fee'}</td>
                                              <td className="py-0.5 text-center">{item.quantity}</td>
                                              <td className="py-0.5 text-right tabular-nums">{formatCurrency(Number(item.amount || 0))}</td>
                                              <td className="py-0.5 text-right tabular-nums font-medium">{formatCurrency(Number(item.totalAmount || 0))}</td>
                                              <td className="py-0.5 pl-4">
                                                <div className="flex flex-wrap gap-1">
                                                  {(item.feeItemMonths || []).map((m: any) => (
                                                    <span
                                                      key={m.id}
                                                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                                        m.isWaived
                                                          ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400 line-through'
                                                          : 'bg-primary/10 text-primary'
                                                      }`}
                                                    >
                                                      {m.month?.name || `#${m.monthId}`}
                                                      {m.isWaived && ' (waived)'}
                                                    </span>
                                                  ))}
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">No fee items</p>
                                    )}
                                    {fee.note && (
                                      <p className="text-[11px] text-muted-foreground mt-1.5 italic">Note: {fee.note}</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                      {/* Totals row */}
                      <tr className="border-t-2 bg-muted/40 font-semibold">
                        <td></td>
                        <td className="py-2 px-3 text-xs">Total</td>
                        <td className="py-2 px-3 text-xs"></td>
                        <td className="py-2 px-3 text-xs"></td>
                        <td className="py-2 px-3 text-xs"></td>
                        <td className="py-2 px-3 text-right text-xs tabular-nums">
                          {formatCurrency(displayFees.reduce((s: number, f: any) => s + Number(f.totalAmount || 0), 0))}
                        </td>
                        <td className="py-2 px-3 text-right text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(displayFees.reduce((s: number, f: any) => s + Number(f.paidAmount || 0), 0))}
                        </td>
                        <td className="py-2 px-3 text-right text-xs tabular-nums">
                          {(() => {
                            const tb = displayFees.reduce((s: number, f: any) => s + Number(f.balanceAmount || 0), 0)
                            return (
                              <span className={tb > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                                {formatCurrency(tb)}
                              </span>
                            )
                          })()}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                {!showAll && totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>
                      Page {page} of {totalPages} ({totalRecords} total)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No fee records found for this rider in the selected fiscal year.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
