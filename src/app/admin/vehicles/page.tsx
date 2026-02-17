import { getVehicleClasses, checkUserRole } from '@/app/actions/admin'
import { VehiclesClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function VehiclesPage() {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const { data: vehicleClasses } = await getVehicleClasses()
    return <VehiclesClient initialClasses={vehicleClasses} />
}
