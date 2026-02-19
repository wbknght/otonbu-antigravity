'use client'

import { useState } from 'react'
import { Appointment } from '@/types'
import { convertAppointmentToJob } from '@/app/actions/appointments'
import { Clock, Calendar, Car, Phone, ArrowRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppointmentListProps {
    appointments: Appointment[]
}

export function AppointmentList({ appointments }: AppointmentListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null)

    async function handleConvert(id: string) {
        setProcessingId(id)
        const result = await convertAppointmentToJob(id)
        setProcessingId(null)

        if (result && 'error' in result) {
            alert(result.error)
        } else if (result?.success) {
            window.location.href = '/dashboard'
        }
    }

    if (appointments.length === 0) {
        return (
            <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl">
                <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300">Yaklaşan randevu yok</h3>
                <p className="text-zinc-500">Başlamak için bir randevu oluşturun.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map((apt) => (
                <div
                    key={apt.id}
                    className={cn(
                        "bg-zinc-900 border p-4 rounded-xl flex flex-col gap-3 transition-colors",
                        apt.status === 'completed'
                            ? "border-green-900/30 opacity-75"
                            : "border-zinc-800 hover:border-zinc-700"
                    )}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-white">{apt.customer_name}</h3>
                            {apt.customer_phone && (
                                <div className="flex items-center text-xs text-zinc-500 mt-1">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {apt.customer_phone}
                                </div>
                            )}
                        </div>
                        <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium border",
                            apt.status === 'booked' ? "bg-brand/20 text-brand border-brand/50" :
                                apt.status === 'completed' ? "bg-green-900/20 text-green-400 border-green-900/50" :
                                    "bg-zinc-800 text-zinc-400 border-zinc-700"
                        )}>
                            {apt.status === 'booked' ? 'PLANLANDΙ' : apt.status === 'completed' ? 'TAMAMLANDI' : apt.status.toUpperCase()}
                        </span>
                    </div>

                    {apt.is_valet && (
                        <div className="bg-purple-900/20 border border-purple-900/50 p-2 rounded text-xs text-purple-300 flex items-start gap-2">
                            <span className="font-bold uppercase tracking-wider text-purple-400">Vale</span>
                            <span className="opacity-80 break-all">{apt.valet_address || 'Adres belirtilmedi'}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-800/50 p-2 rounded">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        {new Date(apt.scheduled_time).toLocaleDateString('tr-TR')}
                        <span className="text-zinc-600">|</span>
                        <Clock className="w-4 h-4 text-zinc-500" />
                        {new Date(apt.scheduled_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Car className="w-4 h-4" />
                            <span className="font-mono bg-zinc-950 px-1 py-0.5 rounded text-zinc-200">
                                {apt.plate_number || '---'}
                            </span>
                        </div>
                        <span className="text-zinc-500">{apt.services?.name}</span>
                    </div>

                    {apt.status === 'booked' && (
                        <button
                            onClick={() => handleConvert(apt.id)}
                            disabled={!!processingId}
                            className="mt-2 w-full flex items-center justify-center gap-2 bg-white text-black py-3 min-h-[52px] rounded-xl font-bold text-base hover:bg-zinc-200 active:bg-zinc-300 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {processingId === apt.id ? 'Başlatılıyor...' : (
                                <>
                                    Giriş Yap / İşi Başlat
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    )}

                    {apt.status === 'completed' && apt.converted_job_id && (
                        <div className="mt-2 text-center text-xs text-green-500 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            İşe Dönüştürüldü
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
