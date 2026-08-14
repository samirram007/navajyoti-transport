import { useQuery } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { useUserInitialValues } from '@/contexts/user-initial-values-context'
import { useSaveIndicator } from '@/hooks/use-save-indicator'
import { PageHeader } from '@/components/page-header'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Calendar, Wallet, LayoutGrid, List, CheckCircle2,
  Building2, Tags, AlertCircle, Loader2, type LucideIcon, ChevronRight,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { YearSwitchForm } from '@/features/user-initial-values/year-switch-form'
import { cn } from '@/lib/utils'

const PAYMENT_MODE_OPTIONS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Online', value: 'online' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Card', value: 'card' },
]

interface PreferenceOption {
  key: string
  label: string
  description: string
  icon: LucideIcon
  control: 'select' | 'toggle' | 'text'
  options?: { label: string; value: string }[]
  placeholder?: string
}

const PREFERENCE_DEFINITIONS: PreferenceOption[] = [
  {
    key: 'paymentMode',
    label: 'Default Payment Mode',
    description: 'Set your preferred payment method for transactions',
    icon: Wallet,
    control: 'select',
    options: PAYMENT_MODE_OPTIONS,
    placeholder: 'Select payment mode...',
  },
  {
    key: 'defaultFeeHead',
    label: 'Default Fee Head',
    description: 'Select the fee head that is pre-selected when creating new fees',
    icon: Tags,
    control: 'select',
    placeholder: 'Select a fee head...',
  },
  {
    key: 'defaultOrganization',
    label: 'Default Organization',
    description: 'Set your default organization for new records',
    icon: Building2,
    control: 'select',
    placeholder: 'Select an organization...',
  },
  {
    key: 'dataDisplay',
    label: 'Default View Mode',
    description: 'Choose between grid or list view for data tables',
    icon: LayoutGrid,
    control: 'toggle',
  },
]

export function PreferencesPage() {
  const navigate = useNavigate()
  const { getValue, saveValue, isSaving } = useUserInitialValues()

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

  // Get current values
  const currentPaymentMode = getValue('paymentMode') ?? ''
  const currentDefaultFeeHead = getValue('defaultFeeHead') ?? ''
  const currentDefaultOrganization = getValue('defaultOrganization') ?? ''
  const currentDataDisplay = getValue('dataDisplay') ?? 'grid'

  const { savedKey, markSaved } = useSaveIndicator(isSaving)

  const handleSave = (key: string, value: string) => {
    if (!value) return
    markSaved(key)
    saveValue(key, value)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Preferences"
        description="Manage your personal settings and default preferences"
      />

      <div className="grid gap-8 max-w-2xl">
        {/* Fiscal Year — dedicated switch form */}
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

        {/* Other Preferences */}
        {PREFERENCE_DEFINITIONS.map((pref) => {
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
                            savedKey === pref.key
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
                        savedKey === pref.key
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

      {/* Quick Actions */}
      <Separator className="max-w-2xl" />
      <div className="max-w-2xl">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Links</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate({ to: '/user-initial-values' })}>
            <Building2 className="h-4 w-4" />
            Manage All Initial Values
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate({ to: '/fiscal-years' })}>
            <Calendar className="h-4 w-4" />
            Manage Fiscal Years
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
