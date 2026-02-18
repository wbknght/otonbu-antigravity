import { getStaffProfiles } from '@/app/actions/admin'
import { StaffClient } from './client'

export const dynamic = 'force-dynamic'

type Props = {
    searchParams: Promise<{ branch?: string }>
}

export default async function StaffPage({ searchParams }: Props) {
    const params = await searchParams
    const branchId = params.branch
    const result = await getStaffProfiles(branchId)
    
    if (result.error) {
        return (
            <div className="p-8">
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                    Hata: {result.error}
                </div>
            </div>
        )
    }
    
    return <StaffClient initialStaff={result.data || []} branchId={branchId} />
}
