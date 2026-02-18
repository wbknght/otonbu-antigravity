import { getSettings, checkUserRole } from '@/app/actions/admin'
import { SettingsClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
    searchParams: Promise<{ branch?: string }>
}

export default async function SettingsPage({ searchParams }: Props) {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const params = await searchParams
    const branchId = params.branch
    const { data: settings } = await getSettings(branchId)
    return <SettingsClient initialSettings={settings} branchId={branchId} />
}
