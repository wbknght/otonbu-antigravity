'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Search, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'
import { FormModal } from '@/components/admin/FormModal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { upsertVehicleClass, toggleVehicleClassActive } from '@/app/actions/admin'
import { useBranch } from '@/contexts/BranchContext'

interface VehicleClass {
    id: string
    key: string
    label: string
    sort_order: number
    is_active: boolean
}

const vehicleFields = [
    { key: 'key', label: tr.vehicles.key, type: 'text' as const, required: true, placeholder: 'suv' },
    { key: 'label', label: tr.vehicles.label, type: 'text' as const, required: true, placeholder: 'SUV' },
    { key: 'sort_order', label: tr.common.sortOrder, type: 'number' as const, placeholder: '0' },
    { key: 'is_active', label: tr.common.active, type: 'checkbox' as const },
]

export function VehiclesClient({ initialClasses }: { initialClasses: VehicleClass[] }) {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<VehicleClass | null>(null)
    const { currentBranch } = useBranch()
    const [isPending, startTransition] = useTransition()

    const filtered = initialClasses.filter(vc => {
        const matchSearch = vc.label.toLowerCase().includes(search.toLowerCase()) ||
            vc.key.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'all' || (filter === 'active' ? vc.is_active : !vc.is_active)
        return matchSearch && matchFilter
    })

    function openCreate() {
        setEditing(null)
        setModalOpen(true)
    }

    function openEdit(vc: VehicleClass) {
        setEditing(vc)
        setModalOpen(true)
    }

    function handleToggle(vc: VehicleClass) {
        startTransition(async () => {
            await toggleVehicleClassActive(vc.id, !vc.is_active)
        })
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">{tr.vehicles.title}</h1>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    {tr.vehicles.addNew}
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={tr.common.search}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
                    {(['all', 'active', 'inactive'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                'px-4 py-2 text-xs font-medium transition-all',
                                filter === f
                                    ? 'bg-blue-600/30 text-blue-300'
                                    : 'text-zinc-400 hover:text-white'
                            )}
                        >
                            {f === 'all' ? tr.common.all : f === 'active' ? tr.common.active : tr.common.inactive}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/50 text-zinc-300 border-b border-zinc-800 uppercase text-xs font-medium">
                        <tr>
                            <th className="px-6 py-3">{tr.vehicles.key}</th>
                            <th className="px-6 py-3">{tr.vehicles.label}</th>
                            <th className="px-6 py-3">{tr.common.sortOrder}</th>
                            <th className="px-6 py-3">Durum</th>
                            <th className="px-6 py-3 text-right">{tr.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filtered.map(vc => (
                            <tr key={vc.id} className="hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                                    {vc.key}
                                </td>
                                <td className="px-6 py-4 font-medium text-white">
                                    {vc.label}
                                </td>
                                <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                                    {vc.sort_order}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        'text-xs px-2 py-1 rounded-full font-medium',
                                        vc.is_active
                                            ? 'bg-green-900/30 text-green-400'
                                            : 'bg-zinc-700/50 text-zinc-500'
                                    )}>
                                        {vc.is_active ? tr.common.active : tr.common.inactive}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            onClick={() => openEdit(vc)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                                            title={tr.common.edit}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleToggle(vc)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                                            title={vc.is_active ? tr.vehicles.inactive : tr.vehicles.active}
                                        >
                                            {vc.is_active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">{tr.common.noData}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            <FormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? tr.vehicles.edit : tr.vehicles.addNew}
                fields={vehicleFields}
                initialData={editing || { is_active: true, sort_order: 0 }}
                onSubmit={async (data) => {
                    if (!currentBranch) return { error: 'Lütfen önce bir şube seçin' }
                    return upsertVehicleClass({
                        id: editing?.id,
                        key: data.key,
                        label: data.label,
                        is_active: data.is_active,
                        sort_order: data.sort_order,
                        branch_id: currentBranch.id,
                    })
                }}
            />
        </div>
    )
}
