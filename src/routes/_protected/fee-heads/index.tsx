/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { FeeHeadSchema } from '@/features/fee-heads/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/fee-heads/')({ component: FeeHeadsPage })
const columns: ColumnDef<any>[] = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Code', accessorKey: 'code' },
  { header: 'Income Group', id: 'income_group', cell: ({ row }) => row.original.income_group?.name || '—' },
]
const fields: Field[] = [
  { key: 'name', label: 'Name', icon: '📋' },
  { key: 'code', label: 'Code', icon: '🔖' },
  { key: 'income_group_id', label: 'Income Group', icon: '💰', relation: { endpoint: 'income_groups', labelKey: 'name' } },
]
function FeeHeadsPage() { return <ResourcePage title="Fee Heads" endpoint="fee_heads" queryKey="fee_heads" fields={fields} columns={columns} schema={FeeHeadSchema} filterableColumns={['code']} /> }
