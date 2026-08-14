import axiosClient from '@/lib/axios-client'
import type { CreditNote } from './schemas'

export async function getCreditNotesApi(params: Record<string, string> = {}): Promise<CreditNote[]> {
  const res = await axiosClient.get('/credit_notes', {
    params: { per_page: 100, ...params },
  })
  return (res.data.data || []) as CreditNote[]
}

export async function voidCreditNoteApi(id: number): Promise<CreditNote> {
  const res = await axiosClient.post(`/credit_notes/${id}/void`)
  return res.data?.data as CreditNote
}
