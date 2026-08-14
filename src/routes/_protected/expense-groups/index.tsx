/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { ExpenseGroupSchema } from '@/features/expense-groups/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/expense-groups/')({ component: ExpenseGroupsPage })
const columns: ColumnDef<any>[] = [{ header: 'Name', accessorKey: 'name' }, { header: 'Code', accessorKey: 'code' }, { header: 'Description', accessorKey: 'description' }]
const fields: Field[] = [{ key: 'name', label: 'Name', icon: '📂' }, { key: 'code', label: 'Code', icon: '🔖' }, { key: 'description', label: 'Description', icon: '📝' }]
function ExpenseGroupsPage() { return <ResourcePage title="Expense Groups" endpoint="expense_groups" queryKey="expense_groups" fields={fields} columns={columns} schema={ExpenseGroupSchema} filterableColumns={['code']} /> }
