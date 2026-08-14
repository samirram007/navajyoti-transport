import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { FormError } from '@/components/ui/form-error'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  X, Calendar, Receipt,
  FileText, Loader2, CreditCard, Banknote, QrCode, Printer, Building2, Hash, User, Landmark,
  ShoppingCart, ChevronDown, ChevronRight, CheckCircle2, Plus, AlertCircle, Layers, Clock,
} from 'lucide-react'
import {
  createExpenseApi, updateExpenseApi, getExpenseGroupsApi, getExpenseHeadsApi, getFiscalYearsApi, generateNo,
} from '@/features/expenses/services'
import { ExpenseSchema } from '@/features/expenses/schemas'
import { cn } from '@/lib/utils'
import { useAutoSelectFiscalYear } from '@/hooks/use-auto-select-fiscal-year'
import { useAutoSelectPaymentMode } from '@/hooks/use-auto-select-payment-mode'

function printVoucher(data: {
  expenseNo?: string
  voucherNo?: string
  date: string
  status: string
  items: { name?: string; groupName?: string; description?: string; qty: number; amount: number; total: number }[]
  totalAmount: number
  paymentMode: string
  paymentDetails?: Record<string, string>
  note?: string
}) {
  // Build payment details HTML
  const paymentDetailsHtml = data.paymentDetails && Object.keys(data.paymentDetails).length > 0
    ? Object.entries(data.paymentDetails)
        .filter(([, v]) => v)
        .map(([k, v]) => `<span>${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: ${v}</span>`)
        .join(' &nbsp;|&nbsp; ')
    : ''

  const voucherHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Voucher</title>
<style>
  @page{margin:0;size:80mm auto}body{font-family:'Courier New',monospace;font-size:12px;margin:0;padding:10px;color:#222}
  .voucher{max-width:72mm;margin:0 auto}.center{text-align:center}
  .header{border-bottom:2px solid #222;padding-bottom:8px;margin-bottom:8px}
  .header h2{margin:0;font-size:16px;letter-spacing:1px}.header p{margin:2px 0;font-size:10px;color:#555}
  .meta{display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px}
  .items{width:100%;border-collapse:collapse;margin-bottom:6px}
  .items th{border-bottom:1px dashed #222;padding:4px 2px;font-size:10px;text-align:left}
  .items th:last-child,.items td:last-child{text-align:right}
  .items td{padding:3px 2px;font-size:11px}
  .total-row td{border-top:2px solid #222;padding-top:4px;font-weight:bold;font-size:13px}
  .amount{text-align:right}
  .footer{border-top:1px dashed #222;padding-top:6px;margin-top:6px;font-size:10px;text-align:center;color:#555}
  .note{font-size:10px;color:#555;margin-top:4px;font-style:italic}
  hr{border:none;border-top:1px dashed #222;margin:6px 0}
  .status-paid{color:#16a34a;font-weight:bold}.status-pending{color:#ca8a04;font-weight:bold}.status-cancelled{color:#dc2626;font-weight:bold}
  .payment{border-top:1px dashed #222;padding-top:4px;margin-top:4px;font-size:10px}
  .payment-details{font-size:10px;color:#555;margin-top:2px}
</style></head><body>
<div class="voucher"><div class="header center"><h2>GoSchool</h2><p>Transport Management • Expense Voucher</p></div>
<div class="meta"><span><strong>Expense:</strong> ${data.expenseNo || '---'}</span><span><strong>Date:</strong> ${data.date}</span></div>
<div class="meta"><span><strong>Voucher:</strong> ${data.voucherNo || '---'}</span><span class="status-${data.status}">${data.status.toUpperCase()}</span></div>
<hr><table class="items"><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
${data.items.map(i => `<tr><td>${i.description || i.name || 'Item'}${i.groupName ? '<br><span style="font-size:9px;color:#888">' + i.groupName + '</span>' : ''}</td><td>${i.qty}</td><td>${i.amount.toLocaleString()}</td><td>${i.total.toLocaleString()}</td></tr>`).join('')}
<tr class="total-row"><td colspan="3">Total Amount</td><td>${data.totalAmount.toLocaleString()}</td></tr>
</table>
<div class="payment center"><strong>Payment Mode:</strong> ${data.paymentMode.replace(/_/g, ' ').toUpperCase()}</div>
${paymentDetailsHtml ? `<div class="payment-details center">${paymentDetailsHtml}</div>` : ''}
${data.note ? `<div class="note">Note: ${data.note}</div>` : ''}
<div class="footer">Generated on ${new Date().toLocaleString()} • GoSchool ERP</div>
</div>
<script>window.onload=function(){window.print();window.close()}</script>
</body></html>`
  const win = window.open('', '_blank', 'width=400,height=600,menubar=no,toolbar=no,location=no')
  if (win) {
    win.document.write(voucherHTML)
    win.document.close()
  } else {
    toast.error('Please allow popups to print the voucher')
  }
}

interface ExpenseItemRow {
  tempId: number
  expense_group_id: number | ''
  expense_group_name?: string
  expense_head_id: number | ''
  expense_head_name?: string
  description: string
  quantity: number
  amount: number
  total_amount: number
}

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

export function ExpensesPosPage({ editExpense }: { editExpense?: any }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ── Form State ──
  const [expenseNo, setExpenseNo] = useState(() => generateNo('EXP'))
  const [voucherNo, setVoucherNo] = useState(() => generateNo('VCH'))
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [fiscalYearId, setFiscalYearId] = useState<number | ''>('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('paid')
  const [note, setNote] = useState('')
  const [expenseItems, setExpenseItems] = useState<ExpenseItemRow[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const editing = editExpense || null
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastCreated, setLastCreated] = useState<any>(null)
  const printTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null)

  // ── Cleanup print timer on unmount ──
  useEffect(() => {
    return () => { if (printTimerRef.current) clearTimeout(printTimerRef.current) }
  }, [])

  // ── Initialize form from editExpense ──
  useEffect(() => {
    if (!editExpense) return
    setExpenseNo(editExpense.expenseNo || editExpense.expense_no || '')
    setVoucherNo(editExpense.voucherNo || editExpense.voucher_no || '')
    setExpenseDate(editExpense.expenseDate?.slice(0, 10) || editExpense.expense_date?.slice(0, 10) || new Date().toISOString().slice(0, 10))
    setFiscalYearId(editExpense.fiscalYearId || editExpense.fiscal_year_id || '')
    setPaymentMode(editExpense.paymentMode || editExpense.payment_mode || 'cash')
    setPaymentDetails(editExpense.paymentDetails || editExpense.payment_details || {})
    setStatus(editExpense.status || 'paid')
    setNote(editExpense.note || '')
    const items = editExpense.expenseItems || editExpense.expense_items || []
    if (items.length > 0) {
      setExpenseItems(items.map((item: any) => ({
        tempId: item.id || Date.now() + Math.random(),
        expense_group_id: item.expenseGroupId || item.expense_group_id || '',
        expense_group_name: item.expenseGroup?.name || item.expense_group?.name || '',
        expense_head_id: item.expenseHeadId || item.expense_head_id || '',
        expense_head_name: item.expenseHead?.name || item.expense_head?.name || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        amount: Number(item.amount) || 0,
        total_amount: Number(item.totalAmount) || Number(item.total_amount) || 0,
      })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Data Fetching ──
  const { data: expenseGroups, isLoading: groupsLoading, isError: groupsError } = useQuery({
    queryKey: ['expense_groups', 'pos'],
    queryFn: getExpenseGroupsApi,
  })

  const { data: expenseHeads, isLoading: headsLoading, isError: headsError } = useQuery({
    queryKey: ['expense_heads', 'pos'],
    queryFn: getExpenseHeadsApi,
  })

  const { data: fiscalYears, isLoading: fiscalYearsLoading, isError: fiscalYearsError } = useQuery({
    queryKey: ['fiscal_years', 'pos'],
    queryFn: getFiscalYearsApi,
  })

  // ── Auto-select fiscal year ──
  useAutoSelectFiscalYear(
    (num) => setFiscalYearId(num),
    fiscalYearId,
    !editing,
    () => toast.success('Default fiscal year applied from your preferences'),
  )

  // ── Auto-select payment mode ──
  useAutoSelectPaymentMode(
    (val) => setPaymentMode(val),
    undefined,
    !editing,
  )

  // ── Computed ──
  const totalFromItems = expenseItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
  const currentPaymentFields = PAYMENT_MODE_FIELDS[paymentMode] || []

  const getHeadsForGroup = (groupId: number | '') => {
    if (!expenseHeads) return []
    if (!groupId) return expenseHeads
    return expenseHeads.filter((h: any) => h.expenseGroupId === groupId || h.expense_group_id === groupId)
  }

  // ── Item Operations ──
  const addItem = (preset?: { expense_group_id?: number; expense_group_name?: string; expense_head_id: number; expense_head_name: string; amount?: number }) => {
    if (preset) {
      setExpenseItems(prev => {
        const exists = prev.some(item => item.expense_head_id === preset.expense_head_id && item.expense_group_id === (preset.expense_group_id || ''))
        if (exists) {
          toast.info(`${preset.expense_head_name} is already in the cart`)
          return prev
        }
        return [...prev, {
          tempId: Date.now() + Math.random(),
          expense_group_id: preset.expense_group_id || '',
          expense_group_name: preset.expense_group_name || '',
          expense_head_id: preset.expense_head_id,
          expense_head_name: preset.expense_head_name,
          description: '',
          quantity: 1,
          amount: preset.amount || 0,
          total_amount: preset.amount || 0,
        }]
      })
    } else {
      setExpenseItems(prev => [...prev, {
        tempId: Date.now() + Math.random(),
        expense_group_id: '',
        expense_group_name: '',
        expense_head_id: '',
        expense_head_name: '',
        description: '',
        quantity: 1,
        amount: 0,
        total_amount: 0,
      }])
    }
    setFormErrors(prev => ({ ...prev, expense_items: '' }))
  }

  const updateItem = (tempId: number, field: string, value: any) => {
    setExpenseItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'amount') {
        updated.total_amount = (updated.quantity || 0) * (updated.amount || 0)
      }
      if (field === 'expense_group_id') {
        updated.expense_head_id = ''
        updated.expense_head_name = ''
        const group = expenseGroups?.find((g: any) => g.id === value)
        updated.expense_group_name = group?.name || ''
      }
      if (field === 'expense_head_id') {
        const head = expenseHeads?.find((h: any) => h.id === value)
        updated.expense_head_name = head?.name || ''
      }
      return updated
    }))
  }

  const removeItem = (tempId: number) => {
    setExpenseItems(prev => prev.filter(item => item.tempId !== tempId))
  }

  // ── Grouped heads for quick add ──
  const groupHeadsMap = (expenseGroups || []).map((group: any) => ({
    ...group,
    heads: getHeadsForGroup(group.id),
  })).filter((g: any) => g.heads.length > 0)

  // ── Build camelCase payload for API ──
  const buildExpensePayload = () => ({
    expenseNo,
    voucherNo,
    expenseDate,
    fiscalYearId: fiscalYearId || undefined,
    paymentMode: paymentMode || undefined,
    status: status || undefined,
    note: note || undefined,
    totalAmount: totalFromItems,
    paymentDetails: Object.keys(paymentDetails).length > 0 ? paymentDetails : undefined,
    expenseItems: expenseItems.map(item => ({
      expenseGroupId: item.expense_group_id || undefined,
      expenseHeadId: item.expense_head_id || undefined,
      description: item.description || undefined,
      quantity: item.quantity,
      amount: item.amount,
      totalAmount: item.total_amount,
    })),
  })

  // ── Submit ──
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = buildExpensePayload()
      if (editing) return (await updateExpenseApi(editing.id, payload)).data?.data
      return (await createExpenseApi(payload)).data?.data
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success(editing ? 'Expense updated successfully' : 'Expense created successfully')
      if (!created) return
      setLastCreated(created)
      setShowSuccess(true)
      printTimerRef.current = setTimeout(() => {
        printVoucher({
          expenseNo: created.expenseNo || created.expense_no,
          voucherNo: created.voucherNo || created.voucher_no,
          date: created.expenseDate?.slice(0, 10) || created.expense_date?.slice(0, 10) || expenseDate,
          status: created.status || status,
          items: expenseItems.map(i => ({
            name: i.expense_head_name,
            groupName: i.expense_group_name,
            description: i.description,
            qty: i.quantity,
            amount: i.amount,
            total: i.total_amount,
          })),
          totalAmount: totalFromItems,
          paymentMode,
          paymentDetails,
          note,
        })
      }, 500)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save expense'),
  })

  const handleSubmit = () => {
    setFormErrors({})

    // Build snake_case object for Zod schema validation
    const validationPayload = {
      expense_no: expenseNo,
      voucher_no: voucherNo,
      expense_date: expenseDate,
      fiscal_year_id: fiscalYearId || undefined,
      payment_mode: paymentMode,
      status: status,
      note: note || undefined,
      total_amount: totalFromItems,
      expense_items: expenseItems,
    }

    // Validate items
    const validItems = expenseItems.filter(item => (item.amount || 0) > 0)
    if (expenseItems.length === 0) {
      setFormErrors(prev => ({ ...prev, expense_items: 'At least one expense item is required' }))
      toast.error('Please add at least one expense item')
      return
    }
    if (validItems.length === 0) {
      setFormErrors(prev => ({ ...prev, expense_items: 'At least one item must have an amount greater than 0' }))
      toast.error('Please set an amount for at least one expense item')
      return
    }

    // Zod validation
    const result = ExpenseSchema.safeParse(validationPayload)
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

  const handleQuickPay = (mode: string) => {
    if (mode === paymentMode) return // Don't clear details if same mode is clicked
    setPaymentMode(mode)
    setPaymentDetails({})
  }

  const updatePaymentDetail = (key: string, value: string) => {
    setPaymentDetails(prev => ({ ...prev, [key]: value }))
  }

  const goBack = () => { navigate({ to: '/expenses' }) }

  // ── Render ──
  return (
    <div className="h-full flex flex-col bg-background">
      {/* POS Header */}
      <header className="h-12 border-b bg-card shadow-elevation-1 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={goBack}>
            <ChevronRight className="h-3 w-3 rotate-180" /> Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <Receipt className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{editing ? 'Edit Expense' : 'New Expense'}</span>
          {editing && <span className="text-[10px] text-muted-foreground">#{editing?.expenseNo || editing?.expense_no || ''}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </header>

      {/* POS Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===== LEFT PANEL ===== */}
        <div className="flex-1 flex flex-col overflow-hidden border-r">
          {/* Quick Add: Expense Groups & Heads */}
          <div className="p-4 border-b bg-card shrink-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Add Ledger
              </label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => addItem()}>
                <Plus className="h-3 w-3" /> Custom Item
              </Button>
            </div>

            {groupsLoading || headsLoading ? (
              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading expense groups...
              </div>
            ) : groupsError ? (
              <div className="flex items-center gap-2 py-3 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> Failed to load groups
              </div>
            ) : headsError ? (
              <div className="flex items-center gap-2 py-3 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> Failed to load expense heads
              </div>
            ) : (
              <div className="space-y-1">
                {groupHeadsMap.map((group: any) => (
                  <div key={group.id} className="rounded-lg border bg-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors',
                        'hover:bg-accent/50',
                        expandedGroupId === group.id && 'bg-accent/30 border-b',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{group.name}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{group.heads.length}</span>
                      </div>
                      <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', expandedGroupId === group.id && 'rotate-180')} />
                    </button>

                    {expandedGroupId === group.id && (
                      <div className="p-2 bg-muted/10 animate-in slide-in-from-top-1 duration-100">
                        <div className="flex flex-wrap gap-1.5">
                          {group.heads.map((head: any) => {
                            const isInCart = expenseItems.some(item => item.expense_head_id === head.id)
                            return (
                              <button
                                key={head.id}
                                type="button"
                                disabled={mutation.isPending}
                                onClick={() => addItem({
                                  expense_group_id: group.id,
                                  expense_group_name: group.name,
                                  expense_head_id: head.id,
                                  expense_head_name: head.name,
                                })}
                                className={cn(
                                  'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
                                  isInCart
                                    ? 'bg-green-50 border-green-300 text-green-800 cursor-default dark:bg-green-950/30 dark:text-green-400 dark:border-green-700'
                                    : 'hover:bg-accent hover:border-accent-foreground/20 border-input text-muted-foreground hover:text-foreground',
                                )}
                              >
                                {isInCart ? <CheckCircle2 className="h-3 w-3 inline mr-1" /> : <Plus className="h-3 w-3 inline mr-1" />}
                                {head.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expense Items Cart */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" /> Expense Items
                  {expenseItems.length > 0 && <span className="text-xs font-normal text-muted-foreground">({expenseItems.length} items)</span>}
                </h3>
              </div>

              {expenseItems.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-xl">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>No expense items yet</p>
                  <p className="text-xs mt-1">Click a ledger head above or use "Custom Item" to add entries</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenseItems.map((item) => (
                    <div key={item.tempId} className="rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
                      <div className="p-3 space-y-2.5">
                        {/* Item header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.expense_head_name ? (
                                <span className="text-sm font-semibold">{item.expense_head_name}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Select ledger head</span>
                              )}
                              {item.expense_group_name && (
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{item.expense_group_name}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 shrink-0"
                            disabled={mutation.isPending}
                            onClick={() => removeItem(item.tempId)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Group/Head selects (for custom items without preset) */}
                        {!item.expense_head_name && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Expense Group</Label>
                              <select
                                value={String(item.expense_group_id || '')}
                                onChange={e => updateItem(item.tempId, 'expense_group_id', e.target.value ? Number(e.target.value) : '')}
                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="">Select group</option>
                                {(expenseGroups || []).map((g: any) => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Expense Head</Label>
                              <select
                                value={String(item.expense_head_id || '')}
                                onChange={e => updateItem(item.tempId, 'expense_head_id', e.target.value ? Number(e.target.value) : '')}
                                disabled={!item.expense_group_id}
                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="">{item.expense_group_id ? 'Select head' : 'Select group first'}</option>
                                {getHeadsForGroup(item.expense_group_id).map((h: any) => (
                                  <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Description (optional)</Label>
                          <Input
                            value={item.description}
                            onChange={e => updateItem(item.tempId, 'description', e.target.value)}
                            placeholder="Enter description..."
                            className="h-8 text-xs"
                            disabled={mutation.isPending}
                          />
                        </div>

                        {/* Amount & Total (qty toggled) */}
                        <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
                          {/* Qty toggle */}
                          <div className="flex flex-col justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                // Toggle: if qty is 1, set to 2 to reveal input; if > 1, reset to 1
                                updateItem(item.tempId, 'quantity', item.quantity > 1 ? 1 : 2)
                              }}
                              className={cn(
                                'h-8 px-2 rounded-md border text-[10px] font-medium transition-all flex items-center gap-1 shrink-0',
                                item.quantity > 1
                                  ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
                                  : 'bg-transparent border-input text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50',
                              )}
                              title={item.quantity > 1 ? '×' + item.quantity + ' — click to reset to 1' : 'Enable multi-unit (× qty)'}
                            >
                              <span className="tabular-nums">×{item.quantity}</span>
                            </button>
                            {item.quantity > 1 && (
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || ''}
                                onChange={e => updateItem(item.tempId, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                                className="h-6 w-full mt-0.5 rounded border border-input bg-background px-1.5 text-[10px] text-center tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={mutation.isPending}
                              />
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              {item.quantity > 1 ? 'Rate' : 'Amount'}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount || ''}
                              onChange={e => updateItem(item.tempId, 'amount', Number(e.target.value) || 0)}
                              className="h-8 text-xs font-medium"
                              disabled={mutation.isPending}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Total</Label>
                            <div className="h-8 flex items-center px-2 rounded-md border bg-muted/30 text-xs font-bold">
                              ₹{item.total_amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <FormError message={formErrors['expense_items']} />
            </div>
          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <div className="w-80 shrink-0 flex flex-col bg-card">
          <div className="flex-1 overflow-y-auto">
            {/* Expense/Voucher Numbers */}
            <div className="p-2 space-y-1.5 border-b">
              <div className="space-y-1">
                <Label htmlFor="expense-no" className="text-[10px] text-muted-foreground uppercase tracking-wider">Expense No</Label>
                <Input id="expense-no" value={expenseNo} onChange={e => setExpenseNo(e.target.value)}
                  disabled={mutation.isPending} className="h-8 text-xs" placeholder="Auto-generated" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="voucher-no" className="text-[10px] text-muted-foreground uppercase tracking-wider">Voucher No</Label>
                <Input id="voucher-no" value={voucherNo} onChange={e => setVoucherNo(e.target.value)}
                  disabled={mutation.isPending} className="h-8 text-xs" placeholder="Auto-generated" />
              </div>
            </div>

            {/* Date & Fiscal Year */}
            <div className="p-2 space-y-1.5 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                  disabled={mutation.isPending}
                  className={cn('flex-1 h-9 text-base border-0 border-b border-dotted rounded-none px-0', mutation.isPending ? 'border-muted-foreground/10 text-muted-foreground' : 'border-muted-foreground/30')}
                />
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
                  onValueChange={v => { const nv = v ? Number(v) : ''; setFiscalYearId(nv) }}
                  options={(fiscalYears || []).map((fy: any) => ({ label: fy.name, value: fy.id }))}
                  placeholder="Fiscal year" searchPlaceholder="Search fiscal year..." disabled={mutation.isPending} className="h-9 text-sm" />
              )}
              <FormError message={formErrors['fiscal_year_id']} />
            </div>

            {/* Total */}
            <div className="p-2 border-b">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Amount</div>
                <div className={cn('text-2xl font-bold tracking-tight transition-colors', totalFromItems > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                  ₹{totalFromItems.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="p-2 border-b space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</Label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'paid', label: 'Paid', icon: CheckCircle2 },
                  { value: 'pending', label: 'Pending', icon: Clock },
                  { value: 'cancelled', label: 'Cancelled', icon: X },
                ].map(st => (
                  <Button key={st.value} variant={status === st.value ? 'default' : 'outline'} size="sm"
                    onClick={() => setStatus(st.value)} disabled={mutation.isPending}
                    className={cn('gap-1 text-xs', status === st.value ? '' : 'text-muted-foreground')}
                  ><st.icon className="h-3.5 w-3.5" />{st.label}</Button>
                ))}
              </div>
            </div>

            {/* Payment Mode */}
            <div className="p-2 border-b space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Payment Mode</Label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'cash', label: 'Cash', icon: Banknote },
                  { value: 'online', label: 'Online', icon: QrCode },
                  { value: 'bank_transfer', label: 'Transfer', icon: CreditCard },
                  { value: 'cheque', label: 'Cheque', icon: FileText },
                  { value: 'card', label: 'Card', icon: CreditCard },
                ].map(pm => (
                  <Button key={pm.value} variant={paymentMode === pm.value ? 'default' : 'outline'} size="sm"
                    onClick={() => handleQuickPay(pm.value)} disabled={mutation.isPending}
                    className={cn('gap-1 text-xs', paymentMode === pm.value ? '' : 'text-muted-foreground')}
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
                        onChange={e => updatePaymentDetail(field.key, e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        disabled={mutation.isPending}
                        className="h-7 text-[11px] flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              <FormError message={formErrors['payment_mode']} />
            </div>
          </div>

          {/* Bottom: Note & Submit */}
          <div className="p-2 space-y-1.5 border-t shrink-0 shadow-[0_-4px_6px_-4px_hsl(var(--shadow-color)/0.06)]">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span className="font-semibold">{expenseItems.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>₹{totalFromItems.toLocaleString()}</span>
              </div>
            </div>

            <div className="relative">
              <Input id="expense-note" value={note} onChange={e => { if (e.target.value.length <= 200) setNote(e.target.value) }}
                placeholder="Note (optional)..." disabled={mutation.isPending} className="h-9 text-sm pr-10" maxLength={200} />
              <span className={cn('absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums', note.length > 180 ? 'text-orange-500 dark:text-orange-400 font-semibold' : 'text-muted-foreground')}>{note.length}/200</span>
            </div>

            {showSuccess ? (
              <>
                <div className="text-center text-sm font-semibold text-green-600 dark:text-green-400 animate-in fade-in pb-2">
                  <CheckCircle2 className="h-5 w-5 inline mr-1.5" />{editing ? 'Expense Updated!' : 'Expense Created!'}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button type="button" variant="outline" className="w-full h-10 text-sm gap-1.5"
                    onClick={() => navigate({ to: '/expenses/new' })}>New Expense</Button>
                  <div className="flex gap-1.5">
                    <Button type="button" variant="outline" className="flex-1 h-10 text-sm gap-1.5"
                      onClick={() => {
                        if (lastCreated) printVoucher({
                          expenseNo: lastCreated.expenseNo || lastCreated.expense_no,
                          voucherNo: lastCreated.voucherNo || lastCreated.voucher_no,
                          date: lastCreated.expenseDate?.slice(0, 10) || lastCreated.expense_date?.slice(0, 10) || expenseDate,
                          status: lastCreated.status || status,
                          items: expenseItems.map(i => ({
                            name: i.expense_head_name,
                            groupName: i.expense_group_name,
                            description: i.description,
                            qty: i.quantity,
                            amount: i.amount,
                            total: i.total_amount,
                          })),
                          totalAmount: totalFromItems,
                          paymentMode,
                          paymentDetails,
                          note,
                        })
                      }}>
                      <Printer className="h-4 w-4" />Print
                    </Button>
                    <Button type="button" className="flex-1 h-10 text-sm gap-1.5"
                      onClick={() => { if (lastCreated) navigate({ to: `/expenses/${lastCreated.id}/edit` }) }}>
                      <Receipt className="h-4 w-4" />Edit
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Button type="button" className={cn('w-full h-12 text-base font-semibold gap-2 transition-all', mutation.isPending && 'animate-pulse')}
                  disabled={mutation.isPending} onClick={handleSubmit}
                >{mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Receipt className="h-4 w-4" /> {editing ? 'Update Expense' : `Create Expense — ₹${totalFromItems.toLocaleString()}`}</>}</Button>
                {mutation.isPending && <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden"><div className="h-full w-1/3 bg-primary rounded-full animate-pulse" style={{ animationDuration: '1.2s' }} /></div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
