import { getPriceLists, getPackages, getVehicleClasses, checkUserRole } from '@/app/actions/admin'
import { PricingClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
    searchParams: Promise<{ branch?: string }>
}

export default async function PricingPage({ searchParams }: Props) {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const params = await searchParams
    const branchId = params.branch

    const [{ data: priceLists }, { data: packages }, { data: vehicleClasses }] = await Promise.all([
        getPriceLists(branchId),
        getPackages(branchId),
        getVehicleClasses(branchId),
    ])
    return (
        <PricingClient
            initialPriceLists={priceLists}
            packages={packages}
            vehicleClasses={vehicleClasses}
            branchId={branchId}
        />
    )
}
