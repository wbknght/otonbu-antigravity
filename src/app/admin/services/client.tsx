'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'
import { FormModal } from '@/components/admin/FormModal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { upsertService, toggleServiceAvailability, deleteService } from '@/app/actions/admin'
import { useBranch } from '@/contexts/BranchContext'

interface Service {
    id: string
    name: string
    description: string | null
    duration_min: number | null
    is_active: boolean
    sort_order: number
    branch_id: string | null
    effective_is_active?: boolean
}

const serviceFields = [
    { key: 'name', label: tr.services.name, type: 'text' as const, required: true, placeholder: 'Dış Yıkama' },
    { key: 'description', label: tr.services.description, type: 'textarea' as const, placeholder: 'Hizmet açıklaması...' },
    { key: 'duration_min', label: tr.services.duration, type: 'number' as const, placeholder: '30' },
    { key: 'sort_order', label: tr.common.sortOrder, type: 'number' as const, placeholder: '0' },
    { key: 'is_active', label: tr.common.active, type: 'checkbox' as const },
]

export function ServicesClient({ initialServices }: { initialServices: Service[] }) {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Service | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<Service | null>(null)
    const { currentBranch } = useBranch()
    const [isPending, startTransition] = useTransition()

    const filtered = initialServices.filter(s => {
        const isActive = s.effective_is_active ?? s.is_active
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'all' || (filter === 'active' ? isActive : !isActive)
        return matchSearch && matchFilter
    })

    function openCreate() {
        setEditing(null)
        setModalOpen(true)
    }

    function openEdit(service: Service) {
        setEditing(service)
        setModalOpen(true)
    }

    function handleToggle(service: Service) {
        if (!currentBranch) return
        startTransition(async () => {
            await toggleServiceAvailability(service.id, currentBranch.id, !(service.effective_is_active ?? service.is_active))
        })
    }

    function handleDelete() {
        if (!confirmDelete) return
        startTransition(async () => {
            await deleteService(confirmDelete.id)
            setConfirmDelete(null)
        })
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">{tr.services.title}</h1>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    {tr.services.addNew}
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
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand"
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
                                    ? 'bg-brand/30 text-brand'
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
                            <th className="px-6 py-3">{tr.services.name}</th>
                            <th className="px-6 py-3">{tr.services.duration}</th>
                            <th className="px-6 py-3">{tr.common.sortOrder}</th>
                            <th className="px-6 py-3">Durum</th>
                            <th className="px-6 py-3 text-right">{tr.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filtered.map(service => (
                            <tr key={service.id} className="hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{service.name}</div>
                                    {service.description && (
                                        <div className="text-xs text-zinc-500 mt-0.5">{service.description}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-zinc-400">
                                    {service.duration_min ? `${service.duration_min} dk` : '—'}
                                </td>
                                <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                                    {service.sort_order}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        'text-xs px-2 py-1 rounded-full font-medium',
                                        (service.effective_is_active ?? service.is_active)
                                            ? 'bg-green-900/30 text-green-400'
                                            : 'bg-zinc-700/50 text-zinc-500'
                                    )}>
                                        {(service.effective_is_active ?? service.is_active) ? tr.common.active : tr.common.inactive}
                                    </span>
                                    {!service.branch_id && (
                                        <span className="ml-2 text-xs px-2 py-1 rounded-full bg-brand/20 text-brand border border-brand/50">
                                            Evrensel
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            onClick={() => openEdit(service)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                                            title={tr.common.edit}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleToggle(service)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                                            title={service.is_active ? tr.services.inactive : tr.services.active}
                                        >
                                            {service.is_active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(service)}
                                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-all"
                                            title={tr.common.delete}
                                        >
                                            <Trash2 className="w-4 h-4" />
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
                title={editing ? tr.services.edit : tr.services.addNew}
                fields={serviceFields}
                initialData={editing ? {
                    ...editing,
                } : { is_active: true, sort_order: 0 }}
                onSubmit={async (data) => {
                    // Always try to create as Universal (branch_id: undefined)
                    // If user is Super Admin, it will be Global.
                    // If Branch Admin, backend will fallback to their branch (Private).

                    return upsertService({
                        id: editing?.id,
                        name: data.name,
                        description: data.description,
                        duration_min: data.duration_min,
                        is_active: data.is_active,
                        sort_order: data.sort_order,
                        branch_id: undefined, // Always attempt Universal
                    })
                }}
            />

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title={tr.common.delete}
                message={tr.services.confirmDelete}
                confirmLabel={tr.common.delete}
                loading={isPending}
            />
        </div>
    )
}
