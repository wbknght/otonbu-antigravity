import { redirect } from 'next/navigation'
import { getSessionContext } from '@/lib/session'
import { StatsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function StatsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getSessionContext()
    if (!session) redirect('/login')

    // Only manager+ can view stats
    if (!['super_admin', 'partner', 'branch_admin', 'manager'].includes(session.role)) {
        redirect('/dashboard')
    }

    const params = await searchParams
    const branchParam = typeof params.branch === 'string' ? params.branch : undefined

    // Use branch from URL param if super_admin, otherwise use session branch
    const branch = branchParam && session.isSuperAdmin
        ? session.allBranches.find(b => b.id === branchParam) || session.branch
        : session.branch

    return <StatsClient initialBranch={branch} />
}
