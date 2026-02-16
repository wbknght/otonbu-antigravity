'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormModal } from '@/components/admin/FormModal'
import { upsertBranch } from '@/app/actions/admin'
import { Branch } from '@/types'

const branchFields = [
    { key: 'name', label: 'Şube Adı', type: 'text' as const, required: true, placeholder: 'Merkez Şube' },
    { key: 'address', label: 'Adres', type: 'text' as const, placeholder: 'Atatürk Cad. No: 123' },
    { key: 'timezone', label: 'Saat Dilimi', type: 'text' as const, placeholder: 'Europe/Istanbul' },
    { key: 'is_active', label: 'Aktif', type: 'checkbox' as const },
]

export function BranchesClient({ initialBranches }: { initialBranches: Branch[] }) {
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Branch | null>(null)
    const [isPending, startTransition] = useTransition()

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Şubeler</h1>
                <button
                    onClick={() => { setEditing(null); setModalOpen(true) }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Şube
                </button>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {initialBranches.map(branch => (
                    <div
                        key={branch.id}
                        className={cn(
                            'bg-zinc-900 border rounded-xl p-5 flex items-start gap-4 transition-all',
                            branch.is_active ? 'border-zinc-800' : 'border-zinc-800 opacity-60'
                        )}
                    >
                        <div className="bg-zinc-800 rounded-full p-3">
                            <Building2 className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-white truncate">{branch.name}</span>
                                <span className={cn(
                                    'text-[10px] px-2 py-0.5 rounded-full font-medium',
                                    branch.is_active ? 'bg-green-900/30 text-green-400' : 'bg-zinc-700/50 text-zinc-500'
                                )}>
                                    {branch.is_active ? 'Aktif' : 'Pasif'}
                                </span>
                            </div>
                            {branch.address && <div className="text-xs text-zinc-500">{branch.address}</div>}
                            <div className="text-xs text-zinc-600 mt-0.5">{branch.timezone}</div>
                        </div>
                        <button
                            onClick={() => { setEditing(branch); setModalOpen(true) }}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {initialBranches.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-zinc-500">Henüz şube yok</div>
                )}
            </div>

            {/* Modal */}
            <FormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Şubeyi Düzenle' : 'Yeni Şube'}
                fields={branchFields}
                initialData={editing || { timezone: 'Europe/Istanbul', is_active: true }}
                onSubmit={async (data) => upsertBranch({
                    id: editing?.id,
                    name: data.name,
                    address: data.address,
                    timezone: data.timezone,
                    is_active: data.is_active,
                })}
            />
        </div>
    )
}
