import { getLocations, checkUserRole } from '@/app/actions/admin'
import { LocationsClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LocationsPage() {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const { data: locations } = await getLocations()
    return <LocationsClient initialLocations={locations} />
}
