'use client'

import { useState, useEffect } from 'react'
import { StatsPeriod, BranchStats, WorkerStats, Branch } from '@/types'
import { getBranchStats, getWorkerStats } from '@/app/actions/stats'
import { useBranch } from '@/contexts/BranchContext'
import { BarChart3, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const PERIODS: { value: StatsPeriod; label: string }[] = [
    { value: 'last7days', label: 'Son 7 Gün' },
    { value: 'thisWeek', label: 'Bu Hafta' },
    { value: 'thisMonth', label: 'Bu Ay' },
    { value: 'lastMonth', label: 'Geçen Ay' },
    { value: 'all', label: 'Tüm Zamanlar' },
]

export function StatsClient({ initialBranch }: { initialBranch: Branch | null }) {
    const { currentBranch, branches, isSuperAdmin, userRole } = useBranch()
    const branch = currentBranch || initialBranch

    const [period, setPeriod] = useState<StatsPeriod>('thisMonth')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    const [selectedBranchId, setSelectedBranchId] = useState<string>(branch?.id || '')
    const [branchStats, setBranchStats] = useState<BranchStats | null>(null)
    const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null)
    const [loading, setLoading] = useState(true)

    // Determine which branch to query
    const targetBranchId = isSuperAdmin ? selectedBranchId : (branch?.id || '')

    useEffect(() => {
        async function fetchStats() {
            if (!targetBranchId) return
            setLoading(true)

            const customRange = period === 'custom' && customStart && customEnd
                ? { start: customStart, end: customEnd }
                : undefined

            const [branchData, workerData] = await Promise.all([
                getBranchStats(targetBranchId, period, customRange),
                getWorkerStats(targetBranchId, period, customRange),
            ])

            setBranchStats(branchData)
            setWorkerStats(workerData)
            setLoading(false)
        }

        fetchStats()
    }, [targetBranchId, period, customStart, customEnd])

    if (!branch && !isSuperAdmin) {
        return <div className="text-zinc-400">Şube seçilmedi</div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">İstatistikler</h1>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Branch selector for super_admin */}
                    {isSuperAdmin && (
                        <select
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            className="bg-zinc-800 text-zinc-200 px-3 py-2 rounded-lg border border-zinc-700"
                        >
                            <option value="">Şube Seçin</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Period selector */}
                    <div className="flex flex-wrap gap-1 bg-zinc-800 p-1 rounded-lg">
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                                    period === p.value
                                        ? "bg-emerald-600 text-white"
                                        : "text-zinc-400 hover:text-white"
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom date inputs */}
                    {period === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="bg-zinc-800 text-zinc-200 px-2 py-1.5 rounded border border-zinc-700 text-sm"
                            />
                            <span className="text-zinc-500">-</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="bg-zinc-800 text-zinc-200 px-2 py-1.5 rounded border border-zinc-700 text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-zinc-400 text-center py-12">Yükleniyor...</div>
            ) : !targetBranchId ? (
                <div className="text-zinc-400 text-center py-12">İstatistikleri görüntülemek için şube seçin</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                                <BarChart3 className="w-4 h-4" />
                                Toplam İş
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {branchStats?.totalJobs || 0}
                            </div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                                <DollarSign className="w-4 h-4" />
                                Gelir
                            </div>
                            <div className="text-2xl font-bold text-emerald-400">
                                ₺{branchStats?.revenue?.toLocaleString('tr-TR') || 0}
                            </div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                                <TrendingUp className="w-4 h-4" />
                                Bekleyen Ödeme
                            </div>
                            <div className="text-2xl font-bold text-yellow-400">
                                ₺{branchStats?.pendingRevenue?.toLocaleString('tr-TR') || 0}
                            </div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                                <Calendar className="w-4 h-4" />
                                Ortalama Değer
                            </div>
                            <div className="text-2xl font-bold text-blue-400">
                                ₺{branchStats?.avgJobValue?.toFixed(0)?.toLocaleString('tr-TR') || 0}
                            </div>
                        </div>
                    </div>

                    {/* Branch Stats Tables */}
                    <div className="grid md:grid-cols-3 gap-4">
                        {/* By Brand */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <h3 className="font-semibold text-white mb-3">Markaya Göre</h3>
                            <div className="space-y-2">
                                {branchStats?.byBrand.length === 0 ? (
                                    <div className="text-zinc-500 text-sm">Veri yok</div>
                                ) : (
                                    branchStats?.byBrand.slice(0, 8).map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-zinc-300">{item.make}</span>
                                            <span className="text-zinc-500">{item.count}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* By Service */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <h3 className="font-semibold text-white mb-3">Servise Göre</h3>
                            <div className="space-y-2">
                                {branchStats?.byService.length === 0 ? (
                                    <div className="text-zinc-500 text-sm">Veri yok</div>
                                ) : (
                                    branchStats?.byService.slice(0, 8).map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-zinc-300">{item.name}</span>
                                            <span className="text-zinc-500">{item.count}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* By Vehicle Class */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <h3 className="font-semibold text-white mb-3">Araç Sınıfına Göre</h3>
                            <div className="space-y-2">
                                {branchStats?.byVehicleClass.length === 0 ? (
                                    <div className="text-zinc-500 text-sm">Veri yok</div>
                                ) : (
                                    branchStats?.byVehicleClass.map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-zinc-300">{item.class}</span>
                                            <span className="text-zinc-500">{item.count}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Worker Stats Table */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Personel Performansı
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-zinc-400 border-b border-zinc-800">
                                    <tr>
                                        <th className="pb-2 font-medium">Personel</th>
                                        <th className="pb-2 font-medium text-right">Aldığı İş</th>
                                        <th className="pb-2 font-medium text-right">Tamamladı</th>
                                        <th className="pb-2 font-medium text-right">Tamamlanma %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {workerStats?.workers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-4 text-center text-zinc-500">
                                                Veri yok
                                            </td>
                                        </tr>
                                    ) : (
                                        workerStats?.workers.map((worker) => (
                                            <tr key={worker.userId} className="hover:bg-zinc-800/50">
                                                <td className="py-3 text-zinc-200">{worker.fullName}</td>
                                                <td className="py-3 text-right text-zinc-400">{worker.claimed}</td>
                                                <td className="py-3 text-right text-zinc-400">{worker.completed}</td>
                                                <td className="py-3 text-right">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium",
                                                        worker.completionRate >= 80 ? "bg-emerald-900/30 text-emerald-400" :
                                                        worker.completionRate >= 50 ? "bg-yellow-900/30 text-yellow-400" :
                                                        "bg-red-900/30 text-red-400"
                                                    )}>
                                                        {worker.completionRate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
