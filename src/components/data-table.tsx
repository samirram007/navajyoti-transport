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
  /** Dot-path accessor for the row label stored in data-row-name (default: 'name') */
  rowNameAccessor?: string
  /** Initial page size (e.g. from persisted user preference) */
  initialPageSize?: number
  // Server-side mode
  serverSide?: boolean
  pageCount?: number
  total?: number
  /** Controlled page index (0-based) — keeps the nav bar in sync with URL state */
  pageIndex?: number
  /** Controlled page size — keeps the page size selector in sync with parent state */
  pageSize?: number
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
  rowNameAccessor = 'name',
  initialPageSize = 10,
  serverSide,
  pageCount,
  total,
  pageIndex: pageIndexProp,
  pageSize: pageSizeProp,
  onPaginationChange,
  onSortingChange,
  onGlobalFilterChange,
  onColumnFiltersChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: initialPageSize })

  // In server-side mode with a controlled pageIndex or pageSize from the parent,
  // use the prop directly so the nav bar stays in sync with URL state.
  const effectivePageIndex = (serverSide && pageIndexProp !== undefined)
    ? pageIndexProp
    : pagination.pageIndex
  const effectivePageSize = (serverSide && pageSizeProp !== undefined)
    ? pageSizeProp
    : pagination.pageSize
  const effectivePagination: PaginationState = {
    pageIndex: effectivePageIndex,
    pageSize: effectivePageSize,
  }

  const { debouncedValue: debouncedFilter, isDebouncing: isSearchDebouncing } = useDebounce(globalFilter, 300)

  const resetPage = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const sortingInitRef = useRef(true)
  const handleSortingChange = (updater: any) => {
    const newValue = typeof updater === 'function' ? updater(sorting) : updater
    setSorting(newValue)
    if (sortingInitRef.current) {
      sortingInitRef.current = false
      return
    }
    if (serverSide && JSON.stringify(newValue) !== JSON.stringify(sorting)) {
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

  const columnFiltersInitRef = useRef(true)
  const handleColumnFiltersChange = (updater: any) => {
    const newValue = typeof updater === 'function' ? updater(columnFilters) : updater
    setColumnFilters(newValue)
    if (columnFiltersInitRef.current) {
      columnFiltersInitRef.current = false
      return
    }
    if (serverSide && JSON.stringify(newValue) !== JSON.stringify(columnFilters)) {
      resetPage()
      onColumnFiltersChange?.(newValue)
    }
  }

  // Skip pagination events fired during the initial mount — TanStack Table
  // fires onPaginationChange with default {pageIndex:0, pageSize:10} before
  // the controlled state is applied, which would strip URL params like ?page=4.
  // We use useEffect to clear the flag after mount so that user clicks are
  // never swallowed.
  const paginationInitRef = useRef(true)
  useEffect(() => {
    requestAnimationFrame(() => { paginationInitRef.current = false })
  }, [])
  const handlePaginationChange = (updater: any) => {
    const newValue = typeof updater === 'function' ? updater(effectivePagination) : updater
    setPagination(newValue)
    if (paginationInitRef.current) return
    if (serverSide && (newValue.pageIndex !== effectivePagination.pageIndex || newValue.pageSize !== effectivePagination.pageSize)) {
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
    state: { sorting, columnFilters, globalFilter, pagination: effectivePagination },
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
                <TableRow key={row.id} data-row-id={(row.original as any).id} data-row-name={rowNameAccessor.split('.').reduce((obj: any, key) => obj?.[key], row.original) ?? ''} className={cn(onRowClick && 'cursor-pointer')} onClick={() => onRowClick?.(row.original)}>
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
      <div className="flex items-center justify-between gap-2 pt-2 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <List className="h-3.5 w-3.5" />
            <span>Rows:</span>
          </div>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="h-8 w-20 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[10, 25, 50, 100].map(size => (
              <option key={size} value={size}>{size} rows</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 px-4 text-sm font-medium"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </Button>
          <Button
            variant="outline"
            className="h-10 w-10 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {(() => {
              const currentPage = table.getState().pagination.pageIndex
              const totalPages = table.getPageCount()
              const maxButtons = Math.min(5, totalPages)
              // Center the window around the current page, clamped to valid range
              const start = Math.max(0, Math.min(currentPage - 2, totalPages - maxButtons))
              return Array.from({ length: maxButtons }, (_, i) => {
                const page = start + i
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    className={cn(
                      'h-10 w-10 p-0 text-base font-medium',
                      page === currentPage
                        ? 'shadow-sm'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                    onClick={() => table.setPageIndex(page)}
                  >
                    {page + 1}
                  </Button>
                )
              })
            })()}
          </div>
          <Button
            variant="outline"
            className="h-10 w-10 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            className="h-10 px-4 text-sm font-medium"
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
