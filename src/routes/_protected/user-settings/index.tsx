/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { UserSettingsPage } from '@/features/user-initial-values/user-settings-page'

export const Route = createFileRoute('/_protected/user-settings/')({
  component: UserSettingsPage,
})
