import { getJobs, getAvailableServices } from '@/app/actions/jobs'
import { DashboardContent } from './DashboardContent'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const [jobs, services] = await Promise.all([
        getJobs(),
        getAvailableServices()
    ])

    return <DashboardContent jobs={jobs} services={services} />
