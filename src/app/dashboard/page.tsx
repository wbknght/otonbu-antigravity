import { getJobs, getServiceTypes } from '@/app/actions/jobs'
import { KanbanBoard } from '@/components/KanbanBoard'
import { AddJobButton } from '@/components/AddJobButton'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const [jobs, serviceTypes] = await Promise.all([
        getJobs(),
        getServiceTypes()
    ])

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white">Panel</h1>
                <AddJobButton serviceTypes={serviceTypes} />
            </div>

            <div className="flex-1 min-h-0">
                <KanbanBoard initialJobs={jobs} />
            </div>
        </div>
    )
}
