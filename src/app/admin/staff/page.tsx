import { getStaffProfiles } from '@/app/actions/admin'
import { StaffClient } from './client'

export const dynamic = 'force-dynamic'

type Props = {
    searchParams: Promise<{ branch?: string }>
}

export default async function StaffPage({ searchParams }: Props) {
    const params = await searchParams
    const branchId = params.branch
    const { data: staff } = await getStaffProfiles(branchId)
    return <StaffClient initialStaff={staff} branchId={branchId} />
}
