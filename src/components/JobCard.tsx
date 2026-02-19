'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Job, VEHICLE_CLASS_LABELS } from '@/types'
import { Clock, Archive, CreditCard, AlertTriangle, UserCheck, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PaymentModal } from './PaymentModal'
import { JobDetailsDrawer } from './JobDetailsDrawer'
import { archiveJob, claimJob } from '@/app/actions/jobs'
import { useBranch } from '@/contexts/BranchContext'

interface JobCardProps {
    job: Job
}

export function JobCard({ job }: JobCardProps) {
    const router = useRouter()
    const { userId, userRole } = useBranch()
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showDrawer, setShowDrawer] = useState(false)
    const [isArchiving, setIsArchiving] = useState(false)
    const [isClaiming, setIsClaiming] = useState(false)

    // Staff can only drag jobs assigned to them; managers+ can drag any
    const canDrag = userRole === 'staff' ? job.assigned_to === userId : true

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
        disabled: !canDrag,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const timeElapsed = '10dk'

    async function handleArchive(e: React.MouseEvent) {
        e.stopPropagation()
        setIsArchiving(true)
        await archiveJob(job.id)
        setIsArchiving(false)
    }

    async function handleClaim(e: React.MouseEvent) {
        e.stopPropagation()
        if (job.status !== 'queue' || job.assigned_to) return
        setIsClaiming(true)
        const result = await claimJob(job.id)
        setIsClaiming(false)
        if (result?.error) {
            alert(result.error)
            return
        }
        router.refresh()
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
    const vehicleClassLabel = job.cars?.vehicle_class ? VEHICLE_CLASS_LABELS[job.cars.vehicle_class] : null

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={cn(
                    "bg-zinc-800 p-4 rounded-xl border border-zinc-700 hover:border-zinc-600",
                    canDrag && "cursor-grab active:cursor-grabbing",
                    "shadow-sm flex flex-col gap-2 group relative",
                    "touch-none"
                )}
                onDoubleClick={() => setShowDrawer(true)}
            >
                {/* Row 1: Plate + Time */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black tracking-wider text-white">
                            {job.plate_number}
                        </span>
                        {job.cars?.has_damage && (
                            <span title="Hasar">
                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {job.assigned_staff && (
                            <span
                                className={cn(
                                    "text-xs px-2 py-1 rounded font-medium flex items-center gap-1",
                                    job.assigned_to === userId
                                        ? "bg-emerald-900/40 text-emerald-400"
                                        : "bg-zinc-700 text-zinc-300"
                                )}
                                title={job.assigned_to === userId ? 'Sizin işiniz' : job.assigned_staff.full_name}
                            >
                                {job.assigned_to === userId ? (
                                    <><User className="w-3 h-3" /> Sizin</>
                                ) : (
                                    <><User className="w-3 h-3" /> {job.assigned_staff.full_name}</>
                                )}
                            </span>
                        )}
                        <div className="flex items-center text-xs text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded">
                            <Clock className="w-3 h-3 mr-1" />
                            {timeElapsed}
                        </div>
                    </div>
                </div>

                {/* Row 2: Service + Price + Vehicle Class */}
                <div className="text-sm text-zinc-400 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {vehicleClassLabel && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-medium uppercase tracking-wide">
                                {vehicleClassLabel}
                            </span>
                        )}
                        {job.cars?.color && (
                            <span className="text-[10px] text-zinc-500">{job.cars.color}</span>
                        )}
                    </div>
                    <span className="font-mono text-zinc-500">₺{job.price ?? job.services?.price ?? 0}</span>
                </div>

                <div className="text-sm text-zinc-400">
                    {job.services?.name || 'Bilinmeyen Hizmet'}
                </div>

                {/* Row 3: Status + Actions */}
                <div className="mt-1 flex justify-between items-center">
                    <span className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-medium",
                        job.payment_status === 'paid'
                            ? "bg-green-900/30 text-green-400"
                            : "bg-yellow-900/30 text-yellow-400"
                    )}>
                        {job.payment_status === 'paid' ? 'ÖDENDİ' : 'BEKLİYOR'}
                    </span>

                    <div className="flex gap-2">
                        {job.status === 'queue' && !job.assigned_to && userId && (
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={handleClaim}
                                disabled={isClaiming}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
                                    "min-h-[44px] min-w-[44px]",
                                    "bg-emerald-600/20 text-emerald-400",
                                    "hover:bg-emerald-600 hover:text-white",
                                    "active:bg-emerald-700 active:scale-95",
                                    "transition-all",
                                    isClaiming && "opacity-50 cursor-not-allowed"
                                )}
                                title="İşi bana al"
                            >
                                <UserCheck className="w-4 h-4" />
                                <span className="hidden sm:inline">{isClaiming ? '...' : 'İşi Al'}</span>
                            </button>
                        )}
                        {hasActions && (
                            <>
                                {job.payment_status === 'pending' && (
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setShowPaymentModal(true)
                                    }}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
                                        "min-h-[44px] min-w-[44px]",
                                        "bg-brand/20 text-brand",
                                        "hover:bg-brand hover:text-white",
                                        "active:bg-brand-hover active:scale-95",
                                        "transition-all"
                                    )}
                                    title="Ödeme Al"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    <span className="hidden sm:inline">Öde</span>
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
                                    title="Arşivle"
                                >
                                    <Archive className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                        {isArchiving ? '...' : 'Bitti'}
                                    </span>
                                </button>
                            )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <PaymentModal
                job={job}
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
            />

            <JobDetailsDrawer
                isOpen={showDrawer}
                onClose={() => setShowDrawer(false)}
                jobId={job.id}
                car={job.cars || null}
                customer={job.customers || null}
            />
        </>
    )
}
