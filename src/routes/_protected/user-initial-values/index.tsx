/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { UserInitialValueSchema } from '@/features/user-initial-values/schemas'
import { type ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_protected/user-initial-values/')({
  component: UserInitialValuesPage,
})

const columns: ColumnDef<any>[] = [
  { header: 'Key', accessorKey: 'key' },
  { header: 'Value', accessorKey: 'value' },
  { header: 'User', accessorKey: 'user.name' },
]

const fields: Field[] = [
  { key: 'user_id', label: 'User', icon: '👤', relation: { endpoint: 'users', labelKey: 'name' } },
  { key: 'key', label: 'Key', icon: '🔑' },
  { key: 'value', label: 'Value', icon: '📝' },
]

function UserInitialValuesPage() {
  return (
    <ResourcePage
      title="User Initial Values"
      endpoint="user_initial_values"
      queryKey="user_initial_values"
      fields={fields}
      columns={columns}
      schema={UserInitialValueSchema}
      filterableColumns={['key']}
    />
  )
}
