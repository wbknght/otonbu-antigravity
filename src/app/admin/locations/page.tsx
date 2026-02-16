import { getLocations } from '@/app/actions/admin'
import { LocationsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function LocationsPage() {
    const { data: locations } = await getLocations()
    return <LocationsClient initialLocations={locations} />
}
