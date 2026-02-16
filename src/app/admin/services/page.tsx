import { getServices } from '@/app/actions/admin'
import { ServicesClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
    const { data: services } = await getServices()
    return <ServicesClient initialServices={services} />
}
