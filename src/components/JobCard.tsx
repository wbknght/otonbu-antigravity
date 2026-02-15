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

    const timeElapsed = '10m'

    async function handleArchive(e: React.MouseEvent) {
        e.stopPropagation()
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

    const hasActions = job.payment_status === 'pending' || (job.payment_status === 'paid' && job.status === 'completed')

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={cn(
                    "bg-zinc-800 p-4 rounded-xl border border-zinc-700 hover:border-zinc-600",
                    "cursor-grab active:cursor-grabbing shadow-sm",
                    "flex flex-col gap-2 group relative",
                    "touch-none" // Prevent browser touch scroll when dragging
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

                <div className="mt-1 flex justify-between items-center">
                    <span className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-medium",
                        job.payment_status === 'paid'
                            ? "bg-green-900/30 text-green-400"
                            : "bg-yellow-900/30 text-yellow-400"
                    )}>
                        {job.payment_status.toUpperCase()}
                    </span>

                    {/* Always visible action buttons — no hover required for touch */}
                    {hasActions && (
                        <div className="flex gap-2">
                            {job.payment_status === 'pending' && (
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setShowPaymentModal(true)
                                    }}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
                                        "min-h-[44px] min-w-[44px]", // Apple HIG touch target
                                        "bg-blue-600/20 text-blue-400",
                                        "hover:bg-blue-600 hover:text-white",
                                        "active:bg-blue-700 active:scale-95",
                                        "transition-all"
                                    )}
                                    title="Record Payment"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    <span className="hidden sm:inline">Pay</span>
                                </button>
                            )}

                            {job.payment_status === 'paid' && job.status === 'completed' && (
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={handleArchive}
                                    disabled={isArchiving}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
                                        "min-h-[44px] min-w-[44px]",
                                        "bg-zinc-700 text-zinc-300",
                                        "hover:bg-zinc-600 hover:text-white",
                                        "active:bg-zinc-500 active:scale-95",
                                        "transition-all",
                                        isArchiving && "opacity-50 cursor-not-allowed"
                                    )}
                                    title="Archive Job"
                                >
                                    <Archive className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                        {isArchiving ? '...' : 'Done'}
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
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
