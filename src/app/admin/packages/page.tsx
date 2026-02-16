import { getPackages, getServices } from '@/app/actions/admin'
import { PackagesClient } from './client'

export const dynamic = 'force-dynamic'

export default async function PackagesPage() {
    const [{ data: packages }, { data: services }] = await Promise.all([
        getPackages(),
        getServices(),
    ])
    return <PackagesClient initialPackages={packages} services={services} />
}
