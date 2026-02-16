import { getVehicleClasses } from '@/app/actions/admin'
import { VehiclesClient } from './client'

export const dynamic = 'force-dynamic'

export default async function VehiclesPage() {
    const { data: vehicleClasses } = await getVehicleClasses()
    return <VehiclesClient initialClasses={vehicleClasses} />
}
