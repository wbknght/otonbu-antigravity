'use client'

import { useState } from 'react'
import { Job } from '@/types'
import { KanbanBoard } from '@/components/KanbanBoard'
import { AddJobButton } from '@/components/AddJobButton'
import { useBranch } from '@/contexts/BranchContext'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardContentProps {
    jobs: Job[]
    packages: { id: string; name: string; sort_order: number }[]
    vehicleClasses: { id: string; key: string; label: string }[]
}

export function DashboardContent({ jobs: allJobs, packages, vehicleClasses }: DashboardContentProps) {
    const { userId } = useBranch()
    const [showMyOnly, setShowMyOnly] = useState(false)

    const jobs = showMyOnly
        ? allJobs.filter(job => job.assigned_to === userId)
        : allJobs

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Panel</h1>
                    <button
                        onClick={() => setShowMyOnly(!showMyOnly)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            showMyOnly
                                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/50"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        {showMyOnly ? 'Sadece benim işlerim' : 'Tüm işler'}
                    </button>
                </div>
                <AddJobButton packages={packages} vehicleClasses={vehicleClasses} />
            </div>

            <div className="flex-1 min-h-0">
                <KanbanBoard initialJobs={jobs} />
            </div>
        </div>
    )
}