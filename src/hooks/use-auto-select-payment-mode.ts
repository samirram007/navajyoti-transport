import { useEffect, useRef } from 'react'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'

/**
 * Auto-selects the user's preferred payment mode from `user_initial_values`.
 * Selects once on mount when the saved preference becomes available,
 * and does not re-select if the user later changes the field.
 *
 * @param setValue - Callback invoked with the saved payment mode string when a saved preference exists.
 * @param currentValue - The current value of the payment mode field (to avoid overwriting an already-set value).
 * @param enabled - Whether auto-selection is allowed (e.g., `false` in edit mode where edit data takes precedence).
 * @param onAutoSelect - Optional callback fired after a value is auto-selected (e.g., to show a toast).
 *
 * @returns The saved payment mode string, or `undefined` if none is saved.
 *
 * @example
 * // Standalone state (fees POS)
 * useAutoSelectPaymentMode((val) => setPaymentMode(val), undefined, !editing)
 *
 * @example
 * // Form object (expenses new/edit)
 * useAutoSelectPaymentMode(
 *   (val) => setForm(prev => ({ ...prev, payment_mode: val })),
 *   form.payment_mode,
 * )
 */
export function useAutoSelectPaymentMode(
  setValue: (value: string) => void,
  currentValue?: any,
  enabled = true,
  onAutoSelect?: (paymentMode: string) => void,
): string | undefined {
  const { getValue } = useUserInitialValues()
  const savedPaymentMode = getValue('paymentMode')
  const hasSelected = useRef(false)

  useEffect(() => {
    if (!enabled) return
    if (!savedPaymentMode) return
    if (hasSelected.current) return // only select once
    if (currentValue) {
      // Already has a value from edit data — mark as done
      hasSelected.current = true
      return
    }

    setValue(savedPaymentMode)
    hasSelected.current = true
    onAutoSelect?.(savedPaymentMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPaymentMode, enabled])

  return savedPaymentMode
}
