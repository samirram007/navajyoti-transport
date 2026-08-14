/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { IncomeGroupSchema } from '@/features/income-groups/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/income-groups/')({ component: IncomeGroupsPage })
const columns: ColumnDef<any>[] = [{ header: 'Name', accessorKey: 'name' }, { header: 'Code', accessorKey: 'code' }]
const fields: Field[] = [{ key: 'name', label: 'Name', icon: '💰' }, { key: 'code', label: 'Code', icon: '🔖' }]
function IncomeGroupsPage() { return <ResourcePage title="Income Groups" endpoint="income_groups" queryKey="income_groups" fields={fields} columns={columns} schema={IncomeGroupSchema} filterableColumns={['code']} /> }
