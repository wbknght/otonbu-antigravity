'use client'

import { useState } from 'react'
import { createAppointment } from '@/app/actions/appointments'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Service } from '@/types'

interface BookAppointmentModalProps {
    isOpen: boolean
    onClose: () => void
    services: Service[]
}

export function BookAppointmentModal({ isOpen, onClose, services }: BookAppointmentModalProps) {
    const [isLoading, setIsLoading] = useState(false)

    if (!isOpen) return null

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        try {
            const result = await createAppointment(formData)
            if (result && 'error' in result) {
                alert(result.error)
            } else {
                onClose()
            }
        } catch (error) {
            console.error(error)
            alert('Randevu oluşturulamadı')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Randevu Oluştur</h2>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Müşteri Adı
                        </label>
                        <input
                            name="customerName"
                            required
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-brand outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Telefon Numarası
                        </label>
                        <input
                            name="customerPhone"
                            type="tel"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-brand outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Plaka Numarası (İsteğe bağlı)
                        </label>
                        <input
                            name="plateNumber"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white uppercase font-mono focus:ring-2 focus:ring-brand outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Tarih ve Saat
                        </label>
                        <input
                            name="scheduledTime"
                            type="datetime-local"
                            required
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-brand outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Hizmet Türü
                        </label>
                        <select
                            name="serviceTypeId"
                            required
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-brand outline-none"
                        >
                            <option value="">Hizmet seçin...</option>
                            {services.map((st) => (
                                <option key={st.id} value={st.id}>
                                    {st.name} (₺{st.price})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 border-t border-zinc-800">
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                                type="checkbox"
                                name="isValet"
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-brand focus:ring-brand"
                            />
                            <span className="text-white font-medium">Vale Hizmeti İste</span>
                        </label>

                        <div className="pl-7">
                            <input
                                name="valetAddress"
                                placeholder="Alım Adresi (Vale seçildiyse)"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-brand outline-none text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={cn(
                            "w-full py-3 rounded-lg font-bold text-lg transition-all mt-4",
                            "bg-brand hover:bg-brand-hover text-white",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? 'Oluşturuluyor...' : 'Randevuyu Onayla'}
                    </button>
                </form>
            </div>
        </div>
    )
}
