'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Search, ToggleLeft, ToggleRight, Trash2, Package, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'
import { FormModal } from '@/components/admin/FormModal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { upsertPackage, setPackageItems, togglePackageActive, deletePackage } from '@/app/actions/admin'
import { useBranch } from '@/contexts/BranchContext'

interface Service {
    id: string
    name: string
}

interface PackageItem {
    id: string
    service_id: string
    is_base: boolean
    sort_order: number
    services: { id: string; name: string }
}

interface PackageData {
    id: string
    name: string
    description: string | null
    is_active: boolean
    sort_order: number
    package_items: PackageItem[]
}

const packageFields = [
    { key: 'name', label: tr.packages.name, type: 'text' as const, required: true, placeholder: 'Premium Yıkama' },
    { key: 'description', label: tr.packages.description, type: 'textarea' as const, placeholder: 'Paket açıklaması...' },
    { key: 'sort_order', label: tr.common.sortOrder, type: 'number' as const, placeholder: '0' },
    { key: 'is_active', label: tr.common.active, type: 'checkbox' as const },
]

export function PackagesClient({ initialPackages, services }: { initialPackages: PackageData[]; services: Service[] }) {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<PackageData | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<PackageData | null>(null)
    const [itemsEditing, setItemsEditing] = useState<PackageData | null>(null)
    const [selectedItems, setSelectedItems] = useState<{ service_id: string; is_base: boolean }[]>([])
    const { currentBranch } = useBranch()
    const [isPending, startTransition] = useTransition()

    const filtered = initialPackages.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'all' || (filter === 'active' ? p.is_active : !p.is_active)
        return matchSearch && matchFilter
    })

    function openCreate() {
        setEditing(null)
        setModalOpen(true)
    }

    function openEdit(pkg: PackageData) {
        setEditing(pkg)
        setModalOpen(true)
    }

    function openItems(pkg: PackageData) {
        setItemsEditing(pkg)
        setSelectedItems(
            pkg.package_items.map(pi => ({
                service_id: pi.service_id,
                is_base: pi.is_base,
            }))
        )
    }

    function toggleItem(serviceId: string) {
        setSelectedItems(prev => {
            const exists = prev.find(i => i.service_id === serviceId)
            if (exists) return prev.filter(i => i.service_id !== serviceId)
            return [...prev, { service_id: serviceId, is_base: prev.length === 0 }]
        })
    }

    function setBase(serviceId: string) {
        setSelectedItems(prev => prev.map(i => ({
            ...i,
            is_base: i.service_id === serviceId,
        })))
    }

    function saveItems() {
        if (!itemsEditing) return
        startTransition(async () => {
            const items = selectedItems.map((item, idx) => ({
                ...item,
                sort_order: idx,
            }))
            await setPackageItems(itemsEditing.id, items)
            setItemsEditing(null)
        })
    }

    function handleToggle(pkg: PackageData) {
        startTransition(async () => {
            await togglePackageActive(pkg.id, !pkg.is_active)
        })
    }

    function handleDelete() {
        if (!confirmDelete) return
        startTransition(async () => {
            await deletePackage(confirmDelete.id)
            setConfirmDelete(null)
        })
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">{tr.packages.title}</h1>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    {tr.packages.addNew}
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
                                filter === f ? 'bg-blue-600/30 text-blue-300' : 'text-zinc-400 hover:text-white'
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
                            <th className="px-6 py-3">{tr.packages.name}</th>
                            <th className="px-6 py-3">{tr.packages.items}</th>
                            <th className="px-6 py-3">Durum</th>
                            <th className="px-6 py-3 text-right">{tr.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filtered.map(pkg => (
                            <tr key={pkg.id} className="hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{pkg.name}</div>
                                    {pkg.description && (
                                        <div className="text-xs text-zinc-500 mt-0.5">{pkg.description}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {pkg.package_items.length === 0 ? (
                                            <button
                                                onClick={() => openItems(pkg)}
                                                className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                                            >
                                                + Hizmet ekle
                                            </button>
                                        ) : (
                                            <>
                                                {pkg.package_items.map(pi => (
                                                    <span
                                                        key={pi.id}
                                                        className={cn(
                                                            'text-[10px] px-2 py-0.5 rounded font-medium flex items-center gap-1',
                                                            pi.is_base
                                                                ? 'bg-blue-900/40 text-blue-300 border border-blue-800/50'
                                                                : 'bg-zinc-700/50 text-zinc-400'
                                                        )}
                                                    >
                                                        {pi.services.name}
                                                    </span>
                                                ))}
                                                <button
                                                    onClick={() => openItems(pkg)}
                                                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 hover:text-blue-400 hover:bg-zinc-700 transition-colors"
                                                >
                                                    + Ekle
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        'text-xs px-2 py-1 rounded-full font-medium',
                                        pkg.is_active ? 'bg-green-900/30 text-green-400' : 'bg-zinc-700/50 text-zinc-500'
                                    )}>
                                        {pkg.is_active ? tr.common.active : tr.common.inactive}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            onClick={() => openItems(pkg)}
                                            className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 rounded-lg transition-all"
                                            title={tr.packages.items}
                                        >
                                            <Wrench className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => openEdit(pkg)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                                            title={tr.common.edit}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleToggle(pkg)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                                        >
                                            {pkg.is_active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(pkg)}
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
                                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">{tr.common.noData}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Package Items Editor Modal */}
            {itemsEditing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-1">{itemsEditing.name}</h3>
                        <p className="text-sm text-zinc-500 mb-4">Pakete eklemek istediğiniz hizmetleri seçin. "Ana Hizmet" müşteriye gösterilen temel hizmettir.</p>

                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {services.filter(s => (s as any).is_active !== false).map(svc => {
                                const selected = selectedItems.find(i => i.service_id === svc.id)
                                return (
                                    <div
                                        key={svc.id}
                                        className={cn(
                                            'flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all',
                                            selected
                                                ? 'bg-blue-600/10 border-blue-500/30'
                                                : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                                        )}
                                        onClick={() => toggleItem(svc.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={!!selected}
                                                onChange={() => { }}
                                                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500"
                                            />
                                            <span className="text-sm text-white">{svc.name}</span>
                                        </div>
                                        {selected && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBase(svc.id) }}
                                                className={cn(
                                                    'text-[10px] px-2 py-1 rounded font-medium transition-all',
                                                    selected.is_base
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                                                )}
                                            >
                                                {selected.is_base ? '★ Ana Hizmet' : 'Ana Yap'}
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setItemsEditing(null)}
                                className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                            >
                                {tr.common.cancel}
                            </button>
                            <button
                                onClick={saveItems}
                                disabled={isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium disabled:opacity-50 transition-all"
                            >
                                {isPending ? tr.common.saving : tr.common.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            <FormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? tr.packages.edit : tr.packages.addNew}
                fields={packageFields}
                initialData={editing || { is_active: true, sort_order: 0 }}
                onSubmit={async (data) => {
                    const branchId = currentBranch?.id
                    if (!branchId) return { error: 'Önce bir şube seçmeniz gerekiyor' }
                    return upsertPackage({
                        id: editing?.id,
                        name: data.name,
                        description: data.description,
                        is_active: data.is_active,
                        sort_order: data.sort_order,
                        branch_id: branchId,
                    })
                }}
            />

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title={tr.common.delete}
                message="Bu paketi silmek istediğinize emin misiniz? İlişkili fiyat kuralları da silinecektir."
                confirmLabel={tr.common.delete}
                loading={isPending}
            />
        </div>
    )
}
