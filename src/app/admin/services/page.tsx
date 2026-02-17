import { getServices, checkUserRole } from '@/app/actions/admin'
import { ServicesClient } from './client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
    const userRole = await checkUserRole()
    if (userRole?.role !== 'super_admin') {
        redirect('/dashboard')
    }

    const { data: services } = await getServices()
    return <ServicesClient initialServices={services} />
}
