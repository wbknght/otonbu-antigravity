'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'
import { formatMoney, parseToKurus } from '@/lib/i18n/format'
import { FormModal } from '@/components/admin/FormModal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
    upsertPriceList,
    getPriceRules,
    upsertPriceRule,
    deletePriceRule,
} from '@/app/actions/admin'
import { useBranch } from '@/contexts/BranchContext'

interface PriceList {
    id: string
    name: string
    valid_from: string | null
    valid_to: string | null
    is_active: boolean
}

interface PriceRule {
    id: string
    price_list_id: string
    package_id: string
    vehicle_class_id: string
    amount_krs: number
    currency: string
    packages: { id: string; name: string }
    vehicle_classes: { id: string; label: string }
}

interface Package {
    id: string
    name: string
}

interface VehicleClass {
    id: string
    key: string
    label: string
}

const priceListFields = [
    { key: 'name', label: 'Liste Adı', type: 'text' as const, required: true, placeholder: '2026 Standart Fiyatlar' },
    { key: 'valid_from', label: tr.pricing.validFrom, type: 'date' as const },
    { key: 'valid_to', label: tr.pricing.validTo, type: 'date' as const },
    { key: 'is_active', label: tr.common.active, type: 'checkbox' as const },
]

export function PricingClient({
    initialPriceLists,
    packages,
    vehicleClasses,
    branchId,
}: {
    initialPriceLists: PriceList[]
    packages: Package[]
    vehicleClasses: VehicleClass[]
    branchId?: string
}) {
    const [listModalOpen, setListModalOpen] = useState(false)
    const [editingList, setEditingList] = useState<PriceList | null>(null)
    const [expandedList, setExpandedList] = useState<string | null>(null)
    const [rules, setRules] = useState<PriceRule[]>([])
    const [rulesLoading, setRulesLoading] = useState(false)
    const [ruleModalOpen, setRuleModalOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<PriceRule | null>(null)
    const [confirmDeleteRule, setConfirmDeleteRule] = useState<PriceRule | null>(null)
    const { currentBranch } = useBranch()
    const [isPending, startTransition] = useTransition()

    // Use URL branchId if available, otherwise fall back to context
    const activeBranchId = branchId || currentBranch?.id

    // Rule form state
    const [rulePackageId, setRulePackageId] = useState('')
    const [ruleVcId, setRuleVcId] = useState('')
    const [ruleAmount, setRuleAmount] = useState('')
    const [ruleError, setRuleError] = useState<string | null>(null)

    async function toggleExpand(listId: string) {
        if (expandedList === listId) {
            setExpandedList(null)
            setRules([])
            return
        }
        setExpandedList(listId)
        setRulesLoading(true)
        const result = await getPriceRules(listId)
        setRules(result.data as PriceRule[])
        setRulesLoading(false)
    }

    function openRuleModal(rule?: PriceRule) {
        if (rule) {
            setEditingRule(rule)
            setRulePackageId(rule.package_id)
            setRuleVcId(rule.vehicle_class_id)
            setRuleAmount(String(rule.amount_krs / 100))
        } else {
            setEditingRule(null)
            setRulePackageId(packages[0]?.id || '')
            setRuleVcId(vehicleClasses[0]?.id || '')
            setRuleAmount('')
        }
        setRuleError(null)
        setRuleModalOpen(true)
    }

    async function saveRule() {
        if (!expandedList || !rulePackageId || !ruleVcId || !ruleAmount) {
            setRuleError('Tüm alanlar zorunludur')
            return
        }
        startTransition(async () => {
            const result = await upsertPriceRule({
                id: editingRule?.id,
                price_list_id: expandedList,
                package_id: rulePackageId,
                vehicle_class_id: ruleVcId,
                amount_krs: parseToKurus(ruleAmount),
            })
            if (result.error) {
                setRuleError(result.error)
            } else {
                setRuleModalOpen(false)
                // Refresh rules
                const refreshed = await getPriceRules(expandedList)
                setRules(refreshed.data as PriceRule[])
            }
        })
    }

    function handleDeleteRule() {
        if (!confirmDeleteRule || !expandedList) return
        startTransition(async () => {
            await deletePriceRule(confirmDeleteRule.id)
            setConfirmDeleteRule(null)
            const refreshed = await getPriceRules(expandedList)
            setRules(refreshed.data as PriceRule[])
        })
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">{tr.pricing.title}</h1>
                <button
                    onClick={() => { setEditingList(null); setListModalOpen(true) }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    {tr.pricing.addList}
                </button>
            </div>

            {/* Price Lists */}
            <div className="space-y-3">
                {initialPriceLists.map(pl => (
                    <div key={pl.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        {/* List Header */}
                        <div
                            className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                            onClick={() => toggleExpand(pl.id)}
                        >
                            <div className="flex items-center gap-3">
                                {expandedList === pl.id
                                    ? <ChevronDown className="w-4 h-4 text-zinc-500" />
                                    : <ChevronRight className="w-4 h-4 text-zinc-500" />
                                }
                                <div>
                                    <div className="font-medium text-white">{pl.name}</div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                        {pl.valid_from && pl.valid_to
                                            ? `${pl.valid_from} — ${pl.valid_to}`
                                            : pl.valid_from
                                                ? `${pl.valid_from} —`
                                                : pl.valid_to
                                                    ? `— ${pl.valid_to}`
                                                    : 'Tarih sınırı yok'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    'text-xs px-2 py-1 rounded-full font-medium',
                                    pl.is_active ? 'bg-green-900/30 text-green-400' : 'bg-zinc-700/50 text-zinc-500'
                                )}>
                                    {pl.is_active ? tr.common.active : tr.common.inactive}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingList(pl); setListModalOpen(true) }}
                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Rules Table */}
                        {expandedList === pl.id && (
                            <div className="border-t border-zinc-800">
                                <div className="px-6 py-3 flex items-center justify-between bg-zinc-800/30">
                                    <span className="text-xs font-medium text-zinc-400 uppercase">{tr.pricing.rules}</span>
                                    <button
                                        onClick={() => openRuleModal()}
                                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> {tr.pricing.addRule}
                                    </button>
                                </div>

                                {rulesLoading ? (
                                    <div className="px-6 py-4 text-center text-zinc-500 text-sm">{tr.common.loading}</div>
                                ) : rules.length === 0 ? (
                                    <div className="px-6 py-4 text-center text-zinc-500 text-sm">{tr.common.noData}</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="text-xs text-zinc-500 border-b border-zinc-800">
                                            <tr>
                                                <th className="px-6 py-2 text-left">Paket</th>
                                                <th className="px-6 py-2 text-left">Araç Sınıfı</th>
                                                <th className="px-6 py-2 text-right">{tr.pricing.amount}</th>
                                                <th className="px-6 py-2 text-right">{tr.common.actions}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/50">
                                            {rules.map(rule => (
                                                <tr key={rule.id} className="hover:bg-zinc-800/30 transition-colors">
                                                    <td className="px-6 py-3 text-white font-medium">{rule.packages?.name || '—'}</td>
                                                    <td className="px-6 py-3 text-zinc-400">{rule.vehicle_classes?.label || '—'}</td>
                                                    <td className="px-6 py-3 text-right text-white font-mono">{formatMoney(rule.amount_krs, rule.currency)}</td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex justify-end gap-1">
                                                            <button onClick={() => openRuleModal(rule)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg">
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => setConfirmDeleteRule(rule)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {initialPriceLists.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">{tr.common.noData}</div>
                )}
            </div>

            {/* Price List Modal */}
            <FormModal
                isOpen={listModalOpen}
                onClose={() => setListModalOpen(false)}
                title={editingList ? tr.pricing.editList : tr.pricing.addList}
                fields={priceListFields}
                initialData={editingList || { is_active: true }}
                onSubmit={async (data) => {
                    if (!activeBranchId) return { error: 'Lütfen önce bir şube seçin' }
                    return upsertPriceList({
                        id: editingList?.id,
                        name: data.name,
                        valid_from: data.valid_from,
                        valid_to: data.valid_to,
                        is_active: data.is_active,
                        branch_id: activeBranchId,
                    })
                }}
            />

            {/* Price Rule Modal (custom) */}
            {ruleModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {editingRule ? 'Kuralı Düzenle' : tr.pricing.addRule}
                        </h3>

                        {ruleError && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm mb-4">
                                {ruleError}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Paket</label>
                                <select
                                    value={rulePackageId}
                                    onChange={e => setRulePackageId(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {packages.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Araç Sınıfı</label>
                                <select
                                    value={ruleVcId}
                                    onChange={e => setRuleVcId(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {vehicleClasses.map(vc => (
                                        <option key={vc.id} value={vc.id}>{vc.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">{tr.pricing.amount} (₺)</label>
                                <input
                                    type="text"
                                    value={ruleAmount}
                                    onChange={e => setRuleAmount(e.target.value)}
                                    placeholder="150.00"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setRuleModalOpen(false)} className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800">
                                {tr.common.cancel}
                            </button>
                            <button onClick={saveRule} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium disabled:opacity-50">
                                {isPending ? tr.common.saving : tr.common.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Rule Confirm */}
            <ConfirmDialog
                isOpen={!!confirmDeleteRule}
                onClose={() => setConfirmDeleteRule(null)}
                onConfirm={handleDeleteRule}
                title={tr.common.delete}
                message="Bu fiyat kuralını silmek istediğinize emin misiniz?"
                confirmLabel={tr.common.delete}
                loading={isPending}
            />
        </div>
    )
}
