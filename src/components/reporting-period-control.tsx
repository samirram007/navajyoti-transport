/* oxlint-disable react/only-export-components */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, ChevronDown, RotateCcw, CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReportingPeriod } from '@/hooks/use-reporting-period'

function formatDate(d: string): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-').map(Number)
  if (!y || !m || !day) return d
  return new Date(y, m - 1, day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ReportingPeriodControl() {
  const { from, to, setFrom, setTo, reset, isDefault, isLoading } = useReportingPeriod()
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')

  const openPanel = () => {
    setDraftFrom(from)
    setDraftTo(to)
    setOpen(true)
  }

  const apply = () => {
    setFrom(draftFrom)
    setTo(draftTo)
    setOpen(false)
  }

  const resetToDefault = () => {
    reset()
    setOpen(false)
  }

  return (
    <div className="relative shrink-0">
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={cn(
          'hidden sm:inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isDefault
            ? 'border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground'
            : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30'
        )}
        title="Reporting period (applies to reports by default)"
      >
        <CalendarRange className="h-3 w-3" />
        <span>{isLoading ? 'Period…' : `${formatDate(from)} – ${formatDate(to)}`}</span>
        <ChevronDown className="h-2.5 w-2.5 opacity-50" />
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1.5 w-72 rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/40">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                Reporting Period
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Applies to all reports by default
                {isDefault && ' — currently using the fiscal year default'}
              </p>
            </div>

            <div className="p-3 space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">From</label>
                <Input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">To</label>
                <Input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="flex-1 h-8 text-xs" onClick={apply}>
                  Apply Period
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  onClick={resetToDefault}
                  disabled={isDefault}
                  title="Reset to current fiscal year → today"
                >
                  <RotateCcw className="h-3 w-3" />
                  Default
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
