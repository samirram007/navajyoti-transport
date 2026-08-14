// ─── Income vs Expense Report Types ──────────────────────────────────────

export interface MonthlyDataPoint {
  month: string
  collected: number
  pending: number
  income_count: number
  expenses: number
  expense_count: number
  net: number
}

export interface GroupTotal {
  name: string
  total: number
}

export interface PaymentModeBreakdown {
  mode: string
  total: number
  count: number
}

export interface FiscalYearInfo {
  id: number
  name: string
  is_current: boolean
}

export interface IncomeExpenseSummary {
  total_income: number
  total_pending: number
  total_expenses: number
  total_fee_count: number
  total_expense_count: number
  net_revenue: number
  expense_ratio: number
}

export interface IncomeExpenseReport {
  summary: IncomeExpenseSummary
  monthly_data: MonthlyDataPoint[]
  income_by_group: GroupTotal[]
  expenses_by_group: GroupTotal[]
  payment_mode_income: PaymentModeBreakdown[]
  payment_mode_expenses: PaymentModeBreakdown[]
  fiscal_year: FiscalYearInfo | null
  filters: {
    from: string | null
    to: string | null
    fiscal_year_id: number | null
  }
}

// ─── Daily Collection Report Types ───────────────────────────────────────

export interface Transaction {
  id: number
  type: 'fee' | 'expense'
  date: string
  voucher_no: string
  rider_name: string
  description: string
  amount: number
  balance: number
  payment_mode: string
  fiscal_year: string
  status: string
}

export interface DailySummary {
  date: string
  total_income: number
  total_expenses: number
  net: number
  transaction_count: number
}

export interface DailyCollectionSummary {
  total_income: number
  total_expenses: number
  net: number
  transaction_count: number
  from: string
  to: string
}

export interface DailyCollectionReport {
  transactions: Transaction[]
  daily_summary: DailySummary[]
  summary: DailyCollectionSummary
  filters: {
    from: string
    to: string
  }
}

// ─── Rider-wise Fee Collection Report Types ─────────────────────────────

export interface RiderFeeData {
  rider_id: number
  rider_name: string
  rider_code: string | null
  class: string | null
  section: string | null
  roll_no: string | null
  school: string
  vehicle: string
  total_fees: number
  total_paid: number
  total_balance: number
  fee_count: number
  last_payment_date: string | null
  payment_mode: string | null
  status: 'paid' | 'partial' | 'unpaid' | 'no_fees'
}

export interface RiderFeeSummary {
  total_fees: number
  total_paid: number
  total_balance: number
  riders_with_fees: number
  active_riders: number
  collection_rate: number
  paid_count: number
  partial_count: number
  unpaid_count: number
}

export interface RiderFeeCollectionReport {
  summary: RiderFeeSummary
  riders: RiderFeeData[]
  fiscal_year: FiscalYearInfo | null
  filters: {
    from: string | null
    to: string | null
    fiscal_year_id: number | null
    school_id: number | null
    search: string | null
  }
}

// ─── Vehicle-wise Fee Collection Report Types ───────────────────────────

export interface VehicleFeeData {
  vehicle_id: number
  vehicle_name: string
  registration_no: string
  capacity: number
  vehicle_type: string
  rider_count: number
  total_fees: number
  total_paid: number
  total_balance: number
  fee_count: number
  last_payment_date: string | null
}

export interface VehicleFeeSummary {
  total_fees: number
  total_paid: number
  total_balance: number
  total_vehicles: number
  vehicles_with_fees: number
  collection_rate: number
  total_fee_count: number
}

export interface VehicleFeeCollectionReport {
  summary: VehicleFeeSummary
  vehicles: VehicleFeeData[]
  fiscal_year: FiscalYearInfo | null
  filters: {
    from: string | null
    to: string | null
    fiscal_year_id: number | null
    search: string | null
  }
}

// ─── School-wise Fee Collection Report Types ──────────────────────────────

export interface SchoolFeeData {
  school_id: number
  school_name: string
  school_code: string
  rider_count: number
  total_fees: number
  total_paid: number
  total_balance: number
  fee_count: number
  last_payment_date: string | null
}

export interface SchoolFeeSummary {
  total_fees: number
  total_paid: number
  total_balance: number
  total_schools: number
  schools_with_fees: number
  total_riders_with_fees: number
  collection_rate: number
  total_fee_count: number
}

export interface SchoolFeeCollectionReport {
  summary: SchoolFeeSummary
  schools: SchoolFeeData[]
  fiscal_year: FiscalYearInfo | null
  filters: {
    from: string | null
    to: string | null
    fiscal_year_id: number | null
  }
}

// ─── Monthly Trend Report Types ─────────────────────────────────────────

export interface MonthlyTrendDataPoint {
  month: string
  income: number
  pending: number
  expenses: number
  income_count: number
  expense_count: number
}

export interface YearTrend {
  fiscal_year: {
    id: number
    name: string
    is_current: boolean
  }
  total_income: number
  total_expenses: number
  net: number
  collection_rate: number
  monthly_data: MonthlyTrendDataPoint[]
}

export interface MonthlyTrendSummary {
  total_income_all_years: number
  total_expenses_all_years: number
  net_all_years: number
  years_count: number
  include_expenses: boolean
}

export interface MonthlyTrendReport {
  summary: MonthlyTrendSummary
  years: YearTrend[]
  all_month_labels: string[]
  current_fiscal_year: { id: number; name: string } | null
}

// ─── Pending Collection Report Types ────────────────────────────────────

export interface PendingFeeDetail {
  fee_id: number
  fee_no: string | null
  fee_date: string | null
  rider_id: number | null
  rider_name: string
  rider_code: string | null
  school: string
  vehicle: string
  billed: number
  collected: number
  pending: number
  payment_mode: string | null
  status: 'paid' | 'partial' | 'unpaid'
}

export interface PendingMonthData {
  month_id: number
  month_name: string
  fiscal_year_id: number | null
  fiscal_year_name: string | null
  billed: number
  collected: number
  pending: number
  fee_count: number
  pending_fee_count: number
  rider_count: number
  fees: PendingFeeDetail[]
}

export interface PendingCollectionSummary {
  total_billed: number
  total_collected: number
  total_pending: number
  collection_rate: number
  total_fee_count: number
  pending_fee_count: number
  riders_with_pending: number
  month_count: number
}

export interface PendingCollectionReport {
  summary: PendingCollectionSummary
  months: PendingMonthData[]
  fiscal_year: FiscalYearInfo | null
  filters: {
    from: string | null
    to: string | null
    fiscal_year_id: number | null
    month_id: number | null
    school_id: number | null
    search: string | null
  }
}

// ─── Credit Notes Report Types ──────────────────────────────────────────

export interface CreditNotesMonthData {
  month: string
  issued: number
  issued_count: number
  applied: number
  applied_count: number
  net: number
  cumulative_balance: number
}

export interface CreditNotesReportSummary {
  total_issued: number
  total_applied: number
  net: number
  issued_count: number
  applied_count: number
  opening_balance: number
  outstanding_balance: number
}

export interface CreditNotesReport {
  summary: CreditNotesReportSummary
  monthly_data: CreditNotesMonthData[]
  filters: {
    from: string | null
    to: string | null
  }
}

// ─── Fiscal Year (for filters) ──────────────────────────────────────────

export interface FiscalYear {
  id: number
  name: string
  isCurrent?: boolean
}
