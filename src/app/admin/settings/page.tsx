import { getSettings } from '@/app/actions/admin'
import { SettingsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const { data: settings } = await getSettings()
    return <SettingsClient initialSettings={settings} />
}
