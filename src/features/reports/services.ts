import axiosClient from '@/lib/axios-client'
import type { IncomeExpenseReport, DailyCollectionReport, RiderFeeCollectionReport, VehicleFeeCollectionReport, SchoolFeeCollectionReport, MonthlyTrendReport, PendingCollectionReport, CreditNotesReport } from './schemas'

export interface ReportFilters {
  from?: string
  to?: string
  fiscal_year_id?: number
  month_id?: number
  school_id?: number
  search?: string
  fiscal_year_ids?: string
  include_expenses?: boolean
}

export async function getIncomeExpenseReportApi(filters: ReportFilters = {}): Promise<IncomeExpenseReport> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.fiscal_year_id) params.fiscal_year_id = String(filters.fiscal_year_id)
  const res = await axiosClient.get('/reports/income-expense', { params })
  return res.data.data as IncomeExpenseReport
}

export async function getDailyCollectionReportApi(filters: { from?: string; to?: string } = {}): Promise<DailyCollectionReport> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  const res = await axiosClient.get('/reports/daily-collection', { params })
  return res.data.data as DailyCollectionReport
}

export async function getRiderFeeCollectionReportApi(filters: ReportFilters = {}): Promise<RiderFeeCollectionReport> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.fiscal_year_id) params.fiscal_year_id = String(filters.fiscal_year_id)
  if (filters.school_id) params.school_id = String(filters.school_id)
  if (filters.search) params.search = filters.search
  const res = await axiosClient.get('/reports/rider-fee-collection', { params })
  return res.data.data as RiderFeeCollectionReport
}

export async function getVehicleFeeCollectionReportApi(filters: ReportFilters = {}): Promise<VehicleFeeCollectionReport> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.fiscal_year_id) params.fiscal_year_id = String(filters.fiscal_year_id)
  if (filters.search) params.search = filters.search
  const res = await axiosClient.get('/reports/vehicle-fee-collection', { params })
  return res.data.data as VehicleFeeCollectionReport
}

export async function getSchoolFeeCollectionReportApi(filters: ReportFilters = {}): Promise<SchoolFeeCollectionReport> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.fiscal_year_id) params.fiscal_year_id = String(filters.fiscal_year_id)
  const res = await axiosClient.get('/reports/school-fee-collection', { params })
  return res.data.data as SchoolFeeCollectionReport
}

export async function getMonthlyTrendReportApi(filters: ReportFilters = {}): Promise<MonthlyTrendReport> {
  const params: Record<string, string> = {}
  if (filters.fiscal_year_ids) params.fiscal_year_ids = filters.fiscal_year_ids
  if (filters.include_expenses !== undefined) params.include_expenses = String(filters.include_expenses)
  const res = await axiosClient.get('/reports/monthly-trend', { params })
  return res.data.data as MonthlyTrendReport
}

export async function getPendingCollectionReportApi(filters: ReportFilters = {}): Promise<PendingCollectionReport> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.fiscal_year_id) params.fiscal_year_id = String(filters.fiscal_year_id)
  if (filters.month_id) params.month_id = String(filters.month_id)
  if (filters.school_id) params.school_id = String(filters.school_id)
  if (filters.search) params.search = filters.search
  const res = await axiosClient.get('/reports/pending-collection', { params })
  return res.data.data as PendingCollectionReport
}

export async function getCreditNotesReportApi(filters: ReportFilters = {}): Promise<CreditNotesReport> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  const res = await axiosClient.get('/reports/credit-notes', { params })
  return res.data.data as CreditNotesReport
}

/**
 * Download a report CSV using fetch (includes auth headers via axios).
 * This avoids the auth issue with window.open() which doesn't send Bearer tokens.
 */
export async function downloadReportCsv(
  reportType: 'income-expense' | 'daily-collection' | 'rider-fee-collection' | 'vehicle-fee-collection' | 'school-fee-collection' | 'monthly-trend' | 'pending-collection' | 'credit-notes',
  filters: ReportFilters = {}
): Promise<void> {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.fiscal_year_id) params.set('fiscal_year_id', String(filters.fiscal_year_id))
  if (filters.month_id) params.set('month_id', String(filters.month_id))
  if (filters.school_id) params.set('school_id', String(filters.school_id))
  if (filters.search) params.set('search', filters.search)
  if (filters.fiscal_year_ids) params.set('fiscal_year_ids', filters.fiscal_year_ids)
  if (filters.include_expenses !== undefined) params.set('include_expenses', String(filters.include_expenses))

  const baseUrl = axiosClient.defaults.baseURL || ''
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${baseUrl}/reports/${reportType}/csv?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/csv',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download CSV: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${reportType}-report.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * Download a report as XLSX using fetch (includes auth headers).
 */
export async function downloadReportXlsx(
  reportType: 'pending-collection',
  filters: ReportFilters = {}
): Promise<void> {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.fiscal_year_id) params.set('fiscal_year_id', String(filters.fiscal_year_id))
  if (filters.month_id) params.set('month_id', String(filters.month_id))
  if (filters.school_id) params.set('school_id', String(filters.school_id))
  if (filters.search) params.set('search', filters.search)

  const baseUrl = axiosClient.defaults.baseURL || ''
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${baseUrl}/reports/${reportType}/xlsx?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download XLSX: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${reportType}-report.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * Download a report as PDF using fetch (includes auth headers).
 */
export async function downloadReportPdf(
  reportType: 'pending-collection',
  filters: ReportFilters = {}
): Promise<void> {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.fiscal_year_id) params.set('fiscal_year_id', String(filters.fiscal_year_id))
  if (filters.month_id) params.set('month_id', String(filters.month_id))
  if (filters.school_id) params.set('school_id', String(filters.school_id))
  if (filters.search) params.set('search', filters.search)

  const baseUrl = axiosClient.defaults.baseURL || ''
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${baseUrl}/reports/${reportType}/pdf?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${reportType}-report.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
