/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage, type Field } from '@/components/resource-page'
import { SettingSchema } from '@/features/settings/schemas'
import { type ColumnDef } from '@tanstack/react-table'
export const Route = createFileRoute('/_protected/settings/')({ component: SettingsPage })
const columns: ColumnDef<any>[] = [{ header: 'Key', accessorKey: 'key' }, { header: 'Value', accessorKey: 'value' }]
const fields: Field[] = [{ key: 'key', label: 'Key' }, { key: 'value', label: 'Value' }]
function SettingsPage() { return <ResourcePage title="Settings" endpoint="settings" queryKey="settings" fields={fields} columns={columns} searchKey={'key'} schema={SettingSchema} /> }
