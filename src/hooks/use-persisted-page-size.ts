import { useState, useEffect } from 'react'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'

const PAGE_SIZE_KEY = 'dataTablePageSize'

/**
 * Page size persisted per user via `user_initial_values`.
 * Falls back to `defaultSize` (10) until the saved value loads.
 */
export function usePersistedPageSize(defaultSize = 10) {
  const { getValue, saveValue, isLoading } = useUserInitialValues()
  const saved = getValue(PAGE_SIZE_KEY)
  const [pageSize, setPageSize] = useState(defaultSize)

  // Hydrate from saved value once it loads
  useEffect(() => {
    if (!isLoading && saved) {
      const num = Number(saved)
      if (num > 0 && num <= 100) setPageSize(num)
    }
  }, [isLoading, saved]) // eslint-disable-line react-hooks/exhaustive-deps

  const persistPageSize = (size: number) => {
    setPageSize(size)
    saveValue(PAGE_SIZE_KEY, String(size))
  }

  return [pageSize, persistPageSize] as const
}
