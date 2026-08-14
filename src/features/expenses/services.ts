import axiosClient from '@/lib/axios-client'

export const generateNo = (prefix: string) => {
  const now = new Date()
  const d = now.toISOString().slice(0, 10).replace(/-/g, '')
  return `${prefix}-${d}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

export async function getExpensesApi() {
  const res = await axiosClient.get('/expenses')
  return res.data.data || []
}

export async function createExpenseApi(payload: any) {
  return axiosClient.post('/expenses', payload)
}

export async function updateExpenseApi(id: number, payload: any) {
  return axiosClient.put(`/expenses/${id}`, payload)
}

export async function deleteExpenseApi(id: number) {
  return axiosClient.delete(`/expenses/${id}`)
}

export async function getExpenseGroupsApi() {
  const res = await axiosClient.get('/expense_groups?per_page=500&page=1')
  return res.data.data || []
}

export async function getExpenseHeadsApi() {
  const res = await axiosClient.get('/expense_heads?per_page=500&page=1')
  return res.data.data || []
}

export async function getFiscalYearsApi() {
  const res = await axiosClient.get('/fiscal_years')
  return res.data.data || []
}
