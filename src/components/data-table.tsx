import { useState, useRef, useEffect, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/lib/use-debounce'
import { ChevronLeft, ChevronRight, Search, SearchX, X, Filter, List } from 'lucide-react'

export type FilterableColumnConfig =
  | string
  | { id: string; type?: 'text' }
  | { id: string; type: 'select'; options: { label: string; value: string }[] }

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  filterableColumns?: FilterableColumnConfig[]
  loading?: boolean
  onRowClick?: (row: TData) => void
  // Server-side mode
  serverSide?: boolean
  pageCount?: number
  total?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onSortingChange?: (sorting: SortingState) => void
  onGlobalFilterChange?: (value: string) => void
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  filterableColumns,
  loading,
  onRowClick,
  serverSide,
  pageCount,
  total,
  onPaginationChange,
  onSortingChange,
  onGlobalFilterChange,
  onColumnFiltersChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const { debouncedValue: debouncedFilter, isDebouncing: isSearchDebouncing } = useDebounce(globalFilter, 300)

  const resetPage = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const handleSortingChange = (updater: any) => {
    const newValue = typeof updater === 'function' ? updater(sorting) : updater
    setSorting(newValue)
    if (serverSide) {
      resetPage()
      onSortingChange?.(newValue)
    }
  }

  const handleGlobalFilterChange = useCallback((updater: any) => {
    const newValue = typeof updater === 'function' ? updater(globalFilter) : updater
    setGlobalFilter(newValue)
  }, [globalFilter])

  const initialRender = useRef(true)
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false
      return
    }
    if (!serverSide) return
    resetPage()
    onGlobalFilterChange?.(debouncedFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilter, serverSide])

  const handleColumnFiltersChange = (updater: any) => {
    const newValue = typeof updater === 'function' ? updater(columnFilters) : updater
    setColumnFilters(newValue)
    if (serverSide) {
      resetPage()
      onColumnFiltersChange?.(newValue)
    }
  }

  const handlePaginationChange = (updater: any) => {
    const newValue = typeof updater === 'function' ? updater(pagination) : updater
    setPagination(newValue)
    if (serverSide) {
      onPaginationChange?.(newValue.pageIndex, newValue.pageSize)
    }
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Search across every column, stringifying numbers/dates safely
    globalFilterFn: (row, columnId, filterValue) => {
      const search = String(filterValue ?? '').toLowerCase()
      if (!search) return true
      const value = row.getValue(columnId)
      if (value == null) return false
      return String(value).toLowerCase().includes(search)
    },
    // Server-side mode skips sorting/filtering/pagination
    ...(serverSide
      ? {
          manualPagination: true,
          manualSorting: true,
          manualFiltering: true,
          pageCount,
          getSortedRowModel: getExpandedRowModel(),
          getFilteredRowModel: getExpandedRowModel(),
          getPaginationRowModel: getExpandedRowModel(),
        }
      : {
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
        }),
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    onPaginationChange: handlePaginationChange,
    state: { sorting, columnFilters, globalFilter, pagination },
    initialState: { pagination: { pageSize: 10 } },
  })

  const hasActiveFilters = columnFilters.length > 0 || globalFilter !== ''
  const displayTotal = serverSide ? (total ?? data.length) : data.length

  return (
    <div className="space-y-3">
      {/* Toolbar: Search + Filter Toggle */}
      <div className="flex items-center gap-2">
        {searchKey && (
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            {serverSide && isSearchDebouncing && globalFilter ? (
              <span className="h-4 w-4 shrink-0 flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" />
              </span>
            ) : globalFilter && table.getRowModel().rows.length === 0 && !loading ? (
              <SearchX className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <Input
              placeholder="Search all fields..."
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              className="h-8 text-xs"
            />
            {globalFilter && (
              <div className="flex items-center gap-1.5 shrink-0">
                {table.getRowModel().rows.length === 0 && !loading && (
                  <span className="text-[10px] text-muted-foreground/50 font-medium whitespace-nowrap">No results</span>
                )}
                <button onClick={() => setGlobalFilter('')} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
        {filterableColumns && filterableColumns.length > 0 && (
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3 w-3" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground h-4 w-4 inline-flex items-center justify-center text-[9px] font-medium">
                {columnFilters.length + (globalFilter ? 1 : 0)}
              </span>
            )}
          </Button>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              setColumnFilters([])
              setGlobalFilter('')
            }}
          >
            Clear
          </Button>
        )}
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground">
          {table.getRowModel().rows.length} / {displayTotal} rows
        </div>
      </div>

      {/* Column Filter Row */}
      {showFilters && filterableColumns && filterableColumns.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 rounded-md border bg-muted/30">
          {filterableColumns.map(col => {
            const colId = typeof col === 'string' ? col : col.id
            const column = table.getColumn(colId)
            if (!column) return null
            const filterValue = column.getFilterValue() as string ?? ''
            const isSelect = typeof col !== 'string' && col.type === 'select'
            const options = isSelect ? (col as { id: string; type: 'select'; options: { label: string; value: string }[] }).options : []

            const hasValue = filterValue !== ''

            return (
              <div key={colId} className="flex items-center gap-1 rounded-md border border-border/50 bg-background/50 px-1.5 py-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase whitespace-nowrap pl-0.5">
                  {colId.replace(/_/g, ' ')}:
                </span>
                {isSelect ? (
                  <SearchableSelect
                    value={filterValue}
                    onValueChange={value => {
                      column.setFilterValue(value || undefined)
                    }}
                    options={options}
                    placeholder="All"
                    searchPlaceholder={`Search ${colId.replace(/_/g, ' ').toLowerCase()}...`}
                    className="h-7 w-32 text-xs"
                    allowClear
                  />
                ) : (
                  <Input
                    placeholder="Filter..."
                    value={filterValue}
                    onChange={e => column.setFilterValue(e.target.value || undefined)}
                    className="h-7 w-28 text-xs"
                  />
                )}
                {hasValue && (
                  <button
                    onClick={() => column.setFilterValue(undefined)}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title={`Clear ${colId.replace(/_/g, ' ')} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="text-xs uppercase tracking-wider cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                    <span className="text-xs">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className={cn(onRowClick && 'cursor-pointer')} onClick={() => onRowClick?.(row.original)}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-1">
                    <Search className="h-5 w-5 text-muted-foreground/50" />
                    <span className="text-xs">No results found</span>
                    {hasActiveFilters && (
                      <button
                        className="text-xs text-primary hover:underline mt-1"
                        onClick={() => {
                          setColumnFilters([])
                          setGlobalFilter('')
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <List className="h-3.5 w-3.5" />
            <span>Rows:</span>
          </div>
          <SearchableSelect
            value={String(table.getState().pagination.pageSize)}
            onValueChange={value => table.setPageSize(Number(value))}
            options={[10, 25, 50, 100].map(size => ({ label: String(size), value: size }))}
            placeholder="Rows"
            searchPlaceholder=""
            className="h-8 w-16 text-xs"
          />
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
              const page = Math.max(0, Math.min(table.getPageCount() - 1, table.getState().pagination.pageIndex - 2 + i))
              return (
                <Button
                  key={page}
                  variant={page === table.getState().pagination.pageIndex ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => table.setPageIndex(page)}
                >
                  {page + 1}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  )
}
