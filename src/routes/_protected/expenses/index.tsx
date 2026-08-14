/* oxlint-disable react/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { type FilterableColumnConfig } from '@/components/data-table'
import { ExpenseSchema } from '@/features/expenses/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/expenses/')({ component: ExpensesPage })
const PAYMENT_STATUS_STYLES: Record<string, { label: string; color: string }> = {
  cash: { label: 'Cash', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  bank_transfer: { label: 'Bank Transfer', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  cheque: { label: 'Cheque', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  card: { label: 'Card', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  online: { label: 'Online', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
}

const EXPENSE_STATUS_STYLES: Record<string, { label: string; color: string }> = {
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
}

const columns: ColumnDef<any>[] = [
  { header: 'Expense No', accessorKey: 'expenseNo', cell: ({ getValue }) => (getValue<string>() || '—') },
  { header: 'Date', accessorKey: 'expenseDate', cell: ({ getValue }) => { const v = getValue<string>(); return v ? v.slice(0, 10) : '—' } },
  { header: 'Total Amount', accessorKey: 'totalAmount', cell: ({ row }) => `₹${Number(row.original.totalAmount || 0).toLocaleString()}` },
  {
    header: 'Payment',
    id: 'payment',
    cell: ({ row }) => {
      const mode = row.original.paymentMode
      const ps = row.original.paymentStatus
      const modeStyle = mode ? (PAYMENT_STATUS_STYLES[mode.toLowerCase()] || { label: mode.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }) : null
      const psStyle = ps === 'completed' ? { dot: 'bg-green-500', label: 'Completed' } : ps === 'pending' ? { dot: 'bg-amber-500', label: 'Pending' } : null
      return (
        <div className="flex items-center gap-2">
          {mode && modeStyle ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${modeStyle.color}`}>
              {modeStyle.label}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
          {psStyle && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${psStyle.dot}`} />
              {psStyle.label}
            </span>
          )}
        </div>
      )
    },
  },
  {
    header: 'Status',
    accessorKey: 'status',
    cell: ({ getValue }) => {
      const v = getValue<string>()
      if (!v) return <span className="text-muted-foreground text-sm">—</span>
      const style = EXPENSE_STATUS_STYLES[v.toLowerCase()] || { label: v, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.color}`}>
          {style.label}
        </span>
      )
    },
  },
  { header: 'Fiscal Year', accessorKey: 'fiscalYear', cell: ({ row }) => row.original.fiscalYear?.name || '—' },
  { header: 'Note', accessorKey: 'note', cell: ({ getValue }) => { const v = getValue<string>(); return v ? (v.length > 30 ? v.slice(0, 30) + '...' : v) : '-' } },
]
const fields: Field[] = [
  { key: 'expenseNo', label: 'Expense No', icon: '🧾' },
  { key: 'totalAmount', label: 'Total Amount', type: 'number', icon: '💰' },
  { key: 'paymentMode', label: 'Payment Mode', icon: '💳', type: 'select', options: [{ label: 'Cash', value: 'cash' }, { label: 'Bank Transfer', value: 'bank_transfer' }, { label: 'Cheque', value: 'cheque' }, { label: 'Card', value: 'card' }, { label: 'Online', value: 'online' }] },
  { key: 'fiscalYearId', label: 'Fiscal Year', icon: '📅', relation: { endpoint: 'fiscal_years', labelKey: 'name' } },
  { key: 'note', label: 'Note', icon: '📝' },
]
function ExpensesPage() {
  const navigate = useNavigate()
  return (
    <ResourcePage
      title="Expenses"
      endpoint="expenses"
      queryKey="expenses"
      fields={fields}
      columns={columns}
      searchKey="expenseNo"
      schema={ExpenseSchema}
      filterableColumns={[
        { id: 'paymentMode', type: 'select', options: [
          { label: 'Cash', value: 'cash' },
          { label: 'Bank Transfer', value: 'bank_transfer' },
          { label: 'Cheque', value: 'cheque' },
          { label: 'Card', value: 'card' },
          { label: 'Online', value: 'online' },
        ] },
        { id: 'status', type: 'select', options: [
          { label: 'Paid', value: 'paid' },
          { label: 'Pending', value: 'pending' },
          { label: 'Cancelled', value: 'cancelled' },
        ] },
      ] as FilterableColumnConfig[]}
      inlineForm={false}
      onAddNew={() => navigate({ to: '/expenses/new' })}
      onEditItem={(id) => navigate({ to: '/expenses/$expenseId/edit', params: { expenseId: String(id) } })}
    />
  )
}
