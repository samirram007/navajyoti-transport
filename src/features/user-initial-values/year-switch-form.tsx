import { useQuery } from '@tanstack/react-query'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { useSaveIndicator } from '@/hooks/use-save-indicator'
import { cn } from '@/lib/utils'
import { Calendar, CheckCircle2, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getFiscalYearsApi } from '@/features/fees/services'

export function YearSwitchForm() {
  const { getValue, saveValue, isSaving } = useUserInitialValues()
  const savedFiscalYearId = getValue('fiscalYearId')

  const { savedKey: switchedFyId, markSaved } = useSaveIndicator(isSaving)

  const { data: fiscalYears = [], isLoading, isError } = useQuery({
    queryKey: ['fiscal-years-switch'],
    queryFn: getFiscalYearsApi,
    staleTime: 5 * 60 * 1000,
  })

  const handleSwitch = (fiscalYearId: string) => {
    if (fiscalYearId === savedFiscalYearId) return
    markSaved(fiscalYearId)
    saveValue('fiscalYearId', fiscalYearId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-sm">
        <AlertCircle className="h-8 w-8 text-destructive/70 mx-auto mb-2" />
        <p className="font-medium text-destructive">Failed to load fiscal years</p>
        <p className="text-xs text-muted-foreground mt-0.5">Check your connection and try again</p>
      </div>
    )
  }

  if (fiscalYears.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p>No fiscal years available</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {fiscalYears.map((fy: any) => {
        const isActive = String(fy.id) === savedFiscalYearId
        return (
          <div
            key={fy.id}
            className={cn(
              'flex items-center justify-between rounded-lg border px-4 py-3.5 transition-all duration-150',
              isActive
                ? 'border-primary/30 bg-primary/5 shadow-sm shadow-primary/5'
                : switchedFyId === String(fy.id)
                  ? 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-700'
                  : 'border-border bg-card hover:border-muted-foreground/20 hover:bg-accent/30 hover:shadow-sm',
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-base font-semibold truncate',
                      isActive ? 'text-foreground' : 'text-foreground/80',
                    )}
                  >
                    {fy.name}
                  </span>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                  )}
                  {switchedFyId === String(fy.id) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400 animate-in fade-in zoom-in-95 shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                </div>
                {fy.start_date && fy.end_date && (
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    {fy.start_date.slice(0, 10)} — {fy.end_date.slice(0, 10)}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 ml-3">
              {!isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={isSaving}
                  onClick={() => handleSwitch(String(fy.id))}
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3 w-3" />
                  )}
                  Switch
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
