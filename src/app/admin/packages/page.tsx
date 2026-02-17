import { getPackages, getServices, checkUserRole } from '@/app/actions/admin'
import { PackagesClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PackagesPage() {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const [{ data: packages }, { data: services }] = await Promise.all([
        getPackages(),
        getServices(),
    ])
    return <PackagesClient initialPackages={packages} services={services} />
}
