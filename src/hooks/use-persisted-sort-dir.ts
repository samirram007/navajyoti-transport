import { useState, useEffect } from 'react'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'

/**
 * Default sort direction persisted per page via `user_initial_values`.
 *
 * @param pageKey - unique key for the page (e.g. 'fees', 'riders', 'vehicles')
 * @param defaultDir - fallback direction when nothing is saved ('desc')
 */
export function usePersistedSortDir(pageKey: string, defaultDir: 'asc' | 'desc' = 'desc') {
  const storageKey = `sortDir_${pageKey}`
  const { getValue, saveValue, isLoading } = useUserInitialValues()
  const saved = getValue(storageKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir)

  // Hydrate from saved value once it loads
  useEffect(() => {
    if (!isLoading && saved === 'asc') {
      setSortDir('asc')
    }
  }, [isLoading, saved]) // eslint-disable-line react-hooks/exhaustive-deps

  const persistSortDir = (dir: 'asc' | 'desc') => {
    setSortDir(dir)
    saveValue(storageKey, dir)
  }

  return [sortDir, persistSortDir] as const
}
