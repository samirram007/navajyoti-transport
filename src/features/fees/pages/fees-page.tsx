import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { FeesSearchParams } from '@/routes/_protected/fees/index'
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size'
import { usePersistedSortDir } from '@/hooks/use-persisted-sort-dir'
import { DataTable, type FilterableColumnConfig } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, User, Calendar,
  ShoppingCart, Printer, BadgeCheck, Ban, Minus,
  AlertCircle, RefreshCw, Eye,
} from 'lucide-react'
import { type ColumnDef, type SortingState, type ColumnFiltersState } from '@tanstack/react-table'
import { getFeesApi, deleteFeeApi, type FeesQueryParams } from '@/features/fees/services'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { useReportingPeriod } from '@/hooks/use-reporting-period'
import { CancelVoucherDialog } from '@/features/fees/components/cancel-voucher-dialog'
import { RiderFeeSummaryDialog } from '@/features/fees/components/rider-fee-summary-dialog'
import { PrintPreviewDialog } from '@/components/print-preview-dialog'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function formatAmount(val: number | undefined | null): string {
  const n = Number(val || 0)
  return n > 0 ? n.toLocaleString() : '—'
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

function buildReceiptHtml(data: {
  feeNo?: string
  date: string
  riderName?: string
  riderStd?: string
  riderSection?: string
  items: { name?: string; months?: string; qty: number; amount: number; total: number }[]
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  paymentMode: string
  note?: string
}) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fee Receipt</title>
<style>
@page{size:A5 landscape;margin:10mm}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%}
body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#000;background:#fff}
.page{width:100%;height:100%;display:flex;flex-direction:column;padding:8px 12px}
.hdr{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:10px;margin-bottom:10px;border-bottom:2px solid #000}
.hdr-left h1{font-size:24pt;font-weight:900;letter-spacing:3px;line-height:1}
.hdr-left p{font-size:9pt;color:#555;margin-top:4px}
.hdr-right{text-align:right}
.hdr-right .title{font-size:14pt;font-weight:700;letter-spacing:1px}
.hdr-right .date{font-size:10pt;color:#555;margin-top:2px}
.info{display:flex;margin-bottom:12px;border:1px solid #000}
.info-block{flex:1;padding:8px 12px;border-right:1px solid #000}
.info-block:last-child{border-right:none}
.info-label{font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;font-weight:600}
.info-value{font-size:12pt;font-weight:700}
.table-section{flex:1;display:flex;flex-direction:column;border-top:2px solid #000}
table{width:100%;border-collapse:collapse}
thead th{background:#000;color:#fff;padding:8px 12px;font-size:9pt;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px}
thead th.r{text-align:right}
thead th.c{text-align:center}
tbody td{padding:10px 12px;font-size:11pt;border-bottom:1px solid #ccc;vertical-align:top}
tbody td.r{text-align:right;font-variant-numeric:tabular-nums}
tbody td.c{text-align:center}
tbody tr:last-child td{border-bottom:none}
.bottom{display:flex;gap:20px;border-top:2px solid #000;padding-top:10px;margin-top:auto}
.summary{flex:1}
.srow{display:flex;justify-content:space-between;padding:4px 0;font-size:11pt}
.srow.total{font-size:14pt;font-weight:900;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:4px}
.srow.paid{font-weight:700}
.srow.balance{font-weight:800;font-size:12pt}
.payinfo{flex:1;display:flex;flex-direction:column;justify-content:center;border:1px solid #000;padding:12px 16px}
.payinfo strong{font-size:9pt;text-transform:uppercase;letter-spacing:1px}
.payinfo .mode{font-size:14pt;font-weight:800;margin-top:4px}
.note{border-left:3px solid #000;padding:8px 12px;font-size:9pt;color:#333;font-style:italic;margin-top:10px}
.ftr{text-align:center;font-size:8pt;color:#555;padding-top:8px;border-top:1px solid #000;margin-top:10px}
</style></head><body>
<div class="page">
  <div class="hdr">
    <div class="hdr-left"><h1>GOSCHOOL</h1><p>Transport Management System</p></div>
    <div class="hdr-right"><div class="title">FEE RECEIPT</div><div class="date">${data.date}</div></div>
  </div>
  <div class="info">
    <div class="info-block"><div class="info-label">Receipt No</div><div class="info-value">${data.feeNo || '---'}</div></div>
    <div class="info-block"><div class="info-label">Rider Name</div><div class="info-value">${data.riderName || '---'}</div></div>
    <div class="info-block"><div class="info-label">Class / Section</div><div class="info-value">${data.riderStd || '-'}${data.riderSection ? ' / ' + data.riderSection : ''}</div></div>
    <div class="info-block"><div class="info-label">Payment</div><div class="info-value">${data.paymentMode.replace(/_/g, ' ').toUpperCase()}</div></div>
  </div>
  <div class="table-section">
    <table>
      <thead><tr><th>Description</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
      <tbody>
        ${data.items.map(i => `<tr><td>${i.name || 'Fee'}${i.months ? `<div style="font-size:8pt;color:#555;margin-top:2px">${i.months}</div>` : ''}</td><td class="c">${i.qty}</td><td class="r">${i.amount.toLocaleString()}</td><td class="r">${i.total.toLocaleString()}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="bottom">
    <div class="summary">
      <div class="srow total"><span>TOTAL</span><span>\u20B9${data.totalAmount.toLocaleString()}</span></div>
      <div class="srow paid"><span>PAID</span><span>\u20B9${data.paidAmount.toLocaleString()}</span></div>
      <div class="srow balance"><span>BALANCE</span><span>\u20B9${data.balanceAmount.toLocaleString()}</span></div>
    </div>
    <div class="payinfo"><strong>Payment</strong><div class="mode">${data.paymentMode.replace(/_/g, ' ').toUpperCase()}</div></div>
  </div>
  ${data.note ? `<div class="note"><strong>Note:</strong> ${data.note}</div>` : ''}
  <div class="ftr">GoSchool Transport Management \u2022 Thank you for your payment! \u2022 ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</div>
</div>
</body></html>`
}

export function FeesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ── Read global filters from navbar context ──
  const { getValue } = useUserInitialValues()
  const savedFiscalYearId = getValue('fiscalYearId')
  const { from: reportingFrom, to: reportingTo } = useReportingPeriod()

  // ── Read state from URL search params ──
  const search = useSearch({ from: '/_protected/fees/' })
  const [pageIndex, setPageIndex] = useState(Math.max(0, (search.page ?? 1) - 1))
  const [pageSize, setPageSize] = usePersistedPageSize()
  const [defaultSortDir, setDefaultSortDir] = usePersistedSortDir('fees')
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (search.sort) return [{ id: search.sort, desc: (search.dir ?? defaultSortDir) === 'desc' }]
    return []
  })
  const [globalFilter, setGlobalFilter] = useState(search.search ?? '')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = []
    if (search.paymentMode) filters.push({ id: 'paymentMode', value: search.paymentMode })
    if (search.status) filters.push({ id: 'feeStatus', value: search.status })
    return filters
  })

  // ── Sync state from URL on every navigation (back/forward) ──
  useEffect(() => {
    setPageIndex(Math.max(0, (search.page ?? 1) - 1))
  }, [search.page])
  useEffect(() => {
    if (search.sort) {
      setSorting([{ id: search.sort, desc: (search.dir ?? defaultSortDir) === 'desc' }])
    } else {
      setSorting([])
    }
  }, [search.sort, search.dir, defaultSortDir])
  useEffect(() => {
    setGlobalFilter(search.search ?? '')
  }, [search.search])
  useEffect(() => {
    const filters: ColumnFiltersState = []
    if (search.paymentMode) filters.push({ id: 'paymentMode', value: search.paymentMode })
    if (search.status) filters.push({ id: 'feeStatus', value: search.status })
    setColumnFilters(filters)
  }, [search.paymentMode, search.status])

  // ── Sync state changes back to URL ──
  // Skip the first syncToUrl calls during mount — TanStack Table fires
  // onPaginationChange with default values that would strip URL params like ?page=3
  const initialSyncDone = useRef(false)
  useEffect(() => {
    requestAnimationFrame(() => { initialSyncDone.current = true })
  }, [])

  const syncToUrl = useCallback((overrides?: Partial<FeesSearchParams>, replace = false) => {
    if (!initialSyncDone.current) return
    const page = overrides?.page ?? pageIndex
    const size = overrides?.size ?? pageSize
    const sort = overrides?.sort ?? (sorting.length > 0 ? sorting[0].id : '')
    const dir = overrides?.dir ?? (sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : 'desc')
    const searchVal = overrides?.search ?? globalFilter
    const paymentMode = overrides?.paymentMode ?? (columnFilters.find(f => f.id === 'paymentMode')?.value as string || '')
    const status = overrides?.status ?? (columnFilters.find(f => f.id === 'feeStatus')?.value as string || '')
    // Remove empty/default values to keep URL clean
    const clean: Record<string, any> = {}
    if (page + 1 > 1) clean.page = page + 1
    if (size !== 10) clean.size = size
    if (sort) clean.sort = sort
    if (dir !== 'desc') clean.dir = dir
    if (searchVal) clean.search = searchVal
    if (paymentMode) clean.paymentMode = paymentMode
    if (status) clean.status = status
    // Skip navigation if the generated URL matches the current one
    const currentParams = new URLSearchParams(window.location.search)
    const cleanParams = new URLSearchParams()
    for (const [k, v] of Object.entries(clean)) {
      cleanParams.set(k, String(v))
    }
    if (currentParams.toString() === cleanParams.toString()) return
    navigate({ search: clean as any, replace })
  }, [pageIndex, pageSize, sorting, globalFilter, columnFilters, navigate])

  // ── Build API params from navbar context ──
  const apiParams: FeesQueryParams = {
    page: pageIndex + 1,
    per_page: pageSize,
  }

  // Fiscal year from navbar dropdown
  if (savedFiscalYearId) apiParams.filter_fiscal_year_id = savedFiscalYearId

  // Date range from navbar reporting period
  if (reportingFrom) apiParams.filter_fee_date_from = reportingFrom
  if (reportingTo) apiParams.filter_fee_date_to = reportingTo

  if (globalFilter) apiParams.search = globalFilter
  if (sorting.length > 0) {
    apiParams.sort_by = sorting[0].id
    apiParams.sort_dir = sorting[0].desc ? 'desc' : 'asc'
  }

  // Column filters → API params
  for (const f of columnFilters) {
    if (f.id === 'feeStatus') {
      // Status is computed client-side, handled via filterFn in column def
    } else if (f.id === 'paymentMode') {
      apiParams.filter_payment_mode = f.value as string
    }
  }

  // ── Fetch fees ──
  const { data: feesResult, isLoading: feesLoading, isError: feesError, refetch: refetchFees } = useQuery({
    queryKey: ['fees', apiParams],
    queryFn: () => getFeesApi(apiParams),
    placeholderData: (prev) => prev,
  })

  const fees = feesResult?.data || []
  const totalRecords = feesResult?.total || 0

  // ── Client-side status filter (computed field, not in DB) ──
  const statusFilter = columnFilters.find(f => f.id === 'feeStatus')
  const filteredFees = statusFilter
    ? fees.filter((fee: any) => getFeeStatus(fee) === statusFilter.value)
    : fees

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: ({ id, createCreditNote }: { id: number; createCreditNote: boolean }) => deleteFeeApi(id, createCreditNote),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      const cn = res?.data?.data?.creditNote
      toast.success(cn
        ? `Voucher cancelled — credit note ${cn.creditNoteNo} of ₹${Number(cn.amount).toLocaleString()} created for this rider`
        : 'Voucher cancelled successfully')
    },
    onError: () => toast.error('Cancellation failed'),
  })

  const [cancelFee, setCancelFee] = useState<any>(null)
  const [feeSummaryOpen, setFeeSummaryOpen] = useState(false)
  const [selectedRider, setSelectedRider] = useState<{ id: number; name: string } | null>(null)
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
  const [printPreviewHtml, setPrintPreviewHtml] = useState('')

  // Ctrl+E keyboard shortcut — open fee summary for hovered row
  const openFeeSummaryRef = useRef<(id: number, name: string) => void>(() => {})
  openFeeSummaryRef.current = (id, name) => {
    setSelectedRider({ id, name })
    setFeeSummaryOpen(true)
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        const hovered = document.querySelector<HTMLElement>('tr:hover[data-row-id]')
        if (hovered) {
          const id = Number(hovered.dataset.rowId)
          const name = hovered.dataset.rowName || ''
          if (id) openFeeSummaryRef.current(id, name)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const columns: ColumnDef<any>[] = [
    { header: 'Fee No', accessorKey: 'feeNo' },
    {
      header: 'Rider', accessorKey: 'rider.name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground shrink-0" />
          <span>{row.original.rider?.name || 'N/A'}</span>
          <Button
            variant="ghost" size="sm" className="h-6 gap-0.5 px-1.5 text-xs text-primary hover:text-primary/80"
            title="Add fees for this rider"
            onClick={() => navigate({ to: '/fees/new', search: { riderId: row.original.riderId as number } })}
          >
            <Plus className="h-3 w-3" />
            Fees
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  if (row.original.rider?.id) {
                    setSelectedRider({ id: row.original.rider.id, name: row.original.rider.name })
                    setFeeSummaryOpen(true)
                  }
                }}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Fee summary for {row.original.rider?.name}</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
    {
      header: 'Total', accessorKey: 'totalAmount',
      cell: ({ row }) => {
        const val = Number(row.original.totalAmount || 0)
        return <span className={cn('font-medium', val > 0 ? 'text-foreground' : 'text-muted-foreground')}>{formatAmount(val)}</span>
      },
    },
    {
      header: 'Paid', accessorKey: 'paidAmount',
      cell: ({ row }) => {
        const val = Number(row.original.paidAmount || 0)
        return <span className={cn('font-medium', val > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>{formatAmount(val)}</span>
      },
    },
    {
      header: 'Balance', accessorKey: 'balanceAmount',
      cell: ({ row }) => {
        const val = Number(row.original.balanceAmount || 0)
        return (
          <span className={cn('font-medium', val > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            {formatAmount(val)}
          </span>
        )
      },
    },
    {
      header: 'Date', accessorKey: 'feeDate',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
          <span>{row.original.feeDate?.slice(0, 10) || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Payment',
      accessorKey: 'paymentMode',
      cell: ({ getValue }) => {
        const v = getValue<string>()
        if (!v) return <span className="text-muted-foreground text-sm">—</span>
        const PAYMENT_STATUS_STYLES: Record<string, { label: string; color: string }> = {
          cash: { label: 'Cash', color: 'bg-emerald-100 !text-emerald-800 dark:bg-emerald-900/30 dark:!text-emerald-400' },
          bank_transfer: { label: 'Bank Transfer', color: 'bg-blue-100 !text-blue-800 dark:bg-blue-900/30 dark:!text-blue-400' },
          cheque: { label: 'Cheque', color: 'bg-amber-100 !text-amber-800 dark:bg-amber-900/30 dark:!text-amber-400' },
          card: { label: 'Card', color: 'bg-purple-100 !text-purple-800 dark:bg-purple-900/30 dark:!text-purple-400' },
          online: { label: 'Online', color: 'bg-indigo-100 !text-indigo-800 dark:bg-indigo-900/30 dark:!text-indigo-400' },
        }
        const style = PAYMENT_STATUS_STYLES[v.toLowerCase()] || { label: v.replace(/_/g, ' '), color: 'bg-gray-100 !text-gray-800 dark:bg-gray-800 dark:!text-gray-300' }
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.color}`}>
            {style.label}
          </span>
        )
      },
    },
    { header: 'Fiscal Year', accessorKey: 'fiscalYear.name', cell: ({ row }) => row.original.fiscalYear?.name || '—' },
    {
      header: 'Note', accessorKey: 'note',
      cell: ({ getValue }) => { const v = getValue<string>(); return v ? (v.length > 30 ? v.slice(0, 30) + '...' : v) : '-' },
    },
    {
      header: 'Status',
      id: 'feeStatus',
      filterFn: (row, _columnId, filterValue) => getFeeStatus(row.original) === filterValue,
      cell: ({ row }) => {
        const status = getFeeStatus(row.original)
        const map = {
          Paid: { color: 'bg-green-100 !text-emerald-800 dark:bg-green-900/30 dark:!text-green-400', icon: BadgeCheck },
          Unpaid: { color: 'bg-red-100 !text-red-800 dark:bg-red-900/30 dark:!text-red-400', icon: Ban },
          Partial: { color: 'bg-amber-100 !text-amber-800 dark:bg-amber-900/30 dark:!text-amber-400', icon: Minus },
          Cancelled: { color: 'bg-slate-200 !text-slate-700 dark:bg-slate-700 dark:!text-slate-200', icon: Ban },
        } as const
        const s = map[status as keyof typeof map]
        if (!s) return <span className="text-muted-foreground text-sm">—</span>
        const Icon = s.icon
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>
            <Icon className="h-3 w-3" />
            {status}
          </span>
        )
      },
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            disabled={row.original.isDeleted}
            title={row.original.isDeleted ? 'Cannot edit a cancelled voucher' : 'Edit'}
            onClick={() => navigate({ to: '/fees/$feeId/edit', params: { feeId: String(row.original.id) } })}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => {
              const fee = row.original
              setPrintPreviewHtml(buildReceiptHtml({
                feeNo: fee.feeNo,
                date: fee.feeDate?.slice(0, 10) || '',
                riderName: fee.rider?.name,
                riderStd: fee.rider?.standard,
                riderSection: fee.rider?.section,
                items: (fee.feeItems || []).map((i: any) => ({
                  name: i.feeHead?.name || 'Fee',
                  months: (i.feeItemMonths || []).map((m: any) => ({
                    num: m.month?.number || 0,
                    label: (() => {
                      const name = m.month?.shortName || m.month?.name || '';
                      const fyYear = fee.fiscalYear?.startDate ? new Date(fee.fiscalYear.startDate).getFullYear() : '';
                      return name && fyYear ? `${name} ${String(fyYear).slice(-2)}` : name;
                    })(),
                  })).filter((m: any) => m.label).sort((a: any, b: any) => a.num - b.num).map((m: any) => m.label).join(', '),
                  qty: i.quantity,
                  amount: i.amount,
                  total: i.totalAmount,
                })),
                totalAmount: Number(fee.totalAmount) || 0,
                paidAmount: Number(fee.paidAmount) || 0,
                balanceAmount: Number(fee.balanceAmount) || 0,
                paymentMode: fee.paymentMode || '',
                note: fee.note,
              }))
              setPrintPreviewOpen(true)
            }}
          >
            <Printer className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
            disabled={row.original.isDeleted} title={row.original.isDeleted ? 'Already cancelled' : 'Cancel voucher'}
            onClick={() => setCancelFee(row.original)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Fees Collection" description="Manage rider fee collections">
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate({ to: '/fees/new' })} size="sm" className="h-8 gap-1">
            <ShoppingCart className="h-4 w-4" /> POS Mode
          </Button>
          <Button onClick={() => navigate({ to: '/fees/new' })} variant="outline" size="sm" className="h-8 gap-1">
            <Plus className="h-4 w-4" /> New Fee
          </Button>
        </div>
      </PageHeader>

      {feesError ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold">Failed to load fees</h3>
            <p className="text-sm text-muted-foreground mt-1">Could not fetch fee records. The backend may be unavailable.</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => refetchFees()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredFees}
          loading={feesLoading}
          searchKey="feeNo"
          rowNameAccessor="rider.name"
          initialPageSize={pageSize}
          serverSide
          pageIndex={pageIndex}
          total={totalRecords}
          pageCount={Math.ceil(totalRecords / pageSize) || 1}
          onPaginationChange={(p, s) => { setPageIndex(p); setPageSize(s); syncToUrl({ page: p, size: s }, false) }}
          onSortingChange={(newSorting) => {
            setSorting(newSorting)
            const dir = newSorting.length > 0 ? (newSorting[0].desc ? 'desc' as const : 'asc' as const) : defaultSortDir
            setDefaultSortDir(dir)
            syncToUrl({
              sort: newSorting.length > 0 ? newSorting[0].id : '',
              dir,
            }, false)
          }}
          onGlobalFilterChange={(val) => { setGlobalFilter(val); syncToUrl({ search: val }, false) }}
          onColumnFiltersChange={(filters) => {
            setColumnFilters(filters)
            syncToUrl({
              paymentMode: (filters.find(f => f.id === 'paymentMode')?.value as string) || '',
              status: (filters.find(f => f.id === 'feeStatus')?.value as string) || '',
            }, false)
          }}
          filterableColumns={[
            { id: 'paymentMode', type: 'select', options: [
              { label: 'Cash', value: 'cash' },
              { label: 'Bank Transfer', value: 'bank_transfer' },
              { label: 'Cheque', value: 'cheque' },
              { label: 'Card', value: 'card' },
              { label: 'Online', value: 'online' },
            ] },
            { id: 'feeStatus', type: 'select', options: [
              { label: 'Paid', value: 'Paid' },
              { label: 'Unpaid', value: 'Unpaid' },
              { label: 'Partial', value: 'Partial' },
              { label: 'Cancelled', value: 'Cancelled' },
            ] },
          ] as FilterableColumnConfig[]}
        />
      )}

      <CancelVoucherDialog
        open={!!cancelFee}
        onOpenChange={(open) => { if (!open) setCancelFee(null) }}
        fee={cancelFee}
        loading={deleteMutation.isPending}
        onConfirm={(createCreditNote) => { if (cancelFee) { deleteMutation.mutate({ id: cancelFee.id, createCreditNote }); setCancelFee(null) } }}
      />

      {selectedRider && (
        <RiderFeeSummaryDialog
          open={feeSummaryOpen}
          onOpenChange={setFeeSummaryOpen}
          riderId={selectedRider.id}
          riderName={selectedRider.name}
        />
      )}

      <PrintPreviewDialog
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
        html={printPreviewHtml}
      />
    </div>
  )
}
