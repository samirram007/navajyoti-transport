/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { VehicleSchema } from '@/features/vehicles/schemas'
import { type ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_protected/vehicles/')({
  component: VehiclesPage,
})

const columns: ColumnDef<any>[] = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Registration No', accessorKey: 'registrationNo' },
  { header: 'Reg Date', accessorKey: 'registrationDate', cell: ({ getValue }) => (getValue<string>() || '').slice(0, 10) },
  { header: 'Type', accessorKey: 'vehicleType.name' },
  { header: 'Capacity', accessorKey: 'capacity' },
  { header: 'Color', accessorKey: 'color' },
  { header: 'Insurance ID', accessorKey: 'insuranceId' },
]

const fields: Field[] = [
  { key: 'name', label: 'Name', icon: '🚗' },
  { key: 'registrationNo', label: 'Registration No', icon: '🔖' },
  { key: 'registrationDate', label: 'Registration Date', type: 'date', icon: '📅' },
  { key: 'registrationValidDate', label: 'Registration Valid Date', type: 'date', icon: '📅' },
  { key: 'chassisNo', label: 'Chassis No', icon: '🔧' },
  { key: 'engineNo', label: 'Engine No', icon: '⚙️' },
  { key: 'color', label: 'Color', icon: '🎨' },
  { key: 'capacity', label: 'Capacity', type: 'number', icon: '📦' },
  { key: 'insuranceId', label: 'Insurance ID', icon: '🛡️' },
  { key: 'vehicleTypeId', label: 'Vehicle Type', icon: '🚙', relation: { endpoint: 'vehicle_types', labelKey: 'name' } },
]

function VehiclesPage() {
  return <ResourcePage title="Vehicles" endpoint="vehicles" queryKey="vehicles" fields={fields} columns={columns} schema={VehicleSchema} filterableColumns={['registrationNo', 'color', 'capacity']} />
}
