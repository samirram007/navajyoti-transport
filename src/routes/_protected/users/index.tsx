/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { type FilterableColumnConfig } from '@/components/data-table'
import { UserSchema } from '@/features/users/schemas'
import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_protected/users/')({
  component: UsersPage,
})

const USER_TYPE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  staff: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  driver: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
}

const USER_TYPE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  driver: 'Driver',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
}

const columns: ColumnDef<any>[] = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Username', accessorKey: 'username' },
  { header: 'Email', accessorKey: 'email' },
  { header: 'Contact', accessorKey: 'contactNo' },
  {
    header: 'Type',
    accessorKey: 'userType',
    cell: ({ row }) => {
      const val: string = row.getValue('userType')
      const style = USER_TYPE_STYLES[val] || 'bg-muted text-muted-foreground border-border'
      const label = USER_TYPE_LABELS[val] || val
      if (!val) return <span className="text-xs text-muted-foreground/50">—</span>
      return (
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
          style,
        )}>
          {label}
        </span>
      )
    },
  },
  {
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => {
      const val: string = row.getValue('status')
      const style = STATUS_STYLES[val] || 'bg-muted text-muted-foreground border-border'
      if (!val) return <span className="text-xs text-muted-foreground/50">—</span>
      return (
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize',
          style,
        )}>
          {val}
        </span>
      )
    },
  },
]

const fields: Field[] = [
  { key: 'name', label: 'Name', icon: '👤' },
  { key: 'username', label: 'Username', icon: '@' },
  { key: 'email', label: 'Email', icon: '✉️' },
  { key: 'password', label: 'Password', type: 'password', icon: '🔒' },
  { key: 'contactNo', label: 'Contact No', icon: '📞' },
  { key: 'userType', label: 'User Type', icon: '👔', type: 'select', options: [{ label: 'Admin', value: 'admin' }, { label: 'Manager', value: 'manager' }, { label: 'Staff', value: 'staff' }, { label: 'Driver', value: 'driver' }] },
  { key: 'status', label: 'Status', icon: '🟢', type: 'select', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Suspended', value: 'suspended' }] },
]

function UsersPage() {
  return <ResourcePage title="Users" endpoint="users" queryKey="users" fields={fields} columns={columns} schema={UserSchema} filterableColumns={[
    'username',
    'email',
    { id: 'userType', type: 'select', options: [
      { label: 'Admin', value: 'admin' },
      { label: 'Manager', value: 'manager' },
      { label: 'Staff', value: 'staff' },
      { label: 'Driver', value: 'driver' },
    ] },
    { id: 'status', type: 'select', options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Suspended', value: 'suspended' },
    ] },
  ] as FilterableColumnConfig[]} />
}
