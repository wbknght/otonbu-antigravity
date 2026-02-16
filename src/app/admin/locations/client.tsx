'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, MapPin, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'
import { FormModal } from '@/components/admin/FormModal'
import { upsertLocation } from '@/app/actions/admin'

interface Location {
    id: string
    name: string
    address: string | null
    phone: string | null
    is_active: boolean
}

const locationFields = [
    { key: 'name', label: tr.locations.name, type: 'text' as const, required: true, placeholder: 'Ana Şube' },
    { key: 'address', label: tr.locations.address, type: 'textarea' as const, placeholder: 'Cadde No:1, İlçe, İl' },
    { key: 'phone', label: tr.locations.phone, type: 'text' as const, placeholder: '0212 xxx xx xx' },
    { key: 'is_active', label: tr.common.active, type: 'checkbox' as const },
]

export function LocationsClient({ initialLocations }: { initialLocations: Location[] }) {
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Location | null>(null)

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">{tr.locations.title}</h1>
                <button
                    onClick={() => { setEditing(null); setModalOpen(true) }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    {tr.locations.addNew}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {initialLocations.map(loc => (
                    <div key={loc.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start gap-4">
                        <div className="bg-zinc-800 rounded-full p-3">
                            <MapPin className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-white">{loc.name}</span>
                                <span className={cn(
                                    'text-[10px] px-2 py-0.5 rounded-full font-medium',
                                    loc.is_active ? 'bg-green-900/30 text-green-400' : 'bg-zinc-700/50 text-zinc-500'
                                )}>
                                    {loc.is_active ? tr.common.active : tr.common.inactive}
                                </span>
                            </div>
                            {loc.address && <div className="text-xs text-zinc-500">{loc.address}</div>}
                            {loc.phone && <div className="text-xs text-zinc-500 mt-0.5">{loc.phone}</div>}
                        </div>
                        <button
                            onClick={() => { setEditing(loc); setModalOpen(true) }}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {initialLocations.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-zinc-500">{tr.common.noData}</div>
                )}
            </div>

            <FormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? tr.locations.edit : tr.locations.addNew}
                fields={locationFields}
                initialData={editing || { is_active: true }}
                onSubmit={async (data) => upsertLocation({
                    id: editing?.id,
                    name: data.name,
                    address: data.address,
                    phone: data.phone,
                    is_active: data.is_active,
                })}
            />
        </div>
    )
}
