import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number = 300): { debouncedValue: T; isDebouncing: boolean } {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  const isDebouncing = value !== debouncedValue

  return { debouncedValue, isDebouncing }
}
