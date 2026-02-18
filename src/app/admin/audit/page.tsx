import { getAuditLog, checkUserRole } from '@/app/actions/admin'
import { AuditClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
    searchParams: Promise<{ branch?: string }>
}

export default async function AuditPage({ searchParams }: Props) {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const params = await searchParams
    const branchId = params.branch
    const { data: logs, count } = await getAuditLog(50, 0, branchId)
    return <AuditClient initialLogs={logs} totalCount={count ?? 0} branchId={branchId} />
}
