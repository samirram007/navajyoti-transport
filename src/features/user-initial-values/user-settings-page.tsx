import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { useAuth } from '@/contexts/auth-context'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { useSaveIndicator } from '@/hooks/use-save-indicator'
import { PageHeader } from '@/components/page-header'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Calendar, Wallet, LayoutGrid, List, CheckCircle2, Settings,
  Plus, Pencil, Trash2, Loader2, X, Check, Key, Globe, Tags,
  Building2, AlertCircle, type LucideIcon,
} from 'lucide-react'
import { YearSwitchForm } from '@/features/user-initial-values/year-switch-form'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PAYMENT_MODE_OPTIONS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Online', value: 'online' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Card', value: 'card' },
]

const PREFERENCE_FIELDS = [
  {
    key: 'paymentMode',
    label: 'Default Payment Mode',
    description: 'Set your preferred payment method for transactions',
    icon: Wallet,
    control: 'select' as const,
    options: PAYMENT_MODE_OPTIONS,
    placeholder: 'Select payment mode...',
  },
  {
    key: 'defaultFeeHead',
    label: 'Default Fee Head',
    description: 'Select the fee head that is pre-selected when creating new fees',
    icon: Tags,
    control: 'select' as const,
    placeholder: 'Select a fee head...',
  },
  {
    key: 'defaultOrganization',
    label: 'Default Organization',
    description: 'Set your default organization for new records',
    icon: Building2,
    control: 'select' as const,
    placeholder: 'Select an organization...',
  },
  {
    key: 'dataDisplay',
    label: 'Default View Mode',
    description: 'Choose between grid or list view for data tables',
    icon: LayoutGrid,
    control: 'toggle' as const,
  },
]

export function UserSettingsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { values, isLoading, getValue, saveValue, isSaving } = useUserInitialValues()

  // Fetch relation options for dynamic selects
  const { data: feeHeads = [], isLoading: feeHeadsLoading, isError: feeHeadsError } = useQuery({
    queryKey: ['fee-heads-options'],
    queryFn: async () => {
      const res = await axiosClient.get('/fee_heads', { params: { per_page: 200 } })
      return (res.data?.data ?? []).map((fh: any) => ({ label: fh.name, value: String(fh.id) }))
    },
    staleTime: 5 * 60 * 1000,
  })
  const { data: organizations = [], isLoading: organizationsLoading, isError: organizationsError } = useQuery({
    queryKey: ['organizations-options'],
    queryFn: async () => {
      const res = await axiosClient.get('/organizations', { params: { per_page: 200 } })
      return (res.data?.data ?? []).map((org: any) => ({ label: org.name, value: String(org.id) }))
    },
    staleTime: 5 * 60 * 1000,
  })

  const currentPaymentMode = getValue('paymentMode') ?? ''
  const currentDefaultFeeHead = getValue('defaultFeeHead') ?? ''
  const currentDefaultOrganization = getValue('defaultOrganization') ?? ''
  const currentDataDisplay = getValue('dataDisplay') ?? 'grid'

  // Success indicator for preference saves
  const { savedKey: savedPrefKey, markSaved } = useSaveIndicator(isSaving)

  // State for adding/editing values inline
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editKey, setEditKey] = useState('')
  const [editValue, setEditValue] = useState('')

  // Filter/sort known preferences out of the table
  const knownPrefKeys = ['fiscalYearId', 'paymentMode', 'defaultFeeHead', 'defaultOrganization', 'dataDisplay']
  const customValues = values.filter(v => !knownPrefKeys.includes(v.key))

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload = { user_id: user!.id, key: newKey.trim(), value: newValue.trim() }
      await axiosClient.post('/user_initial_values', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-initial-values'] })
      toast.success('Value added')
      setNewKey('')
      setNewValue('')
      setShowAddForm(false)
    },
    onError: () => toast.error('Failed to add value'),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.put(`/user_initial_values/${editingId}`, {
        user_id: user!.id,
        key: editKey.trim(),
        value: editValue.trim(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-initial-values'] })
      toast.success('Value updated')
      setEditingId(null)
      setEditKey('')
      setEditValue('')
    },
    onError: () => toast.error('Failed to update value'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/user_initial_values/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-initial-values'] })
      toast.success('Value deleted')
    },
    onError: () => toast.error('Failed to delete value'),
  })

  const handleSave = (key: string, value: string) => {
    if (!value) return
    markSaved(key)
    saveValue(key, value)
  }

  const startEdit = (record: any) => {
    setEditingId(record.id)
    setEditKey(record.key)
    setEditValue(record.value)
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditKey('')
    setEditValue('')
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Settings"
        description="Manage your personal preferences and all custom configuration values"
      />

      {/* ===== SECTION 1: Preferences ===== */}
      <div className="grid gap-8 max-w-2xl">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">Default Fiscal Year</CardTitle>
                <CardDescription className="text-sm mt-0.5">
                  Select which fiscal year to use by default when creating fees and expenses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <YearSwitchForm />
          </CardContent>
        </Card>

        {PREFERENCE_FIELDS.map((pref) => {
          const currentValue = (() => {
            switch (pref.key) {
              case 'paymentMode': return currentPaymentMode
              case 'defaultFeeHead': return currentDefaultFeeHead
              case 'defaultOrganization': return currentDefaultOrganization
              case 'dataDisplay': return currentDataDisplay
              default: return ''
            }
          })()

          // Determine loading/error state for this preference's options
          const queryLoading = pref.key === 'defaultFeeHead' ? feeHeadsLoading : pref.key === 'defaultOrganization' ? organizationsLoading : false
          const queryError = pref.key === 'defaultFeeHead' ? feeHeadsError : pref.key === 'defaultOrganization' ? organizationsError : false

          // Resolve options: static list or API-fetched
          const resolvedOptions = pref.key === 'defaultFeeHead'
            ? feeHeads
            : pref.key === 'defaultOrganization'
              ? organizations
              : pref.options ?? []

          return (
            <Card key={pref.key} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                    <pref.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{pref.label}</CardTitle>
                    <CardDescription className="text-sm mt-0.5">{pref.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pref.control === 'select' && (
                  <div className="max-w-xs">
                    {queryLoading ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading {pref.label.toLowerCase()}...
                      </div>
                    ) : queryError ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        Failed to load {pref.label.toLowerCase()}
                      </div>
                    ) : (
                      <div className="relative">
                        <SearchableSelect
                          value={currentValue}
                          onValueChange={(v) => handleSave(pref.key, v)}
                          options={resolvedOptions}
                          placeholder={pref.placeholder ?? 'Select...'}
                          searchPlaceholder={`Search ${pref.label.toLowerCase()}...`}
                          disabled={isSaving}
                          allowClear
                        />
                        <span
                          className={cn(
                            'pointer-events-none absolute -top-2 right-0 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400 transition-all duration-300',
                            savedPrefKey === pref.key
                              ? 'opacity-100 translate-y-0'
                              : 'opacity-0 translate-y-1',
                          )}
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Saved
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {pref.control === 'toggle' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={currentValue === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSave(pref.key, 'grid')}
                      disabled={isSaving}
                      className="gap-2 relative"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Grid
                      {currentValue === 'grid' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant={currentValue === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSave(pref.key, 'list')}
                      disabled={isSaving}
                      className="gap-2 relative"
                    >
                      <List className="h-4 w-4" />
                      List
                      {currentValue === 'list' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </Button>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400 transition-all duration-300',
                        savedPrefKey === pref.key
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-95 pointer-events-none',
                      )}
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Saved
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator className="max-w-3xl" />

      {/* ===== SECTION 2: All Custom Values ===== */}
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              Custom Configuration Values
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add, edit, or remove custom key-value settings used by the application
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => { setShowAddForm(prev => !prev); setEditingId(null) }}
          >
            <Plus className="h-4 w-4" />
            Add Value
          </Button>
        </div>

        {/* Inline Add Form */}
        {showAddForm && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Key</Label>
                  <Input
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="Enter key name..."
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Value</Label>
                  <Input
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    placeholder="Enter value..."
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1 pb-0.5">
                  <Button
                    size="sm"
                    className="h-9 gap-1"
                    disabled={!newKey.trim() || !newValue.trim() || addMutation.isPending}
                    onClick={() => addMutation.mutate()}
                  >
                    {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => { setShowAddForm(false); setNewKey(''); setNewValue('') }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Values List */}
        <Card>
          <div className="divide-y">
            {/* Header */}
            <div className="grid grid-cols-[1fr_2fr_80px] gap-3 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
              <span>Key</span>
              <span>Value</span>
              <span className="text-right">Actions</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : customValues.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No custom values yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Click "Add Value" to create one</p>
              </div>
            ) : (
              customValues.map((record) => {
                const isEditing = editingId === record.id
                return (
                  <div
                    key={record.id}
                    className={cn(
                      'grid grid-cols-[1fr_2fr_80px] gap-3 px-4 py-3 items-center transition-colors',
                      isEditing ? 'bg-primary/5' : 'hover:bg-accent/30',
                    )}
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editKey}
                          onChange={e => setEditKey(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Key"
                        />
                        <Input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Value"
                        />
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                            disabled={!editKey.trim() || !editValue.trim() || updateMutation.isPending}
                            onClick={() => updateMutation.mutate()}
                          >
                            {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={cancelEdit}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <Key className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                          <span className="text-sm font-medium truncate">{record.key}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                          <span className="text-sm text-muted-foreground truncate">{record.value}</span>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(record)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                            onClick={() => { if (confirm('Delete this value?')) deleteMutation.mutate(record.id) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
