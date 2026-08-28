/* oxlint-disable react/only-export-components */
import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface UserInitialValue {
  id: number
  user_id: number
  key: string
  value: string
  created_at?: string
  updated_at?: string
}

interface UserInitialValuesContextType {
  values: UserInitialValue[]
  isLoading: boolean
  error: Error | null
  getValue: (key: string) => string | undefined
  getRecord: (key: string) => UserInitialValue | undefined
  saveValue: (key: string, value: string) => void
  resetAll: () => Promise<void>
  isSaving: boolean
}

const UserInitialValuesContext = createContext<UserInitialValuesContextType | null>(null)

const QUERY_KEY = ['user-initial-values']
const MODULE_API_PATH = '/user_initial_values'

async function fetchAllValues(): Promise<UserInitialValue[]> {
  const res = await axiosClient.get(MODULE_API_PATH, {
    params: { per_page: 100 },
  })
  return res.data?.data ?? []
}

async function fetchByKey(key: string): Promise<UserInitialValue | null> {
  const res = await axiosClient.get(MODULE_API_PATH, {
    params: { filter_key: key },
  })
  const records = res.data?.data ?? []
  return records.length > 0 ? records[0] : null
}

export function UserInitialValuesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const {
    data: values = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAllValues,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const getValue = useCallback(
    (key: string): string | undefined => values.find((v) => v.key === key)?.value,
    [values],
  )

  const getRecord = useCallback(
    (key: string): UserInitialValue | undefined => values.find((v) => v.key === key),
    [values],
  )

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const existing = await fetchByKey(key)
      const payload = { user_id: user!.id, key, value }
      if (existing) {
        const res = await axiosClient.put(`${MODULE_API_PATH}/${existing.id}`, payload)
        return res.data?.data
      }
      const res = await axiosClient.post(MODULE_API_PATH, payload)
      return res.data?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: () => {
      toast.error('Failed to save preference')
    },
  })

  const saveValue = useCallback(
    (key: string, value: string) => {
      saveMutation.mutate({ key, value })
    },
    [saveMutation],
  )

  const resetAll = useCallback(async () => {
    // Delete every user_initial_value record for this user
    const deletePromises = values.map((v) =>
      axiosClient.delete(`${MODULE_API_PATH}/${v.id}`).catch(() => {})
    )
    await Promise.all(deletePromises)
    queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    toast.success('All preferences reset to defaults')
  }, [values, queryClient])

  return (
    <UserInitialValuesContext.Provider
      value={{
        values,
        isLoading,
        error,
        getValue,
        getRecord,
        saveValue,
        resetAll,
        isSaving: saveMutation.isPending,
      }}
    >
      {children}
    </UserInitialValuesContext.Provider>
  )
}

export function useUserInitialValues(): UserInitialValuesContextType {
  const context = useContext(UserInitialValuesContext)
  if (!context) {
    throw new Error('useUserInitialValues must be used within a UserInitialValuesProvider')
  }
  return context
}
