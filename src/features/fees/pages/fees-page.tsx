import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, User, Calendar,
  ShoppingCart, Printer, BadgeCheck, Ban, Minus,
  AlertCircle, RefreshCw,
} from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { type FilterableColumnConfig } from '@/components/data-table'
import { getFeesApi, deleteFeeApi } from '@/features/fees/services'
import { CancelVoucherDialog } from '@/features/fees/components/cancel-voucher-dialog'
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

function printReceipt(data: {
  feeNo?: string
  date: string
  riderName?: string
  riderStd?: string
  riderSection?: string
  items: { name?: string; qty: number; amount: number; total: number }[]
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  paymentMode: string
  note?: string
}) {
  const receiptHTML = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; color: #222; }
  .receipt { max-width: 72mm; margin: 0 auto; }
  .center { text-align: center; }
  .header { border-bottom: 1px dashed #222; padding-bottom: 8px; margin-bottom: 8px; }
  .header h2 { margin: 0; font-size: 16px; letter-spacing: 1px; }
  .header p { margin: 2px 0; font-size: 10px; color: #555; }
  .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; }
  .items { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .items th { border-bottom: 1px dashed #222; padding: 4px 2px; font-size: 10px; text-align: left; }
  .items th:last-child, .items td:last-child { text-align: right; }
  .items td { padding: 3px 2px; font-size: 11px; }
  .total-row td { border-top: 1px dashed #222; padding-top: 4px; font-weight: bold; }
  .amount { text-align: right; }
  .paid { color: #16a34a; }
  .balance { color: ${data.balanceAmount > 0 ? '#dc2626' : '#16a34a'}; }
  .footer { border-top: 1px dashed #222; padding-top: 6px; margin-top: 6px; font-size: 10px; text-align: center; color: #555; }
  .note { font-size: 10px; color: #555; margin-top: 4px; font-style: italic; }
  hr { border: none; border-top: 1px dashed #222; margin: 6px 0; }
</style></head><body>
<div class="receipt">
  <div class="header center">
    <h2>GoSchool</h2>
    <p>Transport Management • Fee Receipt</p>
  </div>
  <div class="meta">
    <span><strong>Receipt:</strong> ${data.feeNo || '---'}</span>
    <span><strong>Date:</strong> ${data.date}</span>
  </div>
  <div class="meta">
    <span><strong>Rider:</strong> ${data.riderName || '---'}</span>
    <span>${data.riderStd || ''}${data.riderSection ? ' - ' + data.riderSection : ''}</span>
  </div>
  <hr>
  <table class="items">
    <tr><th>Item</th><th>Qty</th><th>Amt</th><th>Total</th></tr>
    ${data.items.map(i => `
      <tr><td>${i.name || 'Fee'}</td><td>${i.qty}</td><td>${i.amount.toLocaleString()}</td><td>${i.total.toLocaleString()}</td></tr>
    `).join('')}
    <tr class="total-row"><td colspan="3">Total</td><td>${data.totalAmount.toLocaleString()}</td></tr>
    <tr><td colspan="3" class="paid">Paid</td><td class="paid">${data.paidAmount.toLocaleString()}</td></tr>
    <tr><td colspan="3" class="balance">Balance</td><td class="balance">${data.balanceAmount.toLocaleString()}</td></tr>
  </table>
  <div class="meta"><span><strong>Payment:</strong> ${data.paymentMode.toUpperCase()}</span></div>
  ${data.note ? `<div class="note">Note: ${data.note}</div>` : ''}
  <div class="footer">Thank you! • ${new Date().toLocaleString()}</div>
</div>
<script>window.onload = function() { window.print(); window.close(); }</script>
</body></html>`
  const win = window.open('', '_blank', 'width=400,height=600,menubar=no,toolbar=no,location=no')
  if (win) {
    win.document.write(receiptHTML)
    win.document.close()
  } else {
    toast.error('Please allow popups to print the receipt')
  }
}

export function FeesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: fees, isLoading: feesLoading, isError: feesError, refetch: refetchFees } = useQuery({ queryKey: ['fees'], queryFn: getFeesApi })

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
          cash: { label: 'Cash', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
          bank_transfer: { label: 'Bank Transfer', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
          cheque: { label: 'Cheque', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
          card: { label: 'Card', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
          online: { label: 'Online', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
        }
        const style = PAYMENT_STATUS_STYLES[v.toLowerCase()] || { label: v.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
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
          Paid: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: BadgeCheck },
          Unpaid: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: Ban },
          Partial: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Minus },
          Cancelled: { color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200', icon: Ban },
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
              printReceipt({
                feeNo: fee.feeNo,
                date: fee.feeDate?.slice(0, 10) || '',
                riderName: fee.rider?.name,
                riderStd: fee.rider?.standard,
                riderSection: fee.rider?.section,
                items: (fee.feeItems || []).map((i: any) => ({
                  name: i.feeHead?.name || 'Fee',
                  qty: i.quantity,
                  amount: i.amount,
                  total: i.totalAmount,
                })),
                totalAmount: Number(fee.totalAmount) || 0,
                paidAmount: Number(fee.paidAmount) || 0,
                balanceAmount: Number(fee.balanceAmount) || 0,
                paymentMode: fee.paymentMode || '',
                note: fee.note,
              })
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
        <DataTable columns={columns} data={fees || []} loading={feesLoading} searchKey="feeNo"
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
            'fiscalYear.name',
            'note',
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
    </div>
  )
}
