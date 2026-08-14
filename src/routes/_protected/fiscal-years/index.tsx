/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { FiscalYearSchema } from '@/features/fiscal-years/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/fiscal-years/')({ component: FiscalYearsPage })
const columns: ColumnDef<any>[] = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Start Date', accessorKey: 'startDate', cell: ({ getValue }) => (getValue<string>() || '').slice(0, 10) },
  { header: 'End Date', accessorKey: 'endDate', cell: ({ getValue }) => (getValue<string>() || '').slice(0, 10) },
  { header: 'Current', accessorKey: 'isCurrent', cell: ({ row }) => row.original.isCurrent ? '⭐ Yes' : '—' },
  { header: 'Active', accessorKey: 'isActive', cell: ({ row }) => row.original.isActive ? '✅ Yes' : '❌ No' },
]
const fields: Field[] = [
  { key: 'name', label: 'Name', icon: '📅' },
  { key: 'startDate', label: 'Start Date', type: 'date', icon: '📅' },
  { key: 'endDate', label: 'End Date', type: 'date', icon: '📅' },
  { key: 'isCurrent', label: 'Current FY', icon: '⭐', type: 'select', options: [{ label: 'Yes', value: 1 }, { label: 'No', value: 0 }] },
  { key: 'isActive', label: 'Active', icon: '✅', type: 'select', options: [{ label: 'Yes', value: 1 }, { label: 'No', value: 0 }] },
  { key: 'previousFiscalYearId', label: 'Previous FY', icon: '⬅️', relation: { endpoint: 'fiscal_years', labelKey: 'name' } },
  { key: 'nextFiscalYearId', label: 'Next FY', icon: '➡️', relation: { endpoint: 'fiscal_years', labelKey: 'name' } },
]
function FiscalYearsPage() { return <ResourcePage title="Fiscal Years" endpoint="fiscal_years" queryKey="fiscal_years" fields={fields} columns={columns} schema={FiscalYearSchema} filterableColumns={['startDate', 'endDate']} /> }
