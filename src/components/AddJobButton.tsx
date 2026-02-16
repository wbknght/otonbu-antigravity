'use client'

import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { createJob, lookupCarByPlate } from '@/app/actions/jobs'
import { VehicleClass, VEHICLE_CLASS_LABELS, Car } from '@/types'
import { cn } from '@/lib/utils'
import { useBranch } from '@/contexts/BranchContext'
import { JobDetailsDrawer } from './JobDetailsDrawer'

interface AddJobProps {
    serviceTypes: { id: string; name: string }[]
}

const VEHICLE_CLASSES: VehicleClass[] = ['small', 'sedan', 'suv', 'van', 'pickup', 'luxury']

export function AddJobButton({ serviceTypes }: AddJobProps) {
    const { currentBranch } = useBranch()
    const [isOpen, setIsOpen] = useState(false)
    const [plate, setPlate] = useState('')
    const [vehicleClass, setVehicleClass] = useState<VehicleClass | null>(null)
    const [serviceId, setServiceId] = useState(serviceTypes[0]?.id || '')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lookingUp, setLookingUp] = useState(false)
    const [prefilled, setPrefilled] = useState(false)

    // Step 2 drawer state
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [createdJobId, setCreatedJobId] = useState<string | null>(null)
    const [createdCar, setCreatedCar] = useState<Car | null>(null)
    const [createdCustomer, setCreatedCustomer] = useState<any>(null)

    // Auto-lookup car when plate changes (debounced)
    useEffect(() => {
        if (plate.length < 3) {
            setPrefilled(false)
            return
        }

        const timeout = setTimeout(async () => {
            setLookingUp(true)
            const result = await lookupCarByPlate(plate)
            if (result?.car) {
                setVehicleClass(result.car.vehicle_class)
                if (result.lastCustomer?.phone) {
                    setPhone(result.lastCustomer.phone)
                }
                setPrefilled(true)
            } else {
                setPrefilled(false)
            }
            setLookingUp(false)
        }, 500)

        return () => clearTimeout(timeout)
    }, [plate])

    function resetForm() {
        setPlate('')
        setVehicleClass(null)
        setServiceId(serviceTypes[0]?.id || '')
        setPhone('')
        setError(null)
        setPrefilled(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!vehicleClass) {
            setError('Araç sınıfı seçin')
            return
        }

        setLoading(true)
        setError(null)

        if (!currentBranch) {
            setError('Şube seçilmedi')
            setLoading(false)
            return
        }

        const result = await createJob(plate, serviceId, vehicleClass, phone || undefined, currentBranch.id)

        setLoading(false)

        if (result.error) {
            setError(result.error)
        } else if (result.success && result.job) {
            // Close Step 1, open Step 2
            setIsOpen(false)
            setCreatedJobId(result.job.id)
            setCreatedCar(result.job.cars || null)
            setCreatedCustomer(result.job.customers || null)
            setDrawerOpen(true)
            resetForm()
        }
    }

    return (
        <>
            <button
                onClick={() => { setIsOpen(true); setError(null); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-3 rounded-xl font-medium transition-all min-h-[48px] active:scale-95"
            >
                <Plus className="w-5 h-5" />
                Yeni İş
            </button>

            {/* Step 1: Quick Intake Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-1">Hızlı Giriş</h2>
                        <p className="text-sm text-zinc-500 mb-5">Zorunlu bilgileri girin, detayları sonra ekleyin</p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2.5 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Plate */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                    Plaka <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={plate}
                                        onChange={e => setPlate(e.target.value.toUpperCase())}
                                        placeholder="34 ABC 123"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 h-12 text-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                                    />
                                    {lookingUp && (
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-pulse" />
                                    )}
                                    {prefilled && !lookingUp && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400 font-medium">
                                            Tanındı ✓
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Vehicle Class */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                    Araç Sınıfı <span className="text-red-400">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {VEHICLE_CLASSES.map(vc => (
                                        <button
                                            key={vc}
                                            type="button"
                                            onClick={() => setVehicleClass(vc)}
                                            className={cn(
                                                "py-2.5 px-3 rounded-lg border text-sm font-medium transition-all min-h-[44px]",
                                                vehicleClass === vc
                                                    ? "bg-blue-600/30 border-blue-500 text-blue-300"
                                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                                            )}
                                        >
                                            {VEHICLE_CLASS_LABELS[vc]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Service Type */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                    Yıkama Türü <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={serviceId}
                                    onChange={e => setServiceId(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 h-12 text-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {serviceTypes.map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Phone (optional) */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                    Telefon <span className="text-zinc-600">(önerilen)</span>
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="05XX XXX XX XX"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 h-12 text-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsOpen(false); resetForm(); }}
                                    className="px-5 py-3 min-h-[48px] rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 active:bg-zinc-700 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 min-h-[48px] rounded-xl font-medium disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {loading ? 'Oluşturuluyor...' : 'İş Oluştur →'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Step 2: Details Drawer */}
            <JobDetailsDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                jobId={createdJobId || ''}
                car={createdCar}
                customer={createdCustomer}
            />
        </>
    )
}
