'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Job } from '@/types'
import { Clock, Archive, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PaymentModal } from './PaymentModal'
import { archiveJob } from '@/app/actions/jobs'

interface JobCardProps {
    job: Job
}

export function JobCard({ job }: JobCardProps) {
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [isArchiving, setIsArchiving] = useState(false)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: job.id,
        data: {
            type: 'Job',
            job,
        },
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    // Calculate time elapsed (mock for now, could be real-time later)
    const timeElapsed = '10m'
    // TODO: Real formatting (use date-fns distanceToNow)

    async function handleArchive(e: React.MouseEvent) {
        e.stopPropagation() // Prevent drag
        if (!confirm('Are you sure you want to archive this job?')) return

        setIsArchiving(true)
        await archiveJob(job.id)
        setIsArchiving(false)
    }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 bg-zinc-800 p-4 rounded-lg border border-zinc-700 h-[120px]"
            />
        )
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={cn(
                    "bg-zinc-800 p-4 rounded-lg border border-zinc-700 hover:border-zinc-600 cursor-grab active:cursor-grabbing shadow-sm",
                    "flex flex-col gap-2 group relative"
                )}
            >
                <div className="flex justify-between items-start">
                    <span className="text-2xl font-black tracking-wider text-white">
                        {job.plate_number}
                    </span>
                    <div className="flex items-center text-xs text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded">
                        <Clock className="w-3 h-3 mr-1" />
                        {timeElapsed}
                    </div>
                </div>

                <div className="text-sm text-zinc-400 flex justify-between">
                    <span>{job.service_types?.name || 'Unknown Service'}</span>
                    <span className="font-mono text-zinc-500">${job.service_types?.price}</span>
                </div>

                <div className="mt-2 flex justify-between items-center">
                    <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        job.payment_status === 'paid'
                            ? "bg-green-900/30 text-green-400"
                            : "bg-yellow-900/30 text-yellow-400"
                    )}>
                        {job.payment_status.toUpperCase()}
                    </span>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {job.payment_status === 'pending' && (
                            <button
                                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowPaymentModal(true)
                                }}
                                className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-md transition-colors"
                                title="Record Payment"
                            >
                                <CreditCard className="w-4 h-4" />
                            </button>
                        )}

                        {job.payment_status === 'paid' && job.status === 'completed' && (
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={handleArchive}
                                disabled={isArchiving}
                                className="p-1.5 bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white rounded-md transition-colors"
                                title="Archive Job"
                            >
                                <Archive className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <PaymentModal
                job={job}
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
            />
        </>
    )
}
