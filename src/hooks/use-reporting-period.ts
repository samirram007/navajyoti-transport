import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { getFiscalYearsApi } from '@/features/fees/services'

export const REPORTING_FROM_KEY = 'reportingFrom'
export const REPORTING_TO_KEY = 'reportingTo'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Global reporting period, persisted per user via `user_initial_values`.
 *
 * When the user has not set a period, it defaults to the current fiscal
 * year's date range clamped to today: from = current FY start date, to =
 * min(today, current FY end date). The default rolls forward with today
 * until the user saves an explicit period.
 */
export function useReportingPeriod() {
  const { getValue, saveValue, isLoading: valuesLoading } = useUserInitialValues()
  const { data: fiscalYears = [], isLoading: fyLoading } = useQuery({
    queryKey: ['fiscal-years-reporting-period'],
    queryFn: getFiscalYearsApi,
    staleTime: 5 * 60 * 1000,
  })

  const savedFrom = getValue(REPORTING_FROM_KEY)
  const savedTo = getValue(REPORTING_TO_KEY)

  const today = useMemo(() => toDateStr(new Date()), [])

  const currentFy = fiscalYears.find((fy: any) => fy.isCurrent) ?? null

  const defaultFrom = currentFy?.startDate ? String(currentFy.startDate).slice(0, 10) : ''
  const defaultTo = (() => {
    if (!currentFy?.endDate) return today
    const fyEnd = String(currentFy.endDate).slice(0, 10)
    // min(today, FY end) — never report beyond today, never beyond the FY
    return fyEnd < today ? fyEnd : today
  })()

  const from = savedFrom || defaultFrom
  const to = savedTo || defaultTo

  const isLoading = valuesLoading || fyLoading

  return {
    from,
    to,
    defaultFrom,
    defaultTo,
    isDefault: !savedFrom && !savedTo,
    isLoading,
    setFrom: (value: string) => saveValue(REPORTING_FROM_KEY, value),
    setTo: (value: string) => saveValue(REPORTING_TO_KEY, value),
    reset: () => {
      saveValue(REPORTING_FROM_KEY, '')
      saveValue(REPORTING_TO_KEY, '')
    },
  }
}
