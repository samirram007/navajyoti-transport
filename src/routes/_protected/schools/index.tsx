/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { SchoolSchema } from '@/features/schools/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/schools/')({ component: SchoolsPage })
const columns: ColumnDef<any>[] = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Code', accessorKey: 'code' },
  { header: 'Contact', accessorKey: 'contactNo' },
  { header: 'Email', accessorKey: 'email' },
  { header: 'Website', accessorKey: 'website' },
]
const fields: Field[] = [
  { key: 'name', label: 'Name', icon: '🏫' },
  { key: 'code', label: 'Code', icon: '🔖' },
  { key: 'address', label: 'Address', icon: '📍' },
  { key: 'contactNo', label: 'Contact No', icon: '📞' },
  { key: 'email', label: 'Email', icon: '✉️' },
  { key: 'website', label: 'Website', icon: '🌐' },
  { key: 'organizationId', label: 'Organization', icon: '🏢', relation: { endpoint: 'organizations', labelKey: 'name' } },
]
function SchoolsPage() { return <ResourcePage title="Schools" endpoint="schools" queryKey="schools" fields={fields} columns={columns} schema={SchoolSchema} filterableColumns={['code', 'contactNo', 'email']} /> }
