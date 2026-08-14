import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Tracks a recently saved key and auto-clears it after a duration
 * once an `isSaving` transition (true → false) is detected.
 *
 * @param isSaving — Whether a save operation is currently in progress.
 * @param duration — How long (ms) to show the indicator after save completes.
 * @returns An object with:
 *   - `savedKey`: the key that was recently saved (or null).
 *   - `markSaved(key)`: call this just before/on initiating a save.
 *   - `clearSaved()`: manually clear the indicator (e.g. on unmount).
 */
export function useSaveIndicator(isSaving: boolean, duration = 2000) {
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevIsSavingRef = useRef(isSaving)

  useEffect(() => {
    if (prevIsSavingRef.current && !isSaving && savedKey) {
      timerRef.current = setTimeout(() => {
        setSavedKey(null)
      }, duration)
    }
    prevIsSavingRef.current = isSaving
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // savedKey intentionally omitted — we only want to react to isSaving transitions.
    // The savedKey is set externally by markSaved() on user click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaving])

  const markSaved = useCallback((key: string) => {
    setSavedKey(key)
  }, [])

  const clearSaved = useCallback(() => {
    setSavedKey(null)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { savedKey, markSaved, clearSaved }
}
