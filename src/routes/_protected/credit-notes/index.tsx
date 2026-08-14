import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { AlertCircle, RefreshCw, BadgePercent, ReceiptText, Ban, Loader2 } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { type FilterableColumnConfig } from '@/components/data-table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getCreditNotesApi, voidCreditNoteApi } from '@/features/credit-notes/services'
import type { CreditNote } from '@/features/credit-notes/schemas'

function formatAmount(val: number | undefined | null): string {
  const n = Number(val || 0)
  return n > 0 ? n.toLocaleString() : '—'
}

function CreditNoteStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { label: string; color: string }> = {
    open: { label: 'Open', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    partial: { label: 'Partial', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    used: { label: 'Used', color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
    void: { label: 'Void', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }
  const s = styles[status?.toLowerCase()] || { label: status, color: 'bg-gray-100 text-gray-800' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  )
}

function CreditNotesPage() {
  const queryClient = useQueryClient()
  const { data: notes, isLoading, isError, refetch } = useQuery({
    queryKey: ['credit-notes'],
    queryFn: () => getCreditNotesApi(),
  })

  const [voidTarget, setVoidTarget] = useState<CreditNote | null>(null)

  const voidMutation = useMutation({
    mutationFn: (id: number) => voidCreditNoteApi(id),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] })
      toast.success(`Credit note ${note.creditNoteNo || ''} voided — remaining balance written off`)
      setVoidTarget(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to void credit note'),
  })

  const columns: ColumnDef<CreditNote>[] = [
    {
      header: 'Credit Note No', accessorKey: 'creditNoteNo',
      cell: ({ row }) => <span className="font-medium">{row.original.creditNoteNo || '—'}</span>,
    },
    {
      header: 'Rider', accessorKey: 'rider.name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.rider?.name || 'N/A'}</span>
          {row.original.rider?.code && (
            <span className="text-xs text-muted-foreground">{row.original.rider.code}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Source Voucher', accessorKey: 'sourceFee.fee_no',
      cell: ({ row }) => {
        const fee = row.original.sourceFee
        return fee?.fee_no
          ? (
            <div className="flex flex-col">
              <span className="text-sm">{fee.fee_no}</span>
              <span className="text-xs text-muted-foreground">{fee.fee_date || ''}</span>
            </div>
          )
          : '—'
      },
    },
    {
      header: 'Date', accessorKey: 'createdAt',
      cell: ({ row }) => {
        const d = row.original.createdAt
        return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
      },
    },
    {
      header: 'Amount', accessorKey: 'amount',
      cell: ({ row }) => <span className="font-medium tabular-nums">{formatAmount(row.original.amount)}</span>,
    },
    {
      header: 'Used', accessorKey: 'usedAmount',
      cell: ({ row }) => <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{formatAmount(row.original.usedAmount)}</span>,
    },
    {
      header: 'Balance', accessorKey: 'balance',
      cell: ({ row }) => (
        <span className={`font-medium tabular-nums ${row.original.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
          {formatAmount(row.original.balance)}
        </span>
      ),
    },
    {
      header: 'Status', accessorKey: 'status',
      cell: ({ row }) => <CreditNoteStatusBadge status={row.original.status} />,
    },
    {
      header: 'Note', accessorKey: 'note',
      cell: ({ getValue }) => { const v = getValue<string>(); return v ? (v.length > 30 ? v.slice(0, 30) + '...' : v) : '—' },
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const note = row.original
        const canVoid = note.balance > 0 && note.status !== 'used' && note.status !== 'void'
        return canVoid ? (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost" size="sm" className="h-7 gap-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
              title="Void this credit note (writes off the remaining balance)"
              onClick={() => setVoidTarget(note)}
            >
              <Ban className="h-3 w-3" />
              Void
            </Button>
          </div>
        ) : null
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Credit Notes" description="Credit balances created from cancelled fee vouchers, usable in the Fees POS">
        <BadgePercent className="h-5 w-5 text-muted-foreground" />
      </PageHeader>

      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold">Failed to load credit notes</h3>
            <p className="text-sm text-muted-foreground mt-1">Could not fetch credit note records. The backend may be unavailable.</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={notes || []}
          loading={isLoading}
          searchKey="creditNoteNo"
          filterableColumns={[
            { id: 'status', type: 'select', options: [
              { label: 'Open', value: 'open' },
              { label: 'Partial', value: 'partial' },
              { label: 'Used', value: 'used' },
            ] },
            'note',
          ] as FilterableColumnConfig[]}
        />
      )}

      <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/30 p-3 text-xs text-muted-foreground">
        <ReceiptText className="h-4 w-4 shrink-0 mt-px" />
        <span>
          Credit notes are created automatically when a <strong>paid</strong> fee voucher is cancelled — the paid amount
          becomes credit for that rider. In the Fees POS, a rider's available credit can be applied against a new fee.
          Voiding a credit note writes off its remaining balance so it can no longer be applied.
        </span>
      </div>

      {/* Void confirmation dialog */}
      <Dialog open={!!voidTarget} onOpenChange={(open) => { if (!open) setVoidTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Ban className="h-5 w-5" />
              Void Credit Note
            </DialogTitle>
            <DialogDescription>
              You are about to void credit note <strong>{voidTarget?.creditNoteNo}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 rounded-md border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 p-3 text-xs text-red-700 dark:text-red-400">
            <p className="font-semibold">What happens when you void:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>The remaining balance of <strong>₹{Number(voidTarget?.balance || 0).toLocaleString()}</strong> is written off and becomes unusable in the Fees POS.</li>
              <li>Credit already applied against other fees stays valid.</li>
              <li>This action is <strong>permanent</strong> — a voided note cannot be restored.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVoidTarget(null)} disabled={voidMutation.isPending}>
              Keep Note
            </Button>
            <Button
              variant="destructive"
              disabled={voidMutation.isPending}
              className="gap-1.5"
              onClick={() => voidTarget && voidMutation.mutate(voidTarget.id)}
            >
              {voidMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Yes, Void Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_protected/credit-notes/')({
  component: CreditNotesPage,
})
