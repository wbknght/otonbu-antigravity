import { getAuditLog, checkUserRole } from '@/app/actions/admin'
import { AuditClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const { data: logs, count } = await getAuditLog()
    return <AuditClient initialLogs={logs} totalCount={count ?? 0} />
}
