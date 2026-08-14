/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { VehicleTypeSchema } from '@/features/vehicle-types/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/vehicle-types/')({ component: VehicleTypesPage })
const columns: ColumnDef<any>[] = [{ header: 'Name', accessorKey: 'name' }]
const fields: Field[] = [{ key: 'name', label: 'Name', icon: '🚗' }]
function VehicleTypesPage() { return <ResourcePage title="Vehicle Types" endpoint="vehicle_types" queryKey="vehicle_types" fields={fields} columns={columns} schema={VehicleTypeSchema} filterableColumns={['name']} /> }
