'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Job, JobStatus } from '@/types'
import { JobCard } from './JobCard'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
    id: JobStatus
    title: string
    jobs: Job[]
}

export function KanbanColumn({ id, title, jobs }: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({
        id: id,
    })

    return (
        <div className="flex flex-col h-full flex-1 min-w-[260px] bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded-full">
                    {jobs.length}
                </span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto">
                <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
                    <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[100px]">
                        {jobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    )
}
