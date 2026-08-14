import axiosClient from '@/lib/axios-client'

export async function getFeesApi() {
  const res = await axiosClient.get('/fees')
  return res.data.data || []
}

export async function createFeeApi(payload: any) {
  return axiosClient.post('/fees', payload)
}

export async function updateFeeApi(id: number, payload: any) {
  return axiosClient.put(`/fees/${id}`, payload)
}

export async function deleteFeeApi(id: number, createCreditNote = true) {
  return axiosClient.delete(`/fees/${id}`, {
    params: { create_credit_note: createCreditNote ? 1 : 0 },
  })
}

export async function searchRidersForFeesApi(text?: string) {
  const res = await axiosClient.get('/search_riders_for_fees', {
    params: text ? { text } : {},
  })
  return res.data.data || []
}

export async function getRiderApi(id: number | string) {
  const res = await axiosClient.get(`/riders/${id}`)
  return res.data?.data || null
}

export async function getFeeHeadsApi() {
  const res = await axiosClient.get('/fee_heads')
  return res.data.data || []
}

export async function getFiscalYearsApi() {
  const res = await axiosClient.get('/fiscal_years')
  return res.data.data || []
}

export async function getMonthsApi() {
  const res = await axiosClient.get('/months')
  return res.data.data || []
}

export async function getRiderPaidMonthsApi(riderId: number, fiscalYearId: number) {
  const res = await axiosClient.get('/rider_paid_months', {
    params: { rider_id: riderId, fiscal_year_id: fiscalYearId },
  })
  return res.data.data || []
}

export async function getRiderCreditApi(riderId: number | string) {
  const res = await axiosClient.get('/credit_notes/available', {
    params: { rider_id: riderId },
  })
  return res.data.data || { balance: 0, notes: [] }
}

export async function getRiderSnapshotsApi(riderId: number | string) {
  const res = await axiosClient.get(`/riders/${riderId}/snapshots`)
  return res.data.data || []
}

export async function getUserInitialValueByKeyApi(key: string) {
  const res = await axiosClient.get('/user_initial_values', {
    params: { 'filter_key': key },
  })
  const records = res.data.data || []
  return records.length > 0 ? records[0] : null
}

export async function saveUserInitialValueApi(payload: { user_id: number; key: string; value: string }) {
  // Try to find existing record first
  const existing = await getUserInitialValueByKeyApi(payload.key)
  if (existing) {
    const res = await axiosClient.put(`/user_initial_values/${existing.id}`, payload)
    return res.data.data
  } else {
    const res = await axiosClient.post('/user_initial_values', payload)
    return res.data.data
  }
}
