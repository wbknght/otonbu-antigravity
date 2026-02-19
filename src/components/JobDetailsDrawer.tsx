'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Car, Customer } from '@/types'
import { updateCarDetails, updateJobCustomer } from '@/app/actions/jobs'
import { cn } from '@/lib/utils'

interface JobDetailsDrawerProps {
    isOpen: boolean
    onClose: () => void
    jobId: string
    car: Car | null
    customer: Customer | null
}

export function JobDetailsDrawer({ isOpen, onClose, jobId, car, customer }: JobDetailsDrawerProps) {
    const [make, setMake] = useState(car?.make || '')
    const [model, setModel] = useState(car?.model || '')
    const [color, setColor] = useState(car?.color || '')
    const [notes, setNotes] = useState(car?.notes || '')
    const [hasDamage, setHasDamage] = useState(car?.has_damage || false)

    const [custName, setCustName] = useState(customer?.name || '')
    const [custEmail, setCustEmail] = useState(customer?.email || '')

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Reset fields when drawer opens with new data
    useEffect(() => {
        if (isOpen) {
            setMake(car?.make || '')
            setModel(car?.model || '')
            setColor(car?.color || '')
            setNotes(car?.notes || '')
            setHasDamage(car?.has_damage || false)
            setCustName(customer?.name || '')
            setCustEmail(customer?.email || '')
            setSaved(false)
        }
    }, [isOpen, car, customer])

    async function handleSave() {
        setSaving(true)
        setSaved(false)

        const promises: Promise<any>[] = []

        if (car?.id) {
            promises.push(updateCarDetails(car.id, {
                make: make || undefined,
                model: model || undefined,
                color: color || undefined,
                notes: notes || undefined,
                has_damage: hasDamage,
            }))
        }

        if (custName || custEmail) {
            promises.push(updateJobCustomer(jobId, {
                name: custName || undefined,
                email: custEmail || undefined,
            }))
        }

        await Promise.all(promises)
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div>
                        <h2 className="text-lg font-bold text-white">Araç Detayları</h2>
                        <p className="text-sm text-zinc-500">{car?.plate_number}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Car Info Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                            Araç Bilgileri
                        </h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Marka</label>
                                    <input
                                        value={make}
                                        onChange={e => setMake(e.target.value)}
                                        placeholder="Toyota"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 focus:ring-2 focus:ring-brand outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Model</label>
                                    <input
                                        value={model}
                                        onChange={e => setModel(e.target.value)}
                                        placeholder="Corolla"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 focus:ring-2 focus:ring-brand outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Renk</label>
                                <input
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                    placeholder="Beyaz"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 focus:ring-2 focus:ring-brand outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Notlar</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Ek bilgi..."
                                    rows={3}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 focus:ring-2 focus:ring-brand outline-none resize-none"
                                />
                            </div>

                            <label className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                hasDamage
                                    ? "bg-orange-900/20 border-orange-500/50"
                                    : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={hasDamage}
                                    onChange={e => setHasDamage(e.target.checked)}
                                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-orange-500 focus:ring-orange-500"
                                />
                                <AlertTriangle className={cn("w-4 h-4", hasDamage ? "text-orange-400" : "text-zinc-500")} />
                                <span className={cn("font-medium", hasDamage ? "text-orange-300" : "text-zinc-400")}>
                                    Hasar var
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Customer Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                            Müşteri Bilgileri
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Ad Soyad</label>
                                <input
                                    value={custName}
                                    onChange={e => setCustName(e.target.value)}
                                    placeholder="Müşteri adı"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 focus:ring-2 focus:ring-brand outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">E-posta</label>
                                <input
                                    type="email"
                                    value={custEmail}
                                    onChange={e => setCustEmail(e.target.value)}
                                    placeholder="ornek@email.com"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 focus:ring-2 focus:ring-brand outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 font-medium transition-all min-h-[48px]"
                    >
                        Kapat
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={cn(
                            "flex-1 py-3 rounded-xl font-bold transition-all min-h-[48px]",
                            saved
                                ? "bg-green-600 text-white"
                                : "bg-brand hover:bg-brand-hover text-white active:scale-95",
                            saving && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {saving ? 'Kaydediliyor...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </>
    )
}
