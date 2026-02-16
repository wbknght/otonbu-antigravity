import { getBranches } from '@/app/actions/admin'
import { BranchesClient } from './client'

export const dynamic = 'force-dynamic'

export default async function BranchesPage() {
    const { data: branches } = await getBranches()
    return <BranchesClient initialBranches={branches} />
}
