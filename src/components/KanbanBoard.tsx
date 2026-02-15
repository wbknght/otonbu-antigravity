'use client'

import { useState, useEffect } from 'react'
import {
    DndContext,
    DragOverlay,
    useSensors,
    useSensor,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Job, JobStatus, KANBAN_COLUMNS } from '@/types'
import { KanbanColumn } from './KanbanColumn'
import { JobCard } from './JobCard'
import { updateJobStatus } from '@/app/actions/jobs'
// import { createPortal } from 'react-dom' // Next.js hydration issues sometimes with portals, using inline for simple overlay

interface KanbanBoardProps {
    initialJobs: Job[]
}

export function KanbanBoard({ initialJobs }: KanbanBoardProps) {
    const [jobs, setJobs] = useState<Job[]>(initialJobs)
    const [activeJob, setActiveJob] = useState<Job | null>(null)

    useEffect(() => {
        setJobs(initialJobs)
    }, [initialJobs])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Prevent accidental drags
            },
        })
    )

    function onDragStart(event: DragStartEvent) {
        if (event.active.data.current?.type === 'Job') {
            setActiveJob(event.active.data.current.job as Job)
        }
    }

    function onDragOver(event: DragOverEvent) {
        // Optional: Handle optimizing visual reordering while dragging
        // For simplified columns, we just let drop handle the status change
    }

    async function onDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (!over) {
            setActiveJob(null)
            return
        }

        const activeJobId = active.id as string
        const activeJob = jobs.find(j => j.id === activeJobId)

        // Determine target container (column ID)
        // If dropped on a container directly (droppable), over.id is the container ID
        // If dropped on an item (sortable), over.data.current.sortable.containerId is the container ID
        let overContainerId = over.id as JobStatus

        // Check if over is actually another item
        if (over.data.current?.type === 'Job') {
            // Optimization: We could find the container of the item, 
            // but since we render columns as droppables, and sortable context inside,
            // dnd-kit can be tricky. 
            // SIMPLIFICATION:
            // For v1, we assume columns are defined as IDs. 
            // If dropped on an item, we need to know which column that item belongs to.
            const overJob = jobs.find(j => j.id === over.id)
            if (overJob) {
                overContainerId = overJob.status
            }
        }

        if (!activeJob || activeJob.status === overContainerId) {
            setActiveJob(null)
            return
        }

        // Optimistic Update
        const oldStatus = activeJob.status
        const targetStatus = overContainerId

        // Move logic
        setJobs((items) => {
            return items.map(item => {
                if (item.id === activeJobId) {
                    return { ...item, status: targetStatus }
                }
                return item
            })
        })

        setActiveJob(null)

        // Server Action
        try {
            await updateJobStatus(activeJobId, targetStatus)
        } catch (error) {
            // Rollback on error
            console.error("Failed to update", error)
            setJobs((items) => {
                return items.map(item => {
                    if (item.id === activeJobId) {
                        return { ...item, status: oldStatus }
                    }
                    return item
                })
            })
            alert("Failed to move job. Please try again.")
        }
    }

    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return (
            <div className="flex gap-4 h-[calc(100vh-140px)] overflow-x-auto pb-4">
                {KANBAN_COLUMNS.map((col) => (
                    <div key={col.id} className="flex flex-col h-full flex-1 min-w-[260px] bg-zinc-900/50 rounded-xl border border-zinc-800">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="font-semibold text-zinc-100">{col.title}</h3>
                            <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded-full">
                                {jobs.filter(j => j.status === col.id).length}
                            </span>
                        </div>
                        <div className="flex-1 p-3 overflow-y-auto">
                            <div className="flex flex-col gap-3 min-h-[100px]">
                                {jobs.filter(j => j.status === col.id).map((job) => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    const hasJobs = jobs.length > 0

    if (!hasJobs) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
                <div className="bg-zinc-900 p-8 rounded-full mb-4">
                    <div className="w-16 h-16 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
                </div>
                <p>Loading board or no active jobs...</p>
                <p className="text-xs mt-2 text-zinc-600">Create a job to get started.</p>
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
        >
            <div className="flex gap-4 h-[calc(100vh-140px)] overflow-x-auto pb-4">
                {KANBAN_COLUMNS.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        jobs={jobs.filter(j => j.status === col.id)}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeJob ? <JobCard job={activeJob} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
