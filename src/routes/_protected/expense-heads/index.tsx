/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { ExpenseHeadSchema } from '@/features/expense-heads/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/expense-heads/')({ component: ExpenseHeadsPage })
const columns: ColumnDef<any>[] = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Code', accessorKey: 'code' },
  { header: 'Expense Group', id: 'expense_group', cell: ({ row }) => row.original.expense_group?.name || '—' },
]
const fields: Field[] = [
  { key: 'name', label: 'Name', icon: '📋' },
  { key: 'code', label: 'Code', icon: '🔖' },
  { key: 'expense_group_id', label: 'Expense Group', icon: '📂', relation: { endpoint: 'expense_groups', labelKey: 'name' } },
]
function ExpenseHeadsPage() { return <ResourcePage title="Expense Heads" endpoint="expense_heads" queryKey="expense_heads" fields={fields} columns={columns} schema={ExpenseHeadSchema} filterableColumns={['code', 'expense_group_id']} /> }
