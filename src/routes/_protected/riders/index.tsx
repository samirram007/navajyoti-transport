/* oxlint-disable react/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { type FilterableColumnConfig } from '@/components/data-table'
import { RiderSchema } from '@/features/riders/schemas'
import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const RIDER_TYPE_STYLES: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  staff: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const Route = createFileRoute('/_protected/riders/')({
  component: RidersPage,
})

const columns: ColumnDef<any>[] = [
  {
    header: 'Name', accessorKey: 'name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.original.name}</span>
        <Button asChild variant="ghost" size="sm" className="h-6 gap-0.5 px-1.5 text-xs text-primary hover:text-primary/80" title="Add fees for this rider"
          onClick={(e) => e.stopPropagation()}>
          <Link to="/fees/new" search={{ riderId: row.original.id as number }}>
            <Plus className="h-3 w-3" />
            Fees
          </Link>
        </Button>
      </div>
    ),
  },
  { header: 'Code', accessorKey: 'code' },
  {
    header: 'Type', accessorKey: 'riderType',
    cell: ({ row }) => {
      const val: string = row.getValue('riderType')
      if (!val) return <span className="text-xs text-muted-foreground/50">—</span>
      return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', RIDER_TYPE_STYLES[val] || 'bg-muted text-muted-foreground')}>{val}</span>
    },
  },
  {
    header: 'Status', accessorKey: 'status',
    cell: ({ row }) => {
      const val: string = row.getValue('status')
      if (!val) return <span className="text-xs text-muted-foreground/50">—</span>
      return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize', STATUS_STYLES[val] || 'bg-muted text-muted-foreground')}>{val}</span>
    },
  },
  { header: 'Contact', accessorKey: 'contactNo' }, { header: 'Standard', accessorKey: 'standard' },
  { header: 'Section', accessorKey: 'section' }, { header: 'Roll No', accessorKey: 'rollNo' },
  { header: 'Join Date', accessorKey: 'joinDate', cell: ({ getValue }) => (getValue<string>() || '').slice(0, 10) },
  { header: 'Monthly Charge', accessorKey: 'monthlyCharge', cell: ({ row }) => `₹${row.original.monthlyCharge || 0}` },
  {
    header: 'Times',
    id: 'times',
    cell: ({ row }) => {
      const school = row.original.schoolTime
      const pickup = row.original.pickupTime
      const drop = row.original.dropTime
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{[school, pickup, drop].filter(Boolean).join(' · ') || '—'}</span>
        </div>
      )
    },
  },
]

const fields: Field[] = [
  { key: 'name', label: 'Name', icon: '👤', required: true },
  { key: 'contactNo', label: 'Contact No', icon: '📞' },
  { key: 'email', label: 'Email', icon: '✉️' },
  { key: 'standard', label: 'Standard', icon: '📚' },
  { key: 'section', label: 'Section', icon: '🏷️' },
  { key: 'rollNo', label: 'Roll No', icon: '🔢' },
  { key: 'monthlyCharge', label: 'Monthly Charge', type: 'number', icon: '💰' },
  { key: 'riderType', label: 'Rider Type', icon: '👤', type: 'select', options: [{ label: 'Student', value: 'student' }, { label: 'Staff', value: 'staff' }, { label: 'Other', value: 'other' }] },
  { key: 'status', label: 'Status', icon: '📊', type: 'select', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Suspended', value: 'suspended' }] },
  { key: 'isActive', label: 'Active', icon: '✅', type: 'select', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }], transform: (v) => v === true || v === 1 || v === 'true' },
  { key: 'isFree', label: 'Free Transport', icon: '🆓', type: 'select', options: [{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }], transform: (v) => v === true || v === 1 || v === 'true' },
  { key: 'joinDate', label: 'Join Date', type: 'date', icon: '📅' },
  { key: 'dissociateDate', label: 'Dissociate Date', type: 'date', icon: '📅' },
  { key: 'emergencyContactNo', label: 'Emergency Contact', icon: '🆘' },
  { key: 'schoolId', label: 'School', icon: '🏫', relation: { endpoint: 'schools', labelKey: 'name' } },
  { key: 'vehicleId', label: 'Vehicle', icon: '🚌', relation: { endpoint: 'vehicles', labelKey: 'name' } },
  { key: 'pickupSlotId', label: 'Pickup Slot', icon: '🅿️', relation: { endpoint: 'slots', labelKey: 'name' } },
  { key: 'dropSlotId', label: 'Drop Slot', icon: '🅿️', relation: { endpoint: 'slots', labelKey: 'name' } },
  { key: 'schoolTime', label: 'School Time', icon: '⏰' },
  { key: 'pickupTime', label: 'Pickup Time', type: 'time', icon: '⏰' },
  { key: 'dropTime', label: 'Drop Time', type: 'time', icon: '⏰' },
  { key: 'pickupPointId', label: 'Pickup Point', icon: '📍' },
  { key: 'dropPointId', label: 'Drop Point', icon: '📍' },
]

function RidersPage() {
  return <ResourcePage title="Riders" endpoint="riders" queryKey="riders" fields={fields} columns={columns} schema={RiderSchema} filterableColumns={[
    'code',
    'standard',
    'section',
    'rollNo',
    { id: 'riderType', type: 'select', options: [
      { label: 'Student', value: 'student' },
      { label: 'Staff', value: 'staff' },
      { label: 'Other', value: 'other' },
    ] },
    { id: 'status', type: 'select', options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Suspended', value: 'suspended' },
    ] },
  ] as FilterableColumnConfig[]} />
}
