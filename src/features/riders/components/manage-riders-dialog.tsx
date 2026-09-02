import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Users, Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  ArrowRight, Filter, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'

interface RiderBillingStatus {
  id: number
  name: string
  code: string | null
  status: string
  is_active: boolean
  rider_type: string | null
  standard: string | null
  section: string | null
  school: string
  vehicle: string
  monthly_charge: number
  has_current_fees: boolean
  pending_balance: number
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Permanent', value: 'permanent' },
  { label: 'Withdrawn', value: 'withdrawn' },
]

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  permanent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  withdrawn: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

type FilterView = 'all' | 'current_period' | 'no_fees' | 'has_pending'
type SortKey = 'name' | 'status' | 'school' | 'has_current_fees' | 'pending_balance'
type SortDir = 'asc' | 'desc'

export function ManageRidersDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [newStatus, setNewStatus] = useState('')
  const [viewFilter, setViewFilter] = useState<FilterView>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const { data: riders = [], isLoading, refetch } = useQuery<RiderBillingStatus[]>({
    queryKey: ['riders-billing-status'],
    queryFn: async () => {
      const res = await axiosClient.get('/riders/with-billing-status')
      return res.data.data
    },
    enabled: open,
    staleTime: 30_000,
  })

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.patch('/riders/bulk-status', {
        rider_ids: Array.from(selectedIds),
        status: newStatus,
      })
      return res.data.data
    },
    onSuccess: (result) => {
      toast.success(`Updated ${result.updated} rider${result.updated !== 1 ? 's' : ''} to ${result.status}`)
      queryClient.invalidateQueries({ queryKey: ['riders'] })
      queryClient.invalidateQueries({ queryKey: ['riders-billing-status'] })
      setSelectedIds(new Set())
      setNewStatus('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update riders')
    },
  })

  // Filter riders based on view
  const filteredRiders = useMemo(() => {
    const filtered = riders.filter((r) => {
      switch (viewFilter) {
        case 'current_period':
          return r.has_current_fees
        case 'no_fees':
          return !r.has_current_fees
        case 'has_pending':
          return r.pending_balance > 0
        default:
          return true
      }
    })

    // Sort
    return [...filtered].sort((a, b) => {
      let aVal: any
      let bVal: any
      switch (sortKey) {
        case 'name':
          aVal = a.name?.toLowerCase() ?? ''
          bVal = b.name?.toLowerCase() ?? ''
          break
        case 'status':
          aVal = a.status?.toLowerCase() ?? ''
          bVal = b.status?.toLowerCase() ?? ''
          break
        case 'school':
          aVal = a.school?.toLowerCase() ?? ''
          bVal = b.school?.toLowerCase() ?? ''
          break
        case 'has_current_fees':
          aVal = a.has_current_fees ? 1 : 0
          bVal = b.has_current_fees ? 1 : 0
          break
        case 'pending_balance':
          aVal = a.pending_balance
          bVal = b.pending_balance
          break
        default:
          aVal = 0
          bVal = 0
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [riders, viewFilter, sortKey, sortDir])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRiders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRiders.map((r) => r.id)))
    }
  }

  const ridersInCurrentPeriod = riders.filter((r) => r.has_current_fees).length
  const ridersWithPending = riders.filter((r) => r.pending_balance > 0).length
  const ridersWithoutFees = riders.filter((r) => !r.has_current_fees).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Manage Riders
          </DialogTitle>
          <DialogDescription>
            Bulk update rider status based on billing period. Riders in the current billing period should remain active.
          </DialogDescription>
        </DialogHeader>

        {/* Stats bar */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            {ridersInCurrentPeriod} in current period
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            {ridersWithPending} with pending balance
          </span>
          <span className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            {ridersWithoutFees} without current fees
          </span>
        </div>

        {/* Filter tabs + bulk actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {([
              { value: 'all' as const, label: 'All', count: riders.length },
              { value: 'current_period' as const, label: 'Current Period', count: ridersInCurrentPeriod },
              { value: 'no_fees' as const, label: 'No Current Fees', count: ridersWithoutFees },
              { value: 'has_pending' as const, label: 'Has Pending', count: ridersWithPending },
            ]).map((tab) => (
              <Button
                key={tab.value}
                variant={viewFilter === tab.value ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => { setViewFilter(tab.value); setSelectedIds(new Set()) }}
              >
                {tab.label}
                <span className="text-[10px] opacity-70">({tab.count})</span>
              </Button>
            ))}
          </div>

          {/* Bulk action controls */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <SearchableSelect
                value={newStatus}
                onValueChange={setNewStatus}
                options={STATUS_OPTIONS}
                placeholder="Set status..."
                className="h-7 w-36"
              />
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={!newStatus || bulkMutation.isPending}
                onClick={() => bulkMutation.mutate()}
              >
                {bulkMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowRight className="h-3 w-3" />
                )}
                Apply
              </Button>
            </div>
          )}
        </div>

        {/* Riders table */}
        <div className="flex-1 overflow-auto border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRiders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No riders match this filter</p>
            </div>
          ) : (
            <table className="w-full text-sm">                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-2 px-3 text-left">
                      <Checkbox
                        checked={selectedIds.size === filteredRiders.length && filteredRiders.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('name')}>
                      <span className="flex items-center gap-1">Name <SortIcon colKey="name" /></span>
                    </th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Code</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('status')}>
                      <span className="flex items-center gap-1">Status <SortIcon colKey="status" /></span>
                    </th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('school')}>
                      <span className="flex items-center gap-1">School <SortIcon colKey="school" /></span>
                    </th>
                    <th className="py-2 px-3 text-center font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('has_current_fees')}>
                      <span className="flex items-center justify-center gap-1">Current Period <SortIcon colKey="has_current_fees" /></span>
                    </th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('pending_balance')}>
                      <span className="flex items-center justify-end gap-1">Pending <SortIcon colKey="pending_balance" /></span>
                    </th>
                  </tr>
                </thead>
              <tbody>
                {filteredRiders.map((rider) => (
                  <tr
                    key={rider.id}
                    className={cn(
                      'border-b last:border-0 transition-colors',
                      selectedIds.has(rider.id) && 'bg-blue-50 dark:bg-blue-900/10',
                      !selectedIds.has(rider.id) && 'hover:bg-muted/30',
                    )}
                  >
                    <td className="py-2 px-3">
                      <Checkbox
                        checked={selectedIds.has(rider.id)}
                        onCheckedChange={() => toggleSelect(rider.id)}
                      />
                    </td>
                    <td className="py-2 px-3 font-medium">{rider.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{rider.code || '—'}</td>
                    <td className="py-2 px-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize',
                        STATUS_STYLES[rider.status] || 'bg-muted text-muted-foreground',
                      )}>
                        {rider.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground truncate max-w-[120px]">{rider.school}</td>
                    <td className="py-2 px-3 text-center">
                      {rider.has_current_fees ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {rider.pending_balance > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          ₹{rider.pending_balance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
