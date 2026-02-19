'use client'

import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { createJob, lookupCarByPlate } from '@/app/actions/jobs'
import { resolvePrice } from '@/lib/pricing'
import { Car } from '@/types'
import { cn } from '@/lib/utils'
import { useBranch } from '@/contexts/BranchContext'
import { JobDetailsDrawer } from './JobDetailsDrawer'

interface AddJobProps {
    packages: { id: string; name: string; sort_order: number }[]
    vehicleClasses: { id: string; key: string; label: string }[]
}

export function AddJobButton({ packages, vehicleClasses }: AddJobProps) {
    const { currentBranch } = useBranch()
    const [isOpen, setIsOpen] = useState(false)
    const [plate, setPlate] = useState('')
    const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.id || '')
    const [selectedVehicleClassId, setSelectedVehicleClassId] = useState(vehicleClasses[0]?.id || '')
    const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)
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

    // Auto-calculate price when package or vehicle class changes
    useEffect(() => {
        async function fetchPrice() {
            if (!selectedPackageId || !selectedVehicleClassId) {
                setCalculatedPrice(null)
                return
            }
            const result = await resolvePrice(selectedPackageId, selectedVehicleClassId)
            setCalculatedPrice(result.found ? result.amount_krs : null)
        }
        fetchPrice()
    }, [selectedPackageId, selectedVehicleClassId])

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
                // Try to match vehicle class from car
                const matchedVc = vehicleClasses.find(vc => vc.key === result.car.vehicle_class)
                if (matchedVc) {
                    setSelectedVehicleClassId(matchedVc.id)
                }
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
    }, [plate, vehicleClasses])

    function resetForm() {
        setPlate('')
        setSelectedPackageId(packages[0]?.id || '')
        setSelectedVehicleClassId(vehicleClasses[0]?.id || '')
        setCalculatedPrice(null)
        setPhone('')
        setError(null)
        setPrefilled(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!selectedPackageId || !selectedVehicleClassId) {
            setError('Paket ve araç sınıfı seçin')
            return
        }

        setLoading(true)
        setError(null)

        if (!currentBranch) {
            setError('Şube seçilmedi')
            setLoading(false)
            return
        }

        const result = await createJob(
            plate,
            selectedPackageId,
            selectedVehicleClassId,
            phone || undefined,
            currentBranch.id
        )

        setLoading(false)

        if (result.error) {
            setError(result.error)
        } else if (result.success && result.job) {
            setIsOpen(false)
            setCreatedJobId(result.job.id)
            setCreatedCar(result.job.cars || null)
            setCreatedCustomer(result.job.customers || null)
            setDrawerOpen(true)
            resetForm()
        }
    }

    if (!isOpen) {
        return (
            <>
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Yeni İş
                </button>

                {createdJobId && (
                    <JobDetailsDrawer
                        isOpen={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        jobId={createdJobId}
                        car={createdCar}
                        customer={createdCustomer}
                    />
                )}
            </>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-white mb-4">Yeni İş Ekle</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Plate */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Plaka
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={plate}
                                onChange={e => setPlate(e.target.value.toUpperCase())}
                                placeholder="34 ABC 123"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white uppercase tracking-wider font-mono"
                                autoFocus
                            />
                            {lookingUp && (
                                <Search className="absolute right-3 top-3.5 w-5 h-5 text-zinc-500 animate-pulse" />
                            )}
                        </div>
                    </div>

                    {/* Package */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Paket *
                        </label>
                        <select
                            value={selectedPackageId}
                            onChange={e => setSelectedPackageId(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white"
                            required
                        >
                            {packages.map(pkg => (
                                <option key={pkg.id} value={pkg.id}>
                                    {pkg.name}
                                </option>
                            ))}
                            {packages.length === 0 && (
                                <option value="">Paket bulunamadı</option>
                            )}
                        </select>
                    </div>

                    {/* Vehicle Class */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Araç Sınıfı *
                        </label>
                        <select
                            value={selectedVehicleClassId}
                            onChange={e => setSelectedVehicleClassId(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white"
                            required
                        >
                            {vehicleClasses.map(vc => (
                                <option key={vc.id} value={vc.id}>
                                    {vc.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Price Display */}
                    <div className="bg-zinc-800 rounded-lg p-4">
                        <div className="text-sm text-zinc-400 mb-1">Tahmini Fiyat</div>
                        <div className="text-2xl font-bold text-emerald-400">
                            {calculatedPrice !== null ? (
                                <>₺{calculatedPrice.toLocaleString('tr-TR')}</>
                            ) : (
                                <span className="text-zinc-500 text-lg">Fiyat belirlenemedi</span>
                            )}
                        </div>
                    </div>

                    {/* Phone (optional) */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Telefon (isteğe bağlı)
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="5xx xxx xx xx"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white"
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm bg-red-900/20 border border-red-900/50 rounded-lg p-3">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false)
                                resetForm()
                            }}
                            className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedPackageId || !selectedVehicleClassId}
                            className={cn(
                                "flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors",
                                (loading || !selectedPackageId || !selectedVehicleClassId) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {loading ? 'Ekleniyor...' : 'İş Ekle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
