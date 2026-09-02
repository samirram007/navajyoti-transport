/* oxlint-disable react/only-export-components */
import { useState, useEffect, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { paginationSearchSchema } from '@/lib/search-schemas'
import { ResourcePage, type Field } from '@/components/resource-page'
import { type FilterableColumnConfig } from '@/components/data-table'
import { RiderSchema } from '@/features/riders/schemas'
import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Clock, Plus, Eye, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { RiderFeeSummaryDialog } from '@/features/fees/components/rider-fee-summary-dialog'
import { ManageRidersDialog } from '@/features/riders/components/manage-riders-dialog'

const RIDER_TYPE_STYLES: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  staff: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  permanent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  withdrawn: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export const Route = createFileRoute('/_protected/riders/')({
  validateSearch: paginationSearchSchema.extend({
    filters: z.string().optional(),
  }),
  component: RidersPage,
})

const columns: ColumnDef<any, any>[] = [
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
  {
    id: 'feeSummary',
    header: '',
    cell: ({ row }) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              window.dispatchEvent(new CustomEvent('open-rider-fee-summary', { detail: { id: row.original.id, name: row.original.name } }))
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Fee summary for {row.original.name}</TooltipContent>
      </Tooltip>
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
  { key: 'status', label: 'Status', icon: '📊', type: 'select', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Suspended', value: 'suspended' }, { label: 'Permanent', value: 'permanent' }, { label: 'Withdrawn', value: 'withdrawn' }], defaultValue: 'active',
    onChange: (v, setForm) => setForm(prev => ({
      ...prev,
      isActive: v !== 'inactive' && v !== 'withdrawn',
      dissociateDate: (v === 'withdrawn' && !prev.dissociateDate) ? new Date().toISOString().slice(0, 10) : prev.dissociateDate,
    })),
  },
  { key: 'name', label: 'Name', icon: '👤', required: true },
  { key: 'contactNo', label: 'Contact No', icon: '📞' },
  { key: 'email', label: 'Email', icon: '✉️' },
  { key: 'standard', label: 'Standard', icon: '📚' },
  { key: 'section', label: 'Section', icon: '🏷️' },
  { key: 'rollNo', label: 'Roll No', icon: '🔢' },
  { key: 'monthlyCharge', label: 'Monthly Charge', type: 'number', icon: '💰' },
  { key: 'isFree', label: 'Free Transport', icon: '🆓', type: 'switch' },
  { key: 'riderType', label: 'Rider Type', icon: '👤', type: 'select', options: [{ label: 'Student', value: 'student' }, { label: 'Staff', value: 'staff' }, { label: 'Other', value: 'other' }] },
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
  const [feeSummaryOpen, setFeeSummaryOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [selectedRider, setSelectedRider] = useState<{ id: number; name: string } | null>(null)

  return (
    <>      <ResourcePage title="Riders" endpoint="riders" queryKey="riders" fields={fields} columns={columns} schema={RiderSchema} rowNameAccessor="name"
        initialColumnFilters={[{ id: 'status', value: 'active' }]}
        filterableColumns={[
        'code',
        'standard',
        'section',
        'rollNo',
        { id: 'riderType', type: 'select', options: [
          { label: 'Student', value: 'student' }, { label: 'Staff', value: 'staff' }, { label: 'Other', value: 'other' },
        ] },        { id: 'status', type: 'select', options: [
          { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Suspended', value: 'suspended' }, { label: 'Permanent', value: 'permanent' }, { label: 'Withdrawn', value: 'withdrawn' },
        ] },
      ] as FilterableColumnConfig[]}
        headerActions={
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setManageOpen(true)}>
            <Users className="h-3.5 w-3.5" />
            Manage Riders
          </Button>
        }
      />

      {/* Fee Summary Dialog */}
      <FeeSummaryListener
        onOpen={(id, name) => { setSelectedRider({ id, name }); setFeeSummaryOpen(true) }}
      />
      {selectedRider && (
        <RiderFeeSummaryDialog
          open={feeSummaryOpen}
          onOpenChange={setFeeSummaryOpen}
          riderId={selectedRider.id}
          riderName={selectedRider.name}
        />
      )}

      {/* Manage Riders Dialog */}
      <ManageRidersDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
      />
    </>
  )
}

/**
 * Listens for the custom DOM event dispatched by the eye button in the table.
 * This bridges the static columns definition with React state.
 */
function FeeSummaryListener({ onOpen }: { onOpen: (id: number, name: string) => void }) {
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  useEffect(() => {
    // Custom event from eye button
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.id && detail?.name) onOpenRef.current(detail.id, detail.name)
    }
    window.addEventListener('open-rider-fee-summary', handler)

    // Ctrl+E keyboard shortcut — opens fee summary for hovered row
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        const hovered = document.querySelector<HTMLElement>('tr:hover[data-row-id]')
        if (hovered) {
          const id = Number(hovered.dataset.rowId)
          const name = hovered.dataset.rowName || ''
          if (id) onOpenRef.current(id, name)
        }
      }
    }
    window.addEventListener('keydown', keyHandler)

    return () => {
      window.removeEventListener('open-rider-fee-summary', handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [])
  return null
}
