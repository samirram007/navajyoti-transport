/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { PreferencesPage } from '@/features/user-initial-values/preferences-page'

export const Route = createFileRoute('/_protected/preferences/')({
  component: PreferencesPage,
})
