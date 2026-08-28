import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size'
import { usePersistedSortDir } from '@/hooks/use-persisted-sort-dir'
import axiosClient from '@/lib/axios-client'
import { DataTable, type FilterableColumnConfig } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Save, X, RotateCcw, BadgeCheck, Loader2, Check, CircleX } from 'lucide-react'
import { type ColumnDef, type SortingState, type ColumnFiltersState } from '@tanstack/react-table'
import type { ZodSchema } from 'zod'
import { cn } from '@/lib/utils'

export interface Field {
  key: string
  label: string
  type?: 'text' | 'number' | 'select' | 'date' | 'password' | 'time'
  required?: boolean
  options?: { label: string; value: string | number }[]
  icon?: string
  /** Fetches options from an API endpoint and renders as a select dropdown */
  relation?: {
    endpoint: string
    labelKey: string
    valueKey?: string
  }
  /** Convert the raw input value before storing it in the form state */
  transform?: (value: any) => any
}

interface ResourcePageProps {
  title: string
  endpoint: string
  queryKey: string
  fields: Field[]
  columns: ColumnDef<any>[]
  searchKey?: string
  filterableColumns?: FilterableColumnConfig[]
  schema?: ZodSchema
  inlineForm?: boolean
  rowNameAccessor?: string
  onAddNew?: () => void
  onEditItem?: (id: number) => void
}

/** Fetch options from a relation endpoint — used by both the hook and pre-fetch */
async function fetchRelationOptions(field: Field) {
  const endpoint = field.relation!.endpoint
  const res = await axiosClient.get(`/${endpoint}?per_page=500&page=1`)
  const items = res.data?.data || []
  const labelKey = field.relation!.labelKey
  const valueKey = field.relation!.valueKey || 'id'
  return items.map((item: any) => ({
    label: String(item[labelKey] ?? `#${item[valueKey]}`),
    value: item[valueKey],
  }))
}

/** Hook to fetch options for a relation field */
function useRelationOptions(field: Field) {
  return useQuery({
    queryKey: [field.relation!.endpoint, 'options'],
    queryFn: () => fetchRelationOptions(field),
    staleTime: 2 * 60 * 1000, // 2 min cache
  })
}

export function ResourcePage({ title, endpoint, queryKey, fields, columns, searchKey = 'name', filterableColumns, schema, inlineForm = true, rowNameAccessor, onAddNew, onEditItem }: ResourcePageProps) {
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()

  // Pre-fetch relation options on mount so they're cached when edit form opens
  useEffect(() => {
    for (const field of fields) {
      if (field.relation) {
        queryClient.prefetchQuery({
          queryKey: [field.relation.endpoint, 'options'],
          queryFn: () => fetchRelationOptions(field),
          staleTime: 2 * 60 * 1000,
        }).catch(() => {}) // React Query handles errors internally; prevent global unhandled rejection
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Read state from URL search params ──
  const urlSearch = useSearch({ strict: false })
  const navigate = useNavigate()
  const [page, setPage] = useState(Math.max(0, (urlSearch.page ?? 1) - 1))
  const [pageSize, setPageSize] = usePersistedPageSize()
  const [search, setSearch] = useState(urlSearch.search ?? '')
  const [defaultSortDir, setDefaultSortDir] = usePersistedSortDir(queryKey)
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (urlSearch.sort) return [{ id: urlSearch.sort as string, desc: (urlSearch.dir ?? defaultSortDir) === 'desc' }]
    return []
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    if (urlSearch.filters) {
      try { return JSON.parse(urlSearch.filters as string) } catch { /* ignore */ }
    }
    return []
  })

  // ── Sync state from URL on every navigation (back/forward) ──
  useEffect(() => {
    setPage(Math.max(0, (urlSearch.page ?? 1) - 1))
  }, [urlSearch.page])
  useEffect(() => {
    setSearch(urlSearch.search ?? '')
  }, [urlSearch.search])
  useEffect(() => {
    if (urlSearch.sort) {
      setSorting([{ id: urlSearch.sort as string, desc: (urlSearch.dir ?? defaultSortDir) === 'desc' }])
    } else {
      setSorting([])
    }
  }, [urlSearch.sort, urlSearch.dir, defaultSortDir])
  useEffect(() => {
    if (urlSearch.filters) {
      try { setColumnFilters(JSON.parse(urlSearch.filters as string)) } catch { setColumnFilters([]) }
    } else {
      setColumnFilters([])
    }
  }, [urlSearch.filters])

  // ── Sync state changes back to URL ──
  // Skip the first few syncToUrl calls during mount — TanStack Table fires
  // onPaginationChange/onSortingChange with default values that would strip URL
  // params like ?page=4 that were present on the initial navigation.
  const initialSyncDone = useRef(false)
  useEffect(() => {
    // Mark as ready after the first full render cycle
    requestAnimationFrame(() => { initialSyncDone.current = true })
  }, [])

  const syncToUrl = useCallback((overrides?: { page?: number; size?: number; sort?: string; dir?: string; search?: string; filters?: string }, replace = false) => {
    if (!initialSyncDone.current) return
    const p = overrides?.page ?? page
    const s = overrides?.size ?? pageSize
    const sort = overrides?.sort ?? (sorting.length > 0 ? sorting[0].id : '')
    const dir = overrides?.dir ?? (sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : 'desc')
    const searchVal = overrides?.search ?? search
    const filtersStr = overrides?.filters ?? (columnFilters.length > 0 ? JSON.stringify(columnFilters) : '')
    const clean: Record<string, any> = {}
    if (p > 0) clean.page = p + 1
    if (s !== 10) clean.size = s
    if (sort) clean.sort = sort
    if (dir !== 'desc') clean.dir = dir
    if (searchVal) clean.search = searchVal
    if (filtersStr) clean.filters = filtersStr
    // Skip navigation if the generated URL matches the current one
    const currentParams = new URLSearchParams(window.location.search)
    const cleanParams = new URLSearchParams()
    for (const [k, v] of Object.entries(clean)) {
      cleanParams.set(k, String(v))
    }
    if (currentParams.toString() === cleanParams.toString()) return
    navigate({ search: clean as any, replace })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sorting, search, columnFilters, navigate])

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, { page, pageSize, search, sorting: sorting.map(s => ({ id: s.id, desc: s.desc })), columnFilters }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page + 1))
      params.set('per_page', String(pageSize))
      if (search) params.set('search', search)
      if (sorting.length > 0) {
        params.set('sort_by', sorting[0].id)
        params.set('sort_dir', sorting[0].desc ? 'desc' : 'asc')
      }
      columnFilters.forEach(f => {
        params.set(`filter_${f.id}`, String(f.value))
      })
      const res = await axiosClient.get(`/${endpoint}?${params.toString()}`)
      return res.data
    },
  })

  const mutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editing) {
        // Strip empty optional fields (e.g. password when API doesn't return it)
        const cleaned = { ...formData }
        for (const [key, value] of Object.entries(cleaned)) {
          if (value === '' || value === undefined || value === null) {
            delete cleaned[key]
          }
        }
        await axiosClient.put(`/${endpoint}/${editing.id}`, cleaned)
      } else {
        await axiosClient.post(`/${endpoint}`, formData)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      toast.success(editing ? 'Updated successfully' : 'Created successfully')
      resetForm()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Operation failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axiosClient.delete(`/${endpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      toast.success('Deleted successfully')
      if (editing) resetForm()
    },
    onError: () => toast.error('Delete failed'),
  })

  const resetForm = () => {
    setEditing(null)
    setForm({})
    setErrors({})
  }

  const openCreate = () => {
    resetForm()
  }

  const openEdit = (item: any) => {
    setEditing(item)
    setForm(item)
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (schema) {
      const result = schema.safeParse(form)
      if (!result.success) {
        const fieldErrors: Record<string, string[]> = (result.error as any).flatten().fieldErrors
        const mapped: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(fieldErrors)) {
          if (msgs && msgs.length > 0) mapped[key] = msgs[0]
        }
        setErrors(mapped)
        return
      }
    }

    mutation.mutate(form)
  }

  const handleRowClick = (row: any) => {
    if (!inlineForm) return
    if (!editing || editing.id !== row.id) {
      openEdit(row)
    }
  }

  const allColumns: ColumnDef<any>[] = [
    ...columns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
                      e.stopPropagation()
                      if (!inlineForm) { onEditItem?.(row.original.id); return }
                      openEdit(row.original)
                    }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Delete this item?')) deleteMutation.mutate(row.original.id)
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex h-full gap-0">
      {/* Left Panel — Corporate Create/Edit Form */}
      {inlineForm && (
      <div className="w-[26rem] shrink-0 border-r bg-card flex flex-col shadow-elevation-3">
        {/* Form Header */}
        <div className="px-5 py-4 border-b bg-gradient-to-r from-primary/[0.03] to-transparent">
          <div
            key={editing ? 'edit-header' : 'create-header'}
            className="animate-in duration-200 flex items-start justify-between"
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg shadow-sm mt-0.5',
                editing
                  ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                  : 'bg-primary/10 text-primary border border-primary/20'
              )}>
                {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    {editing ? `Edit ${title}` : `New ${title}`}
                  </h2>
                  {editing && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-medium border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                      <BadgeCheck className="h-2.5 w-2.5" />
                      Editing
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {editing
                    ? 'Modify the record details below'
                    : 'Fill in the details to create a new record'
                  }
                </p>
              </div>
            </div>
            {editing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground -mr-1 -mt-1"
                onClick={resetForm}
                title="Cancel editing"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-5 space-y-5" id="resource-form">
            <div
              key={editing ? 'edit-fields' : 'create-fields'}
              className="animate-in duration-200 space-y-5"
            >
              {/* Required fields hint */}
              {fields.some(f => f.required) && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                  <span className="text-destructive">*</span>
                  <span>Indicates required fields</span>
                </div>
              )}

              {fields.map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  value={form[field.key]}
                  error={errors[field.key]}
                  onChange={(value) => {
                    const v = field.transform ? field.transform(value) : value
                    setForm({ ...form, [field.key]: v })
                    setErrors(prev => ({ ...prev, [field.key]: '' }))
                  }}
                />
              ))}
            </div>
          </form>
        </div>

        {/* Form Footer — Sticky with actions */}
        <div className="px-5 py-3.5 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              form="resource-form"
              size="sm"
              className="h-9 text-xs flex-1 gap-1.5 font-medium shadow-sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {editing ? 'Saving...' : 'Creating...'}
                </>
              ) : editing ? (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Update Record
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Create Record
                </>
              )}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-1.5"
                onClick={resetForm}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Right Panel — DataTable with Server-Side Pagination/Search/Sort */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">{title}</h1>
              <p className="text-xs text-muted-foreground">
                Manage your {title.toLowerCase()} records
              </p>
            </div>
            {(!editing || !inlineForm) && (
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { if (!inlineForm) { onAddNew?.(); return }; openCreate() }}>
                <Plus className="h-3.5 w-3.5" />
                Add {title}
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <DataTable
            columns={allColumns}
            data={data?.data || []}
            searchKey={searchKey}
            filterableColumns={filterableColumns}
            loading={isLoading}
            onRowClick={handleRowClick}
            rowNameAccessor={rowNameAccessor}
            initialPageSize={pageSize}
            // Server-side pagination/search/sort
            serverSide
            pageIndex={page}
            pageSize={pageSize}
            pageCount={data?.pagination?.last_page ?? data?.meta?.last_page ?? 0}
            total={data?.pagination?.total ?? data?.meta?.total ?? 0}
            onPaginationChange={(pageIdx, size) => {
              setPage(pageIdx)
              if (size !== pageSize) setPageSize(size)
              syncToUrl({ page: pageIdx, size }, false)
            }}
            onSortingChange={(newSorting) => {
              setSorting(newSorting)
              setPage(0)
              const dir = newSorting.length > 0 ? (newSorting[0].desc ? 'desc' as const : 'asc' as const) : defaultSortDir
              setDefaultSortDir(dir)
              syncToUrl({
                sort: newSorting.length > 0 ? newSorting[0].id : '',
                dir,
                page: 0,
              }, false)
            }}
            onGlobalFilterChange={(value) => {
              setSearch(value)
              setPage(0)
              syncToUrl({ search: value, page: 0 }, false)
            }}
            onColumnFiltersChange={(filters) => {
              setColumnFilters(filters)
              setPage(0)
              syncToUrl({ filters: filters.length > 0 ? JSON.stringify(filters) : '', page: 0 }, false)
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Form Field Sub-component ──────────────────────────────────────────

function FormField({ field, value, error, onChange }: {
  field: Field
  value: any
  error?: string
  onChange: (value: any) => void
}) {
  // If field has a relation, use dynamic select
  if (field.relation) {
    return <RelationSelectField field={field} value={value} error={error} onChange={onChange} />
  }      // Static select with search support
  if (field.type === 'select') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={field.key} className="text-xs font-medium text-foreground/80">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {error && <span className="text-[10px] text-destructive font-medium">{error}</span>}
        </div>
        <SearchableSelect
          value={String(value ?? '')}
          onValueChange={onChange}
          options={field.options || []}
          placeholder={`Select ${field.label}`}
          searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
          error={!!error}
        />
      </div>
    )
  }

  // Text / number / date / password input
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.key} className="text-xs font-medium text-foreground/80">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {error && <span className="text-[10px] text-destructive font-medium">{error}</span>}
      </div>
      <div className="relative">
        {field.icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm leading-none pointer-events-none select-none">
            {field.icon}
          </span>
        )}
        <Input
          id={field.key}
          type={field.type === 'password' ? 'password' : field.type || 'text'}
          value={value ?? ''}
          onChange={e => {
            onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)
          }}
          className={cn(
            'h-9 text-sm transition-shadow duration-150',
            field.icon && 'pl-8',
            (error || value || value === 0) && 'pr-8',
            error && 'border-destructive ring-1 ring-destructive/30'
          )}
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
        {/* Validation status icon */}
        {error ? (
          <CircleX className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive pointer-events-none" />
        ) : value || value === 0 ? (
          <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 dark:text-green-400 pointer-events-none" />
        ) : null}
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}

// ─── Relation Select Field ────────────────────────────────────────────

function RelationSelectField({ field, value, error, onChange }: {
  field: Field
  value: any
  error?: string
  onChange: (value: any) => void
}) {
  const { data: options, isLoading, isError } = useRelationOptions(field)

  const displayOptions = options && !isLoading ? options : []

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.key} className="text-xs font-medium text-foreground/80">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {error && <span className="text-[10px] text-destructive font-medium">{error}</span>}
      </div>
      <SearchableSelect
        value={String(value ?? '')}
        onValueChange={onChange}
        options={displayOptions}
        placeholder={isLoading ? 'Loading options...' : `Select ${field.label}`}
        searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
        emptyMessage={isError ? 'Failed to load options' : displayOptions.length === 0 ? 'No options available' : 'No results found.'}
        error={!!error}
        loading={isLoading}
        disabled={isError}
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
