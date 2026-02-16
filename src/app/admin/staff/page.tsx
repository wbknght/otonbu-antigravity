import { getStaffProfiles } from '@/app/actions/admin'
import { StaffClient } from './client'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
    const { data: staff } = await getStaffProfiles()
    return <StaffClient initialStaff={staff} />
}
