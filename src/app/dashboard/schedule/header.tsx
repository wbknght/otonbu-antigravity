import { useState } from 'react'
import { Plus } from 'lucide-react'
import { BookAppointmentModal } from '@/components/BookAppointmentModal'
import { Service } from '@/types'

interface ScheduleHeaderProps {
    services: Service[]
}

export function ScheduleHeader({ services }: ScheduleHeaderProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
                    Randevular
                </h1>
                <p className="text-zinc-500 mt-1">Yaklaşan randevuları yönetin</p>
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold transition-colors"
            >
                <Plus className="w-5 h-5" />
                Randevu Al
            </button>

            <BookAppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                services={services}
            />
        </div>
    )
}
