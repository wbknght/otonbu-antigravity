import { getSettings, checkUserRole } from '@/app/actions/admin'
import { SettingsClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const { data: settings } = await getSettings()
    return <SettingsClient initialSettings={settings} />
}
