import { getAuditLog } from '@/app/actions/admin'
import { AuditClient } from './client'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
    const { data: logs, count } = await getAuditLog()
    return <AuditClient initialLogs={logs} totalCount={count ?? 0} />
}
