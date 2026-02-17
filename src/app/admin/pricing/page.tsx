import { getPriceLists, getPackages, getVehicleClasses, checkUserRole } from '@/app/actions/admin'
import { PricingClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

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
