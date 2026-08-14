import { useEffect, useRef } from 'react'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'

/**
 * Auto-selects the user's preferred fiscal year from `user_initial_values`.
 * Selects once on mount when the saved preference becomes available,
 * and does not re-select if the user later clears the field.
 *
 * @param setValue - Callback invoked with the parsed fiscal year number when a saved preference exists.
 * @param currentValue - The current value of the fiscal year field (to avoid overwriting an already-set value).
 * @param enabled - Whether auto-selection is allowed (e.g., `false` in edit mode where edit data takes precedence).
 * @param onAutoSelect - Optional callback fired after a value is auto-selected (e.g., to show a toast).
 *
 * @returns The raw saved fiscal year ID string, or `undefined` if none is saved.
 *
 * @example
 * // Standalone state (fees POS)
 * useAutoSelectFiscalYear((num) => setFiscalYearId(num), fiscalYearId, !editing)
 *
 * @example
 * // Form object (expenses new/edit)
 * useAutoSelectFiscalYear(
 *   (num) => setForm(prev => ({ ...prev, fiscal_year_id: num })),
 *   form.fiscal_year_id,
 * )
 */
export function useAutoSelectFiscalYear(
  setValue: (value: number) => void,
  currentValue?: any,
  enabled = true,
  onAutoSelect?: (fiscalYearId: number) => void,
): string | undefined {
  const { getValue } = useUserInitialValues()
  const savedFiscalYearId = getValue('fiscalYearId')
  const hasSelected = useRef(false)

  useEffect(() => {
    if (!enabled) return
    if (!savedFiscalYearId) return
    if (hasSelected.current) return // only select once
    if (currentValue) {
      // Already has a value from edit data — mark as done
      hasSelected.current = true
      return
    }

    const num = Number(savedFiscalYearId)
    if (num) {
      setValue(num)
      hasSelected.current = true
      onAutoSelect?.(num)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedFiscalYearId, enabled])

  return savedFiscalYearId
}
