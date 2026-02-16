import { getPriceLists, getPackages, getVehicleClasses } from '@/app/actions/admin'
import { PricingClient } from './client'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
    const [{ data: priceLists }, { data: packages }, { data: vehicleClasses }] = await Promise.all([
        getPriceLists(),
        getPackages(),
        getVehicleClasses(),
    ])
    return (
        <PricingClient
            initialPriceLists={priceLists}
            packages={packages}
            vehicleClasses={vehicleClasses}
        />
    )
}
