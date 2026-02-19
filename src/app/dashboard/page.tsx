import { getJobs, getPackagesAndVehicleClasses } from '@/app/actions/jobs'
import { DashboardContent } from './DashboardContent'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const [jobs, { packages, vehicleClasses }] = await Promise.all([
        getJobs(),
        getPackagesAndVehicleClasses()
    ])

    return <DashboardContent jobs={jobs} packages={packages} vehicleClasses={vehicleClasses} />
}
