import { getAllStaff, checkUserRole } from '@/app/actions/admin'
import { UsersClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    const userRole = await checkUserRole()
    
    // Only super_admin can access this page
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const { data: allStaff } = await getAllStaff()
    return <UsersClient initialStaff={allStaff || []} />
}
