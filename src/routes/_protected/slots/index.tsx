/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { type FilterableColumnConfig } from '@/components/data-table'
import { SlotSchema } from '@/features/slots/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/slots/')({ component: SlotsPage })
const columns: ColumnDef<any>[] = [{ header: 'Name', accessorKey: 'name' }, { header: 'Type', accessorKey: 'slotType' }, { header: 'Vehicle', accessorKey: 'vehicle.name' }, { header: 'Capacity', accessorKey: 'capacity' }, { header: 'Active', accessorKey: 'isActive', cell: ({ row }) => row.original.isActive ? '✅' : '❌' }]
const fields: Field[] = [
  { key: 'name', label: 'Name', icon: '🅿️' },
  { key: 'slotType', label: 'Slot Type', icon: '📋', type: 'select', options: [{ label: 'Pickup', value: 'pickup' }, { label: 'Drop', value: 'drop' }, { label: 'Both', value: 'both' }] },
  { key: 'vehicleId', label: 'Vehicle', icon: '🚌', relation: { endpoint: 'vehicles', labelKey: 'name' } },
  { key: 'capacity', label: 'Capacity', type: 'number', icon: '📦' },
  { key: 'startTime', label: 'Start Time', icon: '⏰' },
  { key: 'endTime', label: 'End Time', icon: '⏰' },
  { key: 'isActive', label: 'Active', type: 'select', options: [{ label: 'Yes', value: 1 }, { label: 'No', value: 0 }], icon: '✅' },
]
function SlotsPage() { return <ResourcePage title="Slots" endpoint="slots" queryKey="slots" fields={fields} columns={columns} schema={SlotSchema} filterableColumns={[
    { id: 'slotType', type: 'select', options: [
      { label: 'Pickup', value: 'pickup' },
      { label: 'Drop', value: 'drop' },
      { label: 'Both', value: 'both' },
    ] },
    { id: 'isActive', type: 'select', options: [
      { label: 'Active', value: '1' },
      { label: 'Inactive', value: '0' },
    ] },
  ] as FilterableColumnConfig[]} /> }
