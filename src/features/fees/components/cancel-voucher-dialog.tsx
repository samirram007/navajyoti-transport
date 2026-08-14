import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Ban, AlertTriangle, Calendar, User, Hash, BadgePercent } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CancelVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fee?: any
  loading?: boolean
  onConfirm: (createCreditNote: boolean) => void
}

export function CancelVoucherDialog({ open, onOpenChange, fee, loading, onConfirm }: CancelVoucherDialogProps) {
  const total = Number(fee?.totalAmount || 0)
  const paid = Number(fee?.paidAmount || 0)
  const monthCount = (fee?.feeItems || []).reduce(
    (sum: number, it: any) => sum + (it.feeItemMonths?.length || it.months?.length || 0),
    0,
  )

  // Default to "create a credit note" (when something was paid) on every open
  const [createCreditNote, setCreateCreditNote] = useState(true)
  useEffect(() => {
    if (open) setCreateCreditNote(paid > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Cancel Fee Voucher
          </DialogTitle>
          <DialogDescription>
            You are about to cancel this fee voucher. You can choose whether the payment recorded against it
            becomes a credit note for the rider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Hash className="h-3.5 w-3.5" />Voucher</span>
            <span className="font-medium">{fee?.feeNo || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground"><User className="h-3.5 w-3.5" />Rider</span>
            <span className="font-medium">{fee?.rider?.name || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Date</span>
            <span className="font-medium">{fee?.feeDate || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Due</span>
            <span className="font-medium">₹{total.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-medium text-green-600 dark:text-green-400">₹{paid.toLocaleString()}</span>
          </div>
        </div>

        {/* Create credit note choice (only meaningful when something was paid) */}
        {paid > 0 && (
          <button
            type="button"
            role="checkbox"
            aria-checked={createCreditNote}
            onClick={() => setCreateCreditNote(v => !v)}
            className={cn(
              'flex w-full items-start gap-2.5 rounded-md border p-3 text-left text-sm transition-colors',
              createCreditNote
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-muted/20 hover:bg-muted/30'
            )}
          >
            <span className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors mt-px',
              createCreditNote ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 bg-background'
            )}>
              {createCreditNote && <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </span>
            <span>
              <span className="flex items-center gap-1.5 font-medium">
                <BadgePercent className="h-3.5 w-3.5 text-primary" />
                Create a credit note of ₹{paid.toLocaleString()}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {createCreditNote
                  ? 'The paid amount becomes a credit note for this rider, usable against future fees in the POS.'
                  : 'No credit note will be created — the payment is simply written off with the cancellation.'}
              </span>
            </span>
          </button>
        )}

        <div className="space-y-1.5 rounded-md border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 p-3 text-xs text-red-700 dark:text-red-400">
          <p className="font-semibold">What happens when you cancel:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>The voucher is marked <strong>cancelled</strong> and excluded from fee collection reports.</li>
            {paid > 0 ? (
              createCreditNote ? (
                <li>
                  The payment of <strong>₹{paid.toLocaleString()}</strong> becomes a <strong>credit note</strong> for this rider, usable against future fees in the POS.
                </li>
              ) : (
                <li>No credit note is created — the payment is written off with the cancellation.</li>
              )
            ) : (
              <li>No credit note is created because nothing was paid on this voucher.</li>
            )}
            {monthCount > 0 && (
              <li>
                The <strong>{monthCount}</strong> month{monthCount !== 1 ? 's' : ''} covered by this voucher become{' '}
                <strong>unpaid</strong> and available for re-collection.
              </li>
            )}
            <li>The voucher is retained for audit and listed under the <strong>Cancelled</strong> filter.</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Keep Voucher
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(createCreditNote)} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Yes, Cancel Voucher
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
