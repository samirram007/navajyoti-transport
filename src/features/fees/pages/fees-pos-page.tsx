import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FormError } from '@/components/ui/form-error'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  X, Search, Calendar, Wallet, Receipt,
  FileText, Loader2, CreditCard, Banknote, QrCode, Building2, Hash, User, Landmark,
  ShoppingCart, ChevronDown, ChevronRight, Printer, CheckCircle2, Check, Plus, AlertCircle, RefreshCw, History, XCircle, Ban,
} from 'lucide-react'
import {
  createFeeApi, updateFeeApi, deleteFeeApi, getFeeHeadsApi, getFiscalYearsApi, getMonthsApi,
  searchRidersForFeesApi, getRiderApi, getRiderPaidMonthsApi, getRiderSnapshotsApi, getRiderCreditApi,
  getOrganizationApi,
} from '@/features/fees/services'
import { FeeCreateSchema } from '@/features/fees/schemas'
import { CancelVoucherDialog } from '@/features/fees/components/cancel-voucher-dialog'
import { PrintPreviewDialog } from '@/components/print-preview-dialog'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/lib/use-debounce'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { useAutoSelectFiscalYear } from '@/hooks/use-auto-select-fiscal-year'
import { useAutoSelectPaymentMode } from '@/hooks/use-auto-select-payment-mode'

// ── Payment mode field definitions ──
interface PaymentField {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  type?: string
  placeholder?: string
}

const PAYMENT_MODE_FIELDS: Record<string, PaymentField[]> = {
  cash: [],
  cheque: [
    { key: 'cheque_no', label: 'Cheque No', icon: Hash, placeholder: 'Enter cheque number' },
    { key: 'cheque_date', label: 'Cheque Date', icon: Calendar, type: 'date' },
    { key: 'bank_name', label: 'Bank Name', icon: Building2, placeholder: 'Enter bank name' },
    { key: 'drawn_on', label: 'Drawn On (Branch)', icon: Landmark, placeholder: 'Enter branch name' },
  ],
  bank_transfer: [
    { key: 'transaction_id', label: 'Transaction ID', icon: Hash, placeholder: 'Enter transaction/reference ID' },
    { key: 'bank_name', label: 'Bank Name', icon: Building2, placeholder: 'Enter bank name' },
    { key: 'transfer_date', label: 'Transfer Date', icon: Calendar, type: 'date' },
  ],
  online: [
    { key: 'transaction_id', label: 'Transaction ID', icon: Hash, placeholder: 'Enter transaction ID' },
    { key: 'payment_gateway', label: 'Payment Gateway', icon: QrCode, placeholder: 'e.g. Razorpay, Stripe' },
    { key: 'upi_ref', label: 'UPI Ref / Notes', icon: FileText, placeholder: 'Optional reference' },
  ],
  card: [
    { key: 'card_last4', label: 'Card (Last 4)', icon: CreditCard, placeholder: 'Enter last 4 digits' },
    { key: 'card_holder', label: 'Card Holder Name', icon: User, placeholder: 'Enter card holder name' },
    { key: 'card_type', label: 'Card Type', icon: FileText, placeholder: 'e.g. Visa, Mastercard' },
  ],
}

interface FeeItemRow {
  tempId: number
  fee_head_id: number | ''
  fee_head_name?: string
  quantity: number
  amount: number
  total_amount: number
  months: { month_id: number; amount: number; is_waived: boolean }[]
}

const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function formatReceiptDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mmm = MONTHS_SHORT[d.getMonth()]
  const yyyy = d.getFullYear()
  return `${dd}-${mmm}-${yyyy}`
}

function computeOptedCount(items: FeeItemRow[]): Record<number, number> {
  const map: Record<number, number> = {}
  items.forEach(fi => {
    fi.months.forEach(m => {
      map[m.month_id] = (map[m.month_id] || 0) + 1
    })
  })
  return map
}

function buildReceiptHtml(data: {
  feeNo?: string; date: string; riderName?: string; riderStd?: string; riderSection?: string
  riderRollNo?: string; riderCode?: string; riderSchoolName?: string; riderSchoolTime?: string
  items: { name?: string; months?: string; qty: number; amount: number; total: number }[]
  totalAmount: number; paidAmount: number; balanceAmount: number; creditAmount?: number; paymentMode: string; note?: string
  paymentDetails?: Record<string, string>
  orgName?: string; orgAddress?: string
}) {
  const paymentDetailsHtml = data.paymentDetails && Object.keys(data.paymentDetails).length > 0
    ? Object.entries(data.paymentDetails)
      .filter(([, v]) => v)
      .map(([k, v]) => `<div>${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: <strong>${v}</strong></div>`)
      .join('')
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Money Receipt</title>
<style>
@page{size:A5 landscape;margin:10mm}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%}
body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#000;background:#fff}
.page{width:100%;min-height:100%;display:flex;flex-direction:column;padding:12px 16px}
.receipt-num{font-size:11pt;font-weight:600;letter-spacing:0.5px}
.date-line{text-align:right;font-size:10pt;color:#333;margin-top:-18px}
.org-center{text-align:center;margin-top:16px;margin-bottom:4px}
.org-center h1{font-size:18pt;font-weight:900;letter-spacing:2px;line-height:1.2}
.org-center p{font-size:8pt;color:#444;margin-top:2px;max-width:420px;margin-left:auto;margin-right:auto}
.receipt-title{text-align:center;font-size:13pt;font-weight:700;text-decoration:underline;margin:10px 0 12px 0;letter-spacing:1px}
.rider-info{margin-bottom:12px;font-size:10pt;line-height:1.8;padding-left:8px}
.rider-info .row{display:flex;flex-wrap:wrap;gap:0 24px}
.rider-info .label{font-weight:400;color:#333}
.rider-info .value{font-weight:700}
.table-section{flex:1;border-top:1px solid #000;border-bottom:2px solid #000}
table{width:100%;border-collapse:collapse}
thead th{background:#000;color:#fff;padding:6px 12px;font-size:9pt;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.5px}
thead th.r{text-align:right}
tbody td{padding:8px 12px;font-size:10pt;border-bottom:1px solid #ddd;vertical-align:top}
tbody td.r{text-align:right;font-variant-numeric:tabular-nums}
tbody tr:last-child td{border-bottom:none}
.total-row td{font-weight:800;font-size:12pt;border-top:2px solid #000!important;border-bottom:none!important}
.amount-words{margin-top:8px;font-size:9pt;color:#333;font-style:italic}
.stamp-area{display:flex;justify-content:flex-end;margin-top:20px;min-height:80px}
.stamp-circle{width:80px;height:80px;border:2px dashed #999;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7pt;color:#999;text-align:center}
.bottom{display:flex;gap:20px;border-top:2px solid #000;padding-top:10px;margin-top:auto}
.summary{flex:1}
.srow{display:flex;justify-content:space-between;padding:4px 0;font-size:11pt}
.srow.total{font-size:14pt;font-weight:900;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:4px}
.srow.paid{font-weight:700}
.srow.credit{font-weight:700}
.srow.balance{font-weight:800;font-size:12pt}
.payinfo{flex:1;display:flex;flex-direction:column;justify-content:center;border:1px solid #000;padding:12px 16px}
.payinfo strong{font-size:9pt;text-transform:uppercase;letter-spacing:1px}
.payinfo .mode{font-size:14pt;font-weight:800;margin-top:4px}
.payinfo .details{font-size:9pt;color:#333;margin-top:6px;line-height:1.6}
.note{border-left:3px solid #000;padding:8px 12px;font-size:9pt;color:#333;font-style:italic;margin-top:10px}
.ftr{text-align:center;font-size:8pt;color:#555;padding-top:8px;border-top:1px solid #000;margin-top:8px}
</style></head><body>
<div class="page">
  <div class="receipt-num">${data.feeNo || ''}</div>
  <div class="date-line">Date: ${data.date}</div>
  <div class="org-center">
    <h1>${data.orgName || 'JAY MAA KALI SCHOOL BUS SERVICE'}</h1>
    ${data.orgAddress ? `<p>${data.orgAddress}</p>` : ''}
  </div>
  <div class="receipt-title">Money Receipt</div>
  <div class="rider-info">
    <div class="row">
      <span><span class="label">Name: </span><span class="value">${data.riderName || '---'}</span></span>
    </div>
    <div class="row">
      <span><span class="label">School: </span><span class="value">${data.riderSchoolName || '---'}</span></span>
    </div>
    <div class="row">
      ${data.riderCode ? `<span><span class="label">Code: </span><span class="value">${data.riderCode}</span></span>` : ''}
      ${data.riderStd ? `<span><span class="label">Class: </span><span class="value">${data.riderStd}</span></span>` : ''}
      ${data.riderSection ? `<span><span class="label">Sec: </span><span class="value">${data.riderSection}</span></span>` : ''}
      ${data.riderRollNo ? `<span><span class="label">RollNo: </span><span class="value">${data.riderRollNo}</span></span>` : ''}
      ${data.riderSchoolTime ? `<span><span class="label">Time: </span><span class="value">${data.riderSchoolTime}</span></span>` : ''}
    </div>
  </div>
  <div class="table-section">
    <table>
      <thead><tr><th>Particulars</th><th class="r">Amount</th></tr></thead>
      <tbody>
        ${data.items.map(i => `<tr><td>${i.name || 'Fee'}${i.months ? ` <span style="font-size:8pt;color:#555;border:1px solid #ccc;padding:1px 4px;border-radius:3px;margin-left:4px">${i.months}</span>` : ''}</td><td class="r">${i.total.toLocaleString()}</td></tr>`).join('')}
        <tr class="total-row"><td style="text-align:right;font-weight:800">Total:</td><td class="r">${data.totalAmount.toLocaleString()}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="amount-words">(in words) : ${(() => {
    const num = data.totalAmount; if (num === 0) return 'Zero'
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    const convert = (n: number): string => {
      if (n < 20) return ones[n]; if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '')
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
    }
    const intPart = Math.floor(num); const decPart = Math.round((num - intPart) * 100)
    let result = convert(intPart) + ' Rupees'
    if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise'
    return result + ' Only'
  })()}</div>
  <div class="stamp-area">
    <div class="stamp-circle">Authorized<br/>Stamp</div>
  </div>
  <div class="ftr">${data.orgName || 'School Bus Service'} \u2022 ${data.date}</div>
</div>
</body></html>`
}

export function FeesPosPage({ editFee, initialRiderId }: { editFee?: any; initialRiderId?: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [riderId, setRiderId] = useState<number | ''>('')
  const [riderSnapshotId, setRiderSnapshotId] = useState<number | ''>('')
  const [riderSearch, setRiderSearch] = useState('')
  const [showRiderDropdown, setShowRiderDropdown] = useState(false)
  const [selectedRider, setSelectedRider] = useState<any>(null)
  const [feeDate, setFeeDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [fiscalYearId, setFiscalYearId] = useState<number | ''>('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [feeItems, setFeeItems] = useState<FeeItemRow[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const editing = editFee || null
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const cancelCreditNoteRef = useRef(true)
  const [creditAmount, setCreditAmount] = useState(0)
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
  const [printPreviewHtml, setPrintPreviewHtml] = useState('')

  const riderInputRef = useRef<HTMLInputElement>(null)
  const riderSearchRef = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)
  const wasOpen = useRef(false)
  const [pendingSelectId, setPendingSelectId] = useState<number | null>(null)
  const appliedChargeRef = useRef<string | number | null>(null)
  const editFeeMonthIds = useRef<Set<number>>(new Set())
  const originalFeeItems = useRef<any[]>([])

  // Animate dropdown close
  useEffect(() => {
    if (showRiderDropdown) {
      wasOpen.current = true
      setClosing(false)
    } else if (wasOpen.current) {
      wasOpen.current = false
      setClosing(true)
      const timer = setTimeout(() => setClosing(false), 220)
      return () => clearTimeout(timer)
    }
  }, [showRiderDropdown])

  // Initialize form from editFee (API returns camelCase keys from FeeResource)
  useEffect(() => {
    if (!editFee) return
    setRiderId(editFee.riderId || '')
    setRiderSnapshotId(editFee.riderSnapshotId || '')
    setSelectedRider(editFee.rider || null)
    setRiderSearch(editFee.rider?.name || '')
    setFeeDate(editFee.feeDate?.slice(0, 10) || new Date().toISOString().slice(0, 10))
    setFiscalYearId(editFee.fiscalYearId || '')
    setPaymentMode(editFee.paymentMode || 'cash')
    setPaymentDetails(editFee.paymentDetails || {})
    setNote(editFee.note || '')
    setCreditAmount(Number(editFee.creditAmount) || 0)
    // Months already paid by THIS fee — they stay editable on edit, while months
    // paid by other fees remain locked.
    editFeeMonthIds.current = new Set(
      (editFee.feeItems || []).flatMap((fi: any) => (fi.feeItemMonths || []).map((m: any) => (typeof m.monthId === 'object' ? m.monthId?.id : m.monthId))),
    )
    originalFeeItems.current = editFee.feeItems || []
    if (editFee.feeItems?.length) {
      setFeeItems(editFee.feeItems.map((fi: any) => ({
        tempId: fi.id || Date.now() + Math.random(),
        fee_head_name: fi.feeHead?.name || '',
        fee_head_id: fi.feeHeadId || '', quantity: fi.quantity || 0,
        amount: Number(fi.amount) || 0, total_amount: Number(fi.totalAmount) || 0,
        months: (fi.feeItemMonths || []).map((m: any) => ({
          month_id: typeof m.monthId === 'object' ? m.monthId?.id : m.monthId,
          amount: Number(m.amount) || 0, is_waived: !!m.isWaived,
        })),
      })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (riderSearchRef.current && !riderSearchRef.current.contains(e.target as Node)) {
        setShowRiderDropdown(false)
        setRiderSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus the dropdown's search input whenever it opens
  useEffect(() => {
    if (showRiderDropdown && riderInputRef.current) {
      requestAnimationFrame(() => riderInputRef.current?.focus())
    }
  }, [showRiderDropdown])

  // Ctrl+K to focus rider search, Escape to close dropdown
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && showRiderDropdown) {
        setShowRiderDropdown(false)
        setRiderSearch('')
        e.preventDefault()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowRiderDropdown(true)
        setSelectedRider(null)
        setRiderId('')
        setRiderSnapshotId('')
        setRiderSearch('')
        setTimeout(() => riderInputRef.current?.focus(), 50)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showRiderDropdown, selectedRider])

  const currentMonthNum = new Date().getMonth() + 1

  const { debouncedValue: debouncedSearch } = useDebounce(riderSearch, 300)

  // Rider snapshot versions (history) for the selected rider
  const { data: snapshotVersions = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ['rider-snapshots', riderId],
    queryFn: () => getRiderSnapshotsApi(riderId as number),
    enabled: !!riderId,
    staleTime: 60000,
  })

  // The rider details to render/use for the fee. Defaults to the live rider;
  // if a historical snapshot is chosen it takes precedence.
  const activeRider = useMemo(() => {
    if (riderSnapshotId) {
      const snap = snapshotVersions.find((s: any) => s.id === riderSnapshotId)
      if (snap) {
        return {
          ...(selectedRider || {}),
          name: snap.name,
          standard: snap.standard,
          section: snap.section,
          monthlyCharge: snap.monthlyCharge,
          school: snap.school,
          schoolTime: snap.schoolTime,
        }
      }
    }
    return selectedRider
  }, [riderSnapshotId, snapshotVersions, selectedRider])

  // Reset snapshot selection whenever a different rider is picked
  useEffect(() => {
    if (!editing) setRiderSnapshotId('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderId])

  // Apply monthlyCharge to fee items when rider changes OR a snapshot version is chosen.
  // Tracks the last applied charge so switching snapshots updates the fee accordingly.
  useEffect(() => {
    if (!activeRider) {
      appliedChargeRef.current = null
      setFeeItems(prev => prev.map(item =>
        item.amount > 0 ? { ...item, amount: 0, total_amount: 0 } : item
      ))
      return
    }
    const charge = activeRider.monthlyCharge ? Number(activeRider.monthlyCharge) : null
    if (charge === null || feeItems.length === 0) return
    const prev = appliedChargeRef.current !== null ? Number(appliedChargeRef.current) : null
    if (prev === null || prev !== charge) {
      setFeeItems(prevItems => prevItems.map(item => {
        const isMonthlyItem = prev === null
          ? item.amount === 0
          : Math.abs(Number(item.amount) - prev) < 0.01
        if (!isMonthlyItem) return item
        return {
          ...item,
          amount: charge,
          quantity: item.months?.length || 0,
          total_amount: (item.months?.length || 0) * charge,
        }
      }))
      appliedChargeRef.current = charge
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRider?.id, activeRider?.monthlyCharge])

  // Data fetching — keepPreviousData keeps the last list visible while loading,
  // so the dropdown never flashes a spinner between searches
  const { data: riders, isLoading: ridersLoading, isError: ridersError, refetch: refetchRiders } = useQuery({
    queryKey: ['riders-search', debouncedSearch],
    queryFn: () => searchRidersForFeesApi(debouncedSearch),
    enabled: showRiderDropdown || debouncedSearch.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60000, gcTime: 60000,
  })

  // Pre-fetch the default rider list on mount so the first dropdown open is instant
  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ['riders-search', ''], queryFn: () => searchRidersForFeesApi('') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Select a rider from the dropdown
  const handleRiderSelect = (rider: any) => {
    setSelectedRider(rider); setRiderId(rider.id); setRiderSnapshotId(''); setRiderSearch('')
    const tf = feeHeads?.find((fh: any) => fh.name?.toLowerCase().includes('transport')) || feeHeads?.[0]
    if (tf) { setFeeItems([{ tempId: Date.now(), fee_head_id: tf.id, fee_head_name: tf.name, quantity: 0, amount: Number(rider.monthlyCharge) || 0, total_amount: 0, months: [] }]) }
    // Brief highlight on the chosen option, then collapse the dropdown smoothly
    setPendingSelectId(rider.id)
    setTimeout(() => {
      setShowRiderDropdown(false)
      setPendingSelectId(null)
    }, 220)
  }

  // Toast notification when rider search fails
  useEffect(() => {
    if (ridersError) {
      toast.error('Failed to search riders. Check your connection and try again.', {
        duration: 4000,
      })
    }
  }, [ridersError])
  const { data: feeHeads, isLoading: feeHeadsLoading, isError: feeHeadsError } = useQuery({ queryKey: ['fee_heads'], queryFn: getFeeHeadsApi })
  const { data: fiscalYears, isLoading: fiscalYearsLoading, isError: fiscalYearsError } = useQuery({ queryKey: ['fiscal_years'], queryFn: getFiscalYearsApi })
  const { data: months, isLoading: monthsLoading, isError: monthsError } = useQuery({ queryKey: ['months'], queryFn: getMonthsApi })

  // Organization data for receipt
  const { data: orgData } = useQuery({
    queryKey: ['organization-for-receipt'],
    queryFn: () => getOrganizationApi(),
    staleTime: 5 * 60 * 1000,
  })

  // Year context for the transport fee — used to make month selection act per year
  const selectedFy = (fiscalYears || []).find((fy: any) => fy.id === fiscalYearId)
  const currentFy = (fiscalYears || []).find((fy: any) => fy.isCurrent)
  const fyIsPast = !!selectedFy && !!currentFy && new Date(selectedFy.endDate) < new Date(currentFy.startDate)
  const fyIsFuture = !!selectedFy && !!currentFy && new Date(selectedFy.startDate) > new Date(currentFy.endDate)

  const handleFiscalYearChange = (v: string) => {
    const nv = v ? Number(v) : ''
    setFiscalYearId(nv)
    if (nv) saveValue('fiscalYearId', String(nv))
    // Months chosen under a different year's context shouldn't carry over
    setFeeItems(prev => prev.map(fi => ({ ...fi, months: [], quantity: 0, total_amount: 0 })))
  }

  const { getValue, saveValue } = useUserInitialValues()

  // Auto-select fiscal year from saved preference
  useAutoSelectFiscalYear(
    (num) => setFiscalYearId(num),
    fiscalYearId,
    !editing,
    () => toast.success('Default fiscal year applied from your preferences'),
  )

  // Auto-select payment mode from saved preference (not in edit mode)
  useAutoSelectPaymentMode(
    (val) => setPaymentMode(val),
    undefined,
    !editing,
  )

  const { data: paidMonthIds = [] } = useQuery({
    queryKey: ['rider-paid-months', riderId, fiscalYearId],
    queryFn: () => getRiderPaidMonthsApi(riderId as number, fiscalYearId as number),
    enabled: !!riderId && !!fiscalYearId,
  })

  // Rider's available credit note balance (for credit adjustment on new fees)
  const { data: riderCredit } = useQuery({
    queryKey: ['rider-credit', riderId],
    queryFn: () => getRiderCreditApi(riderId as number),
    enabled: !!riderId,
    staleTime: 30000,
  })
  const availableCredit = Number(riderCredit?.balance) || 0

  // Months paid by OTHER fees (excludes this fee's own months, which stay
  // editable on edit). Used to lock month buttons.
  const otherPaidMonthIds = paidMonthIds.filter((id: number) => !editFeeMonthIds.current.has(id))

  // Pending (unpaid, due) transport months for the selected year — used for the notice
  const cartMonthIds = new Set(feeItems.flatMap(fi => fi.months.map((m: any) => m.month_id)))
  const pendingMonths = (months || []).filter((m: any) =>
    !paidMonthIds.includes(m.id) && !cartMonthIds.has(m.id) && (fyIsPast ? true : fyIsFuture ? false : m.number < currentMonthNum)
  )
  const pendingCount = pendingMonths.length
  const pendingAmount = pendingCount * (Number(activeRider?.monthlyCharge) || 0)

  const initRef = useRef(false)
  useEffect(() => {
    if (initRef.current) return
    if (!feeHeads || feeHeads.length === 0) return
    if (editing) return
    if (feeItems.length === 0) {
      const transportFee = feeHeads.find((fh: any) => fh.name?.toLowerCase().includes('transport')) || feeHeads[0]
      addFeeItem({ fee_head_id: transportFee.id, name: transportFee.name, amount: selectedRider ? Number(selectedRider.monthlyCharge) || 0 : 0 })
      initRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeHeads, editing])

  // Pre-select a rider passed via ?riderId= when opening a new fee collection
  const initialRiderFetchedRef = useRef(false)
  useEffect(() => {
    if (editFee || !initialRiderId || initialRiderFetchedRef.current) return
    initialRiderFetchedRef.current = true
    getRiderApi(initialRiderId)
      .then((rider: any) => {
        if (!rider) return
        setSelectedRider(rider)
        setRiderId(rider.id)
        setRiderSnapshotId('')
      })
      .catch(() => toast.error('Failed to load the selected rider'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRiderId])

  const totalAmount = feeItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
  // Credit note adjustment — adjustable on new fees, fixed when editing.
  const effectiveCredit = editing
    ? Math.min(Number(editFee?.creditAmount) || 0, Math.max(0, totalAmount))
    : Math.min(Math.max(0, creditAmount), availableCredit, Math.max(0, totalAmount))
  const paidAmount = Math.max(0, totalAmount - effectiveCredit)
  const balanceAmount = Math.max(0, totalAmount - paidAmount - effectiveCredit)
  // Fully cancelled (nothing left in the cart) → the update becomes a voucher cancellation
  const isCancellation = !!editing && totalAmount === 0

  const addFeeItem = (preset?: { fee_head_id: number; name: string; amount: number }) => {
    if (preset) {
      setFeeItems(prev => {
        if (prev.some(item => item.fee_head_id === preset.fee_head_id)) {
          toast.info(`${preset.name} is already in the cart`)
          return prev
        }
        const isTransport = preset.name?.toLowerCase().includes('transport')
        // In edit mode, re-adding a removed fee head restores its original paid months
        // and recorded amount, so the current paid months are detected again.
        const original = originalFeeItems.current.find((oi: any) => oi.feeHeadId === preset.fee_head_id)
        const months: { month_id: number; amount: number; is_waived: boolean }[] = (original?.feeItemMonths || []).map((m: any) => ({
          month_id: typeof m.monthId === 'object' ? m.monthId?.id : m.monthId,
          amount: Number(m.amount) || 0,
          is_waived: !!m.isWaived,
        }))
        const activeCount = months.filter(m => !m.is_waived).length
        const amount = original
          ? (Number(original.amount) || 0)
          : isTransport && activeRider?.monthlyCharge
            ? Number(activeRider.monthlyCharge)
            : (preset.amount || 0)
        const quantity = original ? (Number(original.quantity) || (activeCount || 1)) : 0
        const total_amount = original
          ? (Number(original.totalAmount) || (months.length ? activeCount * amount : amount))
          : (months.length ? activeCount * amount : 0)
        return [...prev, { tempId: Date.now(), fee_head_id: preset.fee_head_id, fee_head_name: preset.name, quantity, amount, total_amount, months }]
      })
    } else {
      setFeeItems(prev => [...prev, { tempId: Date.now(), fee_head_id: '', quantity: 0, amount: 0, total_amount: 0, months: [] }])
    }
  }

  const updateFeeItem = (tempId: number, field: string, value: any) => {
    setFeeItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'amount') {
        updated.total_amount = (updated.quantity || 0) * (updated.amount || 0)
      }
      return updated
    }))
  }

  const toggleMonth = (tempId: number, monthId: number) => {
    setFeeItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item
      const exists = item.months.find(m => m.month_id === monthId)
      const newMonths = exists
        ? item.months.filter(m => m.month_id !== monthId)
        : [...item.months, { month_id: monthId, amount: item.amount, is_waived: false }]
      const activeCount = newMonths.filter(m => !m.is_waived).length
      return { ...item, months: newMonths, quantity: activeCount, total_amount: activeCount * (item.amount || 0) }
    }))
  }

  const toggleWaiveMonth = (tempId: number, monthId: number) => {
    setFeeItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item
      const newMonths = item.months.map(m => m.month_id === monthId ? { ...m, is_waived: !m.is_waived } : m)
      const activeCount = newMonths.filter(m => !m.is_waived).length
      return { ...item, months: newMonths, quantity: activeCount, total_amount: activeCount * (item.amount || 0) }
    }))
  }

  const removeFeeItem = (tempId: number) => setFeeItems(prev => prev.filter(item => item.tempId !== tempId))

  const currentPaymentFields = PAYMENT_MODE_FIELDS[paymentMode] || []

  /** Build camelCase payload for the API (StoreFeeRequest expects camelCase) */
  const buildFeePayload = () => ({
    riderId: riderId || undefined, riderSnapshotId: riderSnapshotId || undefined,
    feeDate: feeDate,
    fiscalYearId: fiscalYearId || undefined, paymentMode: paymentMode || undefined,
    paidAmount: paidAmount, totalAmount: totalAmount, balanceAmount: balanceAmount,
    creditAmount: effectiveCredit > 0 ? effectiveCredit : undefined,
    note: note || undefined,
    paymentDetails: Object.keys(paymentDetails).length > 0 ? paymentDetails : undefined,
    feeItems: feeItems.map(item => ({
      feeHeadId: item.fee_head_id || undefined, quantity: item.quantity,
      amount: item.amount, totalAmount: item.total_amount,
      months: item.months.map(m => ({ monthId: m.month_id, amount: m.amount, isWaived: m.is_waived })),
    })),
  })

  const handleFeeSubmit = () => {
    setFormErrors({})
    if (isCancellation) {
      mutation.mutate()
      return
    }
    // Build snake_case payload for Zod validation (FeeCreateSchema uses snake_case)
    const validationPayload = {
      rider_id: riderId || undefined,
      fee_date: feeDate,
      fiscal_year_id: fiscalYearId || undefined,
      payment_mode: paymentMode || undefined,
      paid_amount: paidAmount,
      total_amount: totalAmount,
      balance_amount: balanceAmount,
      credit_amount: effectiveCredit > 0 ? effectiveCredit : undefined,
      note: note || undefined,
      payment_details: Object.keys(paymentDetails).length > 0 ? paymentDetails : undefined,
      fee_items: feeItems.map(item => ({
        fee_head_id: item.fee_head_id || undefined,
        quantity: item.quantity,
        amount: item.amount,
        total_amount: item.total_amount,
        months: item.months.map(m => ({ month_id: m.month_id, amount: m.amount, is_waived: m.is_waived })),
      })),
    }
    const result = FeeCreateSchema.safeParse(validationPayload)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const mapped: Record<string, string> = {}
      for (const [key, msgs] of Object.entries(fieldErrors)) {
        if (msgs && msgs.length > 0) mapped[key] = msgs[0]
      }
      setFormErrors(mapped)
      toast.error('Please fix the validation errors')
      return
    }
    mutation.mutate()
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (isCancellation) {
        const res = await deleteFeeApi(editing.id, cancelCreditNoteRef.current)
        return res.data?.data ?? null
      }
      const payload = buildFeePayload()
      if (editing) return (await updateFeeApi(editing.id, payload)).data?.data
      return (await createFeeApi(payload)).data?.data
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      if (isCancellation) {
        const cn = (created as any)?.creditNote
        toast.success(cn
          ? `Voucher cancelled — credit note ${cn.creditNoteNo} of ₹${Number(cn.amount).toLocaleString()} created for this rider`
          : 'Voucher cancelled successfully')
        goBack()
        return
      }
      toast.success(editing ? 'Fee updated successfully' : 'Payment completed!')
      if (!created) return
      setLastReceipt(created)
      setShowSuccess(true)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Operation failed'),
  })

  const handleQuickPay = (mode: string) => {
    if (mode === paymentMode) return // Don't clear details if same mode is clicked
    setPaymentMode(mode)
    setPaymentDetails({})
  }

  const goBack = () => { window.history.back() }

  // Cancelled vouchers are write-off records — they must not be edited.
  if (editing?.isDeleted) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
          <Ban className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Voucher is cancelled</h2>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            {editing.feeNo || 'This voucher'} has been cancelled and cannot be edited. Cancelled vouchers are
            retained for audit only — cancel actions (e.g. creating a credit note) already took effect.
          </p>
        </div>
        <Button size="sm" onClick={goBack}>
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to Fees
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* POS Header */}
      <header className="h-12 border-b bg-card shadow-elevation-1 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={goBack}>
            <ChevronRight className="h-3 w-3 rotate-180" /> Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{editing ? 'Edit Fee' : 'New Fee Collection'}</span>
          {editing && <span className="text-[10px] text-muted-foreground">#{editing?.feeNo || ''}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date().toLocaleDateString()}</span>
          {(editing || showSuccess) && (
            <Button
              variant="ghost" size="sm" className="h-7 text-xs gap-1"
              onClick={() => {
                const receipt = showSuccess ? lastReceipt : editing
                if (!receipt) return
                setPrintPreviewHtml(buildReceiptHtml({
                  feeNo: receipt.feeNo,
                  date: formatReceiptDate(receipt.feeDate || feeDate),
                  riderName: activeRider?.name,
                  riderStd: activeRider?.standard,
                  riderSection: activeRider?.section,
                  riderRollNo: activeRider?.rollNo,
                  riderCode: activeRider?.code,
                  riderSchoolName: activeRider?.school?.name,
                  riderSchoolTime: activeRider?.schoolTime,
                  items: feeItems.map(i => {
                    const fyYear = selectedFy?.startDate ? new Date(selectedFy.startDate).getFullYear() : '';
                    return {
                      name: i.fee_head_name,
                      months: i.months.map(m => {
                        const month = months?.find((mo: any) => mo.id === m.month_id);
                        return { num: month?.number || 0, label: (() => { const name = month?.shortName || month?.name || ''; return name && fyYear ? `${name} ${String(fyYear).slice(-2)}` : name; })() };
                      }).filter((m: any) => m.label).sort((a: any, b: any) => a.num - b.num).map((m: any) => m.label).join(', '),
                      qty: i.quantity, amount: i.amount, total: i.total_amount,
                    };
                  }),
                  totalAmount, paidAmount, balanceAmount,
                  creditAmount: effectiveCredit, paymentMode, note, paymentDetails,
                  orgName: orgData?.name,
                  orgAddress: orgData?.address
                    ? [orgData.address.addressLine1, orgData.address.addressLine2, orgData.address.city, orgData.address.state, orgData.address.pincode, orgData.address.country].filter(Boolean).join(', ')
                    : undefined,
                }))
                setPrintPreviewOpen(true)
              }}
            >
              <Printer className="h-3 w-3" /> Print
            </Button>
          )}
        </div>
      </header>

      {/* POS Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===== LEFT PANEL ===== */}
        <div className="flex-1 flex flex-col overflow-hidden border-r">
          <div className="grid grid-cols-2 gap-2 p-4 border-b bg-card shrink-0">

            {/* Rider Search */}
            <div className="p-4 border-r bg-card shrink-0">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {selectedRider && !showRiderDropdown ? 'Selected Rider' : 'Search Rider'}
              </label>
              <div ref={riderSearchRef} className="relative">
                {/* Trigger — always shows the current value; clicking toggles dropdown */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={showRiderDropdown}
                  aria-haspopup="listbox"
                  className={cn(
                    'flex items-center rounded-lg border-2 h-12 gap-2.5 px-3.5 transition-all duration-200 cursor-pointer select-none',
                    showRiderDropdown
                      ? 'border-primary ring-1 ring-primary/20 bg-background shadow-md'
                      : selectedRider
                        ? 'border-primary/40 bg-primary/5 shadow-sm shadow-primary/10 dark:border-primary/30 dark:bg-primary/10'
                        : 'border-input bg-background shadow-sm hover:border-primary/40'
                  )}
                  onClick={() => {
                    if (!mutation.isPending) setShowRiderDropdown(o => !o)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (!mutation.isPending) setShowRiderDropdown(o => !o)
                    } else if (e.key === 'Escape') {
                      setShowRiderDropdown(false)
                    }
                  }}
                >
                  {selectedRider ? (
                    <>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shrink-0 shadow-sm">
                        <span className="text-sm font-bold">{activeRider.name?.charAt(0) || '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-foreground truncate">{activeRider.name}</span>
                          {activeRider.monthlyCharge && <span className="text-xs font-semibold text-primary shrink-0">₹{Number(activeRider.monthlyCharge).toLocaleString()}/mo</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground/70">
                          {activeRider.standard}{activeRider.section ? `-${activeRider.section}` : ''}
                          {activeRider.school?.name ? ` · ${activeRider.school.name}` : ''}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shrink-0 shadow-sm">
                        <Search className="h-4 w-4" />
                      </div>
                      <span className="flex-1 text-sm text-muted-foreground truncate">Search rider by name...</span>
                    </>
                  )}
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', showRiderDropdown && 'rotate-180')} />
                </div>

                {/* Rider Dropdown */}
                {(showRiderDropdown || closing) && (
                  <div className={cn(
                    'absolute z-50 w-full mt-1.5 bg-popover border rounded-xl shadow-xl shadow-black/5 flex flex-col overflow-hidden',
                    closing ? 'animate-out fade-out zoom-out-95 slide-out-to-top-2 duration-200 ease-out' : 'animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ease-out'
                  )}>
                    {/* Search input */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 shrink-0">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                      <input
                        ref={riderInputRef}
                        id="rider-search"
                        type="text"
                        placeholder="Search rider by name..."
                        aria-label="Search rider"
                        value={riderSearch}
                        onChange={e => { setRiderSearch(e.target.value); setShowRiderDropdown(true) }}
                        disabled={mutation.isPending}
                        className="flex h-8 w-full rounded-md bg-background px-2.5 text-sm outline-none ring-1 ring-border/50 focus:ring-primary/30 focus:ring-2 transition-all duration-150 placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <div className="border-t border-border/50" />

                    {/* Options */}
                    <div className="overflow-y-auto p-1 flex-1 max-h-72" role="listbox">
                      {ridersLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading riders...
                        </div>
                      ) : ridersError ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-6 text-sm">
                          <AlertCircle className="h-8 w-8 text-destructive/70" />
                          <div className="text-center">
                            <span className="font-medium text-destructive">Search failed</span>
                            <span className="text-xs text-muted-foreground block mt-0.5">Could not load riders. Check your connection and try again.</span>
                          </div>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => refetchRiders()}>
                            <RefreshCw className="h-3.5 w-3.5" /> Retry
                          </Button>
                        </div>
                      ) : (riders && riders.length === 0) ? (
                        <div className="flex flex-col items-center justify-center gap-1 py-6 text-sm text-muted-foreground">
                          <Search className="h-6 w-6 text-muted-foreground/40" />
                          <span className="font-medium">No riders found</span>
                          <span className="text-xs text-muted-foreground/60">Try a different search term</span>
                        </div>
                      ) : riders?.map((rider: any) => {
                        const isSelected = rider.id === riderId
                        return (
                          <button key={rider.id} type="button" role="option" aria-selected={isSelected || pendingSelectId === rider.id}
                            className={cn(
                              'w-full text-left rounded-lg transition-all duration-150 hover:bg-accent active:scale-[0.98]',
                              (isSelected || pendingSelectId === rider.id) && 'bg-primary/10'
                            )}
                            onClick={() => handleRiderSelect(rider)}
                          >
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center text-base font-bold shadow-sm ring-1 ring-primary/10">
                                  {rider.name?.charAt(0) || '?'}
                                </div>
                                <div className={cn('absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background', isSelected ? 'bg-primary' : 'bg-primary/50')} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn('font-bold text-sm truncate', isSelected && 'text-primary')}>{rider.name}</span>
                                  <span className="text-[11px] text-muted-foreground/60 font-medium">#{rider.id}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs text-muted-foreground">{rider.standard}{rider.section ? `-${rider.section}` : ''}</span>
                                  {rider.school?.name && <><span className="text-[10px] text-muted-foreground/30">|</span><span className="text-xs text-muted-foreground truncate">{rider.school.name}</span></>}
                                </div>
                              </div>
                              {isSelected ? (
                                <Check className="h-4 w-4 shrink-0 text-primary" />
                              ) : rider.monthlyCharge ? (
                                <span className="text-sm font-bold text-primary shrink-0">₹{Number(rider.monthlyCharge).toLocaleString()}</span>
                              ) : null}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <FormError message={formErrors['rider_id']} />
            </div>

            {/* Rider Snapshot version selector */}
            {selectedRider && !showRiderDropdown && (
              <div className="p-4 bg-card shrink-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rider snapshot version</span>
                </div>
                {snapshotsLoading ? (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading versions...
                  </div>
                ) : snapshotVersions.length > 0 ? (
                  <div className="mt-2">
                    <SearchableSelect
                    className="w-full h-12"
                      value={riderSnapshotId ? String(riderSnapshotId) : String(snapshotVersions[0]?.id ?? '')}
                      onValueChange={(val) => {
                        setRiderSnapshotId(val ? Number(val) : '')
                      }}
                      options={snapshotVersions.map((s: any, i: number) => ({
                        value: s.id,
                        label: i === 0
                          ? `Current (${s.name}${s.standard ? ` · ${s.standard}${s.section ? `-${s.section}` : ''}` : ''})`
                          : `v${snapshotVersions.length - i} (${s.standard ? `${s.standard}${s.section ? `-${s.section}` : ''}` : 'N/A'} · ${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''})`,
                      }))}
                      placeholder="Select a snapshot version (default: current)"
                      searchPlaceholder="Search versions..."
                      emptyMessage="No snapshot versions found"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70 mt-1">No snapshot history for this rider.</p>
                )}
              </div>
            )}
          </div>

          {/* Fee Items */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" /> Fee Items
                  {feeItems.length > 0 && <span className="text-xs font-normal text-muted-foreground">({feeItems.length} items)</span>}
                </h3>
                {!fiscalYearsLoading && !fiscalYearsError && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Year</span>
                    <SearchableSelect value={String(fiscalYearId)}
                      onValueChange={handleFiscalYearChange}
                      options={(fiscalYears || []).map((fy: any) => ({ label: fy.name, value: fy.id }))}
                      placeholder="Select year" searchPlaceholder="Search year..." className="h-8 w-28 text-xs"
                    />
                  </div>
                )}
              </div>

              {feeItems.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-xl">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>No items in cart</p>
                  <p className="text-xs mt-1">Select fee heads below to add items</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {feeItems.map((item) => (
                    <div key={item.tempId} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">{item.fee_head_name || `Item #${item.tempId}`}</span>
                            {selectedFy && (
                              <span className={cn('shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5 uppercase tracking-wide',
                                fyIsPast ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : fyIsFuture ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                                    : 'bg-primary/10 text-primary'
                              )}>
                                {fyIsPast ? 'FY ' : ''}{selectedFy.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Input type="number" id={`item-amount-${item.tempId}`} min="0" value={item.amount || ''}
                              onChange={e => updateFeeItem(item.tempId, 'amount', Number(e.target.value) || 0)}
                              disabled={mutation.isPending} className="w-28 h-9 text-base font-medium text-right px-3" placeholder="Amount"
                              aria-label={`Amount for ${item.fee_head_name || 'fee item'}`}
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100"
                              disabled={mutation.isPending} onClick={() => removeFeeItem(item.tempId)}
                            ><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>

                        {/* Month Selection */}
                        <div className="mt-2">
                          {pendingCount > 0 && (
                            <div className="flex items-start gap-1.5 px-2 py-1.5 mb-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-400">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
                              <span>
                                <strong>{pendingCount}</strong> month{pendingCount > 1 ? 's' : ''} pending
                                {selectedFy?.name ? <> for FY {selectedFy.name}</> : ''}
                                {pendingAmount > 0 ? <> · ₹{pendingAmount.toLocaleString()}</> : ''}
                                — select them below to collect.
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-2">
                            <span>Select months:</span>
                            <div className="flex items-center gap-1 ml-auto">
                              <button type="button" disabled={mutation.isPending} onClick={() => {
                                setFeeItems(prev => {
                                  const c = computeOptedCount(prev)
                                  return prev.map(fi => {
                                    if (fi.tempId !== item.tempId) return fi
                                    const avail = (months || []).filter((m: any) => !otherPaidMonthIds.includes(m.id) && !fi.months.some(im => im.month_id === m.id) && (c[m.id] || 0) === 0)
                                      .map((m: any) => ({ month_id: m.id, amount: fi.amount, is_waived: false }))
                                    const all = [...fi.months, ...avail]
                                    return { ...fi, months: all, quantity: all.length, total_amount: all.length * (fi.amount || 0) }
                                  })
                                })
                              }} className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">Select All</button>
                              {!fyIsPast && (
                                <>
                                  <span className="text-muted-foreground/40">|</span>
                                  <button type="button" disabled={mutation.isPending} onClick={() => {
                                    setFeeItems(prev => {
                                      const c = computeOptedCount(prev)
                                      return prev.map(fi => {
                                        if (fi.tempId !== item.tempId) return fi
                                        const avail = (months || []).filter((m: any) => (fyIsFuture || m.number >= currentMonthNum) && !otherPaidMonthIds.includes(m.id) && !fi.months.some(im => im.month_id === m.id) && (c[m.id] || 0) === 0)
                                          .map((m: any) => ({ month_id: m.id, amount: fi.amount, is_waived: false }))
                                        const all = [...fi.months, ...avail]
                                        return { ...fi, months: all, quantity: all.length, total_amount: all.length * (fi.amount || 0) }
                                      })
                                    })
                                  }} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Curr. & Future</button>
                                </>
                              )}
                              {!fyIsFuture && (
                                <>
                                  <span className="text-muted-foreground/40">|</span>
                                  <button type="button" disabled={mutation.isPending} onClick={() => {
                                    setFeeItems(prev => {
                                      const c = computeOptedCount(prev)
                                      return prev.map(fi => {
                                        if (fi.tempId !== item.tempId) return fi
                                        const avail = (months || []).filter((m: any) => (fyIsPast || m.number < currentMonthNum) && !otherPaidMonthIds.includes(m.id) && !fi.months.some(im => im.month_id === m.id) && (c[m.id] || 0) === 0)
                                          .map((m: any) => ({ month_id: m.id, amount: fi.amount, is_waived: false }))
                                        const all = [...fi.months, ...avail]
                                        return { ...fi, months: all, quantity: all.length, total_amount: all.length * (fi.amount || 0) }
                                      })
                                    })
                                  }} className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors" title="Select all previous months that are unpaid, not already added, and not opted in another item">Prev. Unpaid</button>
                                </>
                              )}
                              <span className="text-muted-foreground/40">|</span>
                              <button type="button" disabled={mutation.isPending} onClick={() => {
                                setFeeItems(prev => prev.map(fi => fi.tempId === item.tempId ? { ...fi, months: [], quantity: 0, total_amount: 0 } : fi))
                              }} className="text-[11px] font-semibold text-destructive hover:text-destructive/80 transition-colors">Clear All</button>
                            </div>
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-sm bg-amber-400 dark:bg-amber-600" />Prev
                              <span className="inline-block w-2 h-2 rounded-sm bg-green-400 dark:bg-green-600" />Paid
                              <span className="inline-block w-2 h-2 rounded-sm bg-blue-400 dark:bg-blue-600" />Opted
                              <span className="inline-block w-2 h-2 rounded-sm bg-orange-400 dark:bg-orange-600" />Waived
                            </span>
                          </div>
                          {monthsLoading ? (
                            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              Loading months...
                            </div>
                          ) : monthsError ? (
                            <div className="flex items-center gap-2 py-3 text-xs text-destructive">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Failed to load months
                            </div>
                          ) : !months || months.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No months available</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const optedCountMap: Record<number, number> = {}
                                const monthTotalsMap: Record<number, number> = {}
                                feeItems.forEach(fi => {
                                  fi.months.forEach(m => {
                                    optedCountMap[m.month_id] = (optedCountMap[m.month_id] || 0) + 1
                                    if (!m.is_waived) monthTotalsMap[m.month_id] = (monthTotalsMap[m.month_id] || 0) + (m.amount || fi.amount || 0)
                                  })
                                })
                                const maxMonthTotal = Math.max(...Object.values(monthTotalsMap), 0)
                                return months.map((m: any) => {
                                  const isPaid = otherPaidMonthIds.includes(m.id)
                                  const isSelected = item.months.some(im => im.month_id === m.id)
                                  const monthEntry = item.months.find(im => im.month_id === m.id)
                                  const isWaived = monthEntry?.is_waived || false
                                  const monthCount = optedCountMap[m.id] || 0
                                  const monthTotal = monthTotalsMap[m.id] || 0
                                  const isOptedElsewhere = !isSelected && monthCount > 0
                                  const isPrevious = fyIsPast ? true : fyIsFuture ? false : m.number < currentMonthNum
                                  const isDisabled = isPaid || isOptedElsewhere
                                  const isHighestTotal = monthTotal === maxMonthTotal && maxMonthTotal > 0 && !isSelected && !isDisabled
                                  const ml = m.name?.length > 4 ? m.name.slice(0, 3) + '.' : m.name
                                  return (
                                    <button key={m.id} type="button" disabled={isDisabled || mutation.isPending}
                                      onClick={() => {
                                        if (isDisabled) return
                                        if (isSelected && !isWaived) toggleWaiveMonth(item.tempId, m.id)
                                        else if (isSelected && isWaived) toggleMonth(item.tempId, m.id)
                                        else toggleMonth(item.tempId, m.id)
                                      }}
                                      className={cn('px-3 py-2 text-sm font-medium rounded-lg border transition-all inline-flex items-center gap-1.5',
                                        isPaid ? 'border-green-300/30 bg-green-50/20 text-green-900 opacity-70 cursor-not-allowed dark:bg-green-950/10 dark:text-green-400 dark:border-green-700/30'
                                          : isOptedElsewhere ? 'border-blue-300/30 bg-blue-50/20 text-blue-900 opacity-70 cursor-not-allowed dark:bg-blue-950/10 dark:text-blue-400 dark:border-blue-700/30'
                                            : isSelected && isWaived ? 'border-muted bg-muted/50 text-muted-foreground line-through'
                                              : isSelected ? 'border-primary bg-primary/15 text-primary font-semibold'
                                                : isPrevious ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700'
                                                  : 'border-input hover:bg-accent text-muted-foreground',
                                        isHighestTotal && 'ring-2 ring-primary/30'
                                      )}
                                      title={`${isPaid ? `${m.name} (already paid)` : isOptedElsewhere ? `${m.name} (opted elsewhere)` : isSelected && isWaived ? `${m.name} (waived)` : isSelected ? `${m.name} (click to waive)` : isPrevious ? `${m.name} (previous month)` : m.name}`}
                                    >
                                      <span className={cn(isWaived && 'line-through')}>{ml}</span>
                                      {isWaived && isSelected && <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-[3px] text-[10px] font-bold rounded-full bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200 leading-none">W</span>}
                                      {!isWaived && monthCount > 0 && (
                                        <span className={cn('inline-flex items-center justify-center min-w-[18px] h-[18px] px-[4px] text-[11px] font-bold rounded-full leading-none',
                                          isPaid ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                        )}>{monthCount}</span>
                                      )}
                                    </button>
                                  )
                                })
                              })()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1.5 text-sm text-muted-foreground">
                          <span>{item.months.length} month{item.months.length !== 1 ? 's' : ''} selected{(() => { const w = item.months.filter(m => m.is_waived).length; return w > 0 ? ` (${w} waived)` : '' })()}</span>
                          <span className="font-semibold text-foreground">= {item.total_amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <FormError message={formErrors['fee_items']} />
            </div>
          </div>

          {/* Quick Fee Head Buttons */}
          <div className="p-4 border-t bg-card shrink-0 shadow-[0_-4px_6px_-4px_hsl(var(--shadow-color)/0.06)]">
            <div className="text-sm font-semibold text-muted-foreground mb-2">Quick Add Fee</div>
            <div className="flex flex-wrap gap-2">
              {feeHeadsLoading ? (
                <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Loading fee heads...
                </div>
              ) : feeHeadsError ? (
                <div className="flex items-center gap-2 py-3 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Failed to load fee heads
                </div>
              ) : feeHeads?.slice(0, 8).map((fh: any) => {
                const isInCart = feeItems.some(item => item.fee_head_id === fh.id)
                return (
                  <button key={fh.id} type="button" disabled={mutation.isPending}
                    onClick={() => addFeeItem({ fee_head_id: fh.id, name: fh.name, amount: 0 })}
                    className={cn('px-4 py-2 text-sm font-medium rounded-full border transition-colors',
                      isInCart ? 'bg-green-50 border-green-300 text-green-800 cursor-default dark:bg-green-950/30 dark:text-green-400 dark:border-green-700' : 'hover:bg-accent hover:border-accent-foreground/20'
                    )}
                  >
                    {isInCart ? <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> : <Plus className="h-3.5 w-3.5 inline mr-1" />}
                    {fh.name}
                  </button>
                )
              })}
              {!feeHeadsLoading && !feeHeadsError && (!feeHeads || feeHeads.length === 0) && <span className="text-xs text-muted-foreground">No fee heads available</span>}
            </div>
          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <div className="w-80 shrink-0 flex flex-col bg-card">
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1.5 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input type="date" id="fee-date" value={feeDate} onChange={e => setFeeDate(e.target.value)} disabled={mutation.isPending}
                  className={cn('flex-1 h-9 text-base border-0 border-b border-dotted rounded-none px-0', mutation.isPending ? 'border-muted-foreground/10 text-muted-foreground' : 'border-muted-foreground/30')}
                  aria-label="Fee date" />
              </div>
              {fiscalYearsLoading ? (
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 text-xs text-muted-foreground gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading fiscal years...
                </div>
              ) : fiscalYearsError ? (
                <div className="h-9 flex items-center px-3 rounded-md border bg-red-50 dark:bg-red-950/20 text-xs text-destructive gap-2">
                  <AlertCircle className="h-3 w-3" />
                  Failed to load fiscal years
                </div>
              ) : (
                <SearchableSelect value={String(fiscalYearId)}
                  onValueChange={handleFiscalYearChange}
                  options={(fiscalYears || []).map((fy: any) => ({ label: fy.name, value: fy.id }))}
                  placeholder="Fiscal year" searchPlaceholder="Search fiscal year..." disabled={mutation.isPending} className="h-9 text-sm" />
              )}
            </div>

            <div className="p-2 border-b">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Due</div>
                <div className={cn('text-2xl font-bold tracking-tight transition-colors', totalAmount > 0 ? 'text-foreground' : 'text-muted-foreground')}>{totalAmount.toLocaleString()}</div>
              </div>
            </div>

            <div className="p-2 border-b">
              <Label htmlFor="custom-amount" className="text-xs text-muted-foreground uppercase tracking-wider">Amount Collecting</Label>
              <Input id="custom-amount" type="number" min="0" step="1" value={paidAmount || ''} readOnly
                className="h-9 text-base font-bold text-center mt-0.5 bg-transparent" placeholder="0" />
              <FormError message={formErrors['paid_amount']} />
            </div>

            {/* ── Credit Note Adjustment ── */}
            <div className="p-2 border-b">
              <div className="flex items-center justify-between">
                <Label htmlFor="credit-amount" className="text-xs text-muted-foreground uppercase tracking-wider">Credit Note</Label>
                {!editing && availableCredit > 0 && totalAmount > 0 && (
                  <button type="button" disabled={mutation.isPending}
                    onClick={() => setCreditAmount(Math.min(availableCredit, totalAmount))}
                    className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  >Apply All</button>
                )}
              </div>
              {availableCredit > 0 ? (
                <>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Available: ₹{availableCredit.toLocaleString()}
                  </div>
                  {editing ? (
                    <div className="mt-1 text-sm font-semibold text-purple-600 dark:text-purple-400">
                      ₹{effectiveCredit.toLocaleString()} applied
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Input id="credit-amount" type="number" min="0" max={Math.min(availableCredit, totalAmount)} step="1"
                        value={creditAmount || ''}
                        onChange={e => setCreditAmount(Math.min(Math.max(0, Number(e.target.value) || 0), availableCredit))}
                        disabled={mutation.isPending}
                        className="h-9 text-sm text-center" placeholder="0" />
                      <Button variant="ghost" size="sm" className="h-9 shrink-0 text-xs"
                        disabled={mutation.isPending || creditAmount === 0}
                        onClick={() => setCreditAmount(0)}
                      >Clear</Button>
                    </div>
                  )}
                  {!editing && effectiveCredit > 0 && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Cash to collect: <span className="font-semibold text-foreground">₹{paidAmount.toLocaleString()}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[11px] text-muted-foreground mt-0.5">No available credit for this rider.</div>
              )}
            </div>

            <div className="p-2 border-b space-y-1.5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Payment Mode</div>
              <div className="grid grid-cols-3 gap-1">
                {[{ value: 'cash', label: 'Cash', icon: Banknote }, { value: 'online', label: 'Online', icon: QrCode }, { value: 'bank_transfer', label: 'Transfer', icon: CreditCard }, { value: 'cheque', label: 'Cheque', icon: FileText }, { value: 'card', label: 'Card', icon: CreditCard }].map(pm => (
                  <Button key={pm.value} variant={paymentMode === pm.value ? 'default' : 'outline'} size="sm"
                    onClick={() => handleQuickPay(pm.value)} disabled={mutation.isPending} className="gap-1 text-xs"
                  ><pm.icon className="h-3.5 w-3.5" />{pm.label}</Button>
                ))}
              </div>

              {/* ── Payment mode details fields ── */}
              {currentPaymentFields.length > 0 && (
                <div className="mt-1.5 space-y-1.5 pt-1.5 border-t border-dashed border-border/50 animate-in slide-in-from-top-1 duration-150">
                  {currentPaymentFields.map(field => (
                    <div key={field.key} className="flex items-center gap-1.5">
                      <field.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input
                        id={`pm-${field.key}`}
                        type={field.type || 'text'}
                        value={paymentDetails[field.key] || ''}
                        onChange={e => setPaymentDetails(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        disabled={mutation.isPending}
                        className="h-7 text-[11px] flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-2 space-y-1.5 border-t shrink-0 shadow-[0_-4px_6px_-4px_hsl(var(--shadow-color)/0.06)]">
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-semibold">{totalAmount.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Paid</span><span className="font-semibold text-green-600 dark:text-green-400">{paidAmount.toLocaleString()}</span></div>
              {effectiveCredit > 0 && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Credit</span><span className="font-semibold text-purple-600 dark:text-purple-400">-{effectiveCredit.toLocaleString()}</span></div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-bold"><span>Balance</span><span className={cn(balanceAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>{balanceAmount.toLocaleString()}</span></div>
            </div>

            <div className="relative">
              <Input id="fee-note" value={note} onChange={e => { if (e.target.value.length <= 200) setNote(e.target.value) }}
                placeholder="Note (optional)..." disabled={mutation.isPending} className="h-9 text-sm pr-10" aria-label="Fee note" maxLength={200} />
              <span className={cn('absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums', note.length > 180 ? 'text-orange-500 dark:text-orange-400 font-semibold' : 'text-muted-foreground')}>{note.length}/200</span>
            </div>

            {showSuccess ? (
              <>
                <div className="text-center text-sm font-semibold text-green-600 dark:text-green-400 animate-in fade-in pb-2">
                  <CheckCircle2 className="h-5 w-5 inline mr-1.5" />Payment Recorded!
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 h-11 text-sm gap-1.5"
                    onClick={() => navigate({ to: '/fees/new' })}>New Collection</Button>
                  <Button type="button" className="flex-1 h-11 text-sm gap-1.5"
                    onClick={() => { if (lastReceipt) { const fyYear = selectedFy?.startDate ? new Date(selectedFy.startDate).getFullYear() : ''; setPrintPreviewHtml(buildReceiptHtml({ feeNo: lastReceipt.feeNo, date: formatReceiptDate(lastReceipt.feeDate || feeDate), riderName: activeRider?.name, riderStd: activeRider?.standard, riderSection: activeRider?.section, riderRollNo: activeRider?.rollNo, riderCode: activeRider?.code, riderSchoolName: activeRider?.school?.name, riderSchoolTime: activeRider?.schoolTime, items: feeItems.map(i => ({ name: i.fee_head_name, months: i.months.map(m => { const month = months?.find((mo: any) => mo.id === m.month_id); return { num: month?.number || 0, label: (() => { const name = month?.shortName || month?.name || ''; return name && fyYear ? `${name} ${String(fyYear).slice(-2)}` : name; })() }; }).filter((m: any) => m.label).sort((a: any, b: any) => a.num - b.num).map((m: any) => m.label).join(', '), qty: i.quantity, amount: i.amount, total: i.total_amount })), totalAmount, paidAmount, balanceAmount, creditAmount: effectiveCredit, paymentMode, note, paymentDetails, orgName: orgData?.name, orgAddress: orgData?.address ? [orgData.address.addressLine1, orgData.address.addressLine2, orgData.address.city, orgData.address.state, orgData.address.pincode, orgData.address.country].filter(Boolean).join(', ') : undefined })); setPrintPreviewOpen(true) } }}
                  ><Printer className="h-4 w-4" />Print Receipt</Button>
                </div>
              </>
            ) : (
              <>
                <Button type="button" className={cn('w-full h-12 text-base font-semibold gap-2 transition-all', mutation.isPending && 'animate-pulse', isCancellation && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground')}
                  disabled={mutation.isPending || (paidAmount === 0 && effectiveCredit === 0 && !isCancellation)} onClick={() => isCancellation ? setCancelDialogOpen(true) : handleFeeSubmit()}
                >{mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : isCancellation ? <><XCircle className="h-4 w-4" /> Cancel Voucher</> : <><Wallet className="h-4 w-4" /> {editing ? 'Update Fee' : `Charge ${totalAmount.toLocaleString()}`}</>}</Button>
                {mutation.isPending && <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden"><div className="h-full w-1/3 bg-primary rounded-full animate-pulse" style={{ animationDuration: '1.2s' }} /></div>}
              </>
            )}
          </div>
        </div>
      </div>

      <CancelVoucherDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        fee={editing}
        loading={mutation.isPending}
        onConfirm={(createCreditNote) => { cancelCreditNoteRef.current = createCreditNote; setCancelDialogOpen(false); handleFeeSubmit() }}
      />

      <PrintPreviewDialog
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
        html={printPreviewHtml}
      />
    </div>
  )
}
