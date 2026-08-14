/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { OrganizationSchema } from '@/features/organizations/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/organizations/')({ component: OrganizationsPage })
const columns: ColumnDef<any>[] = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Code', accessorKey: 'code' },
  { header: 'Contact', accessorKey: 'contactNo' },
  { header: 'Email', accessorKey: 'email' },
]
const fields: Field[] = [{ key: 'name', label: 'Name', icon: '🏢' }, { key: 'code', label: 'Code', icon: '🔖' }, { key: 'contactNo', label: 'Contact No', icon: '📞' }, { key: 'email', label: 'Email', icon: '✉️' }, { key: 'address', label: 'Address', icon: '📍' }, { key: 'website', label: 'Website', icon: '🌐' }]
function OrganizationsPage() { return <ResourcePage title="Organizations" endpoint="organizations" queryKey="organizations" fields={fields} columns={columns} schema={OrganizationSchema} filterableColumns={['code', 'contactNo']} /> }
