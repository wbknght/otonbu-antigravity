import { getArchivedJobs } from '@/app/actions/jobs'
import { Clock, Calendar } from 'lucide-react'
import { VEHICLE_CLASS_LABELS, VehicleClass } from '@/types'

export const dynamic = 'force-dynamic'

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const search = typeof params.search === 'string' ? params.search : undefined
    const jobs = await getArchivedJobs(search)

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500 mb-8">
                İş Geçmişi
            </h1>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/50 text-zinc-200 border-b border-zinc-800 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Plaka</th>
                                <th className="px-6 py-4">Araç</th>
                                <th className="px-6 py-4">Hizmet</th>
                                <th className="px-6 py-4">Ücret</th>
                                <th className="px-6 py-4">Tamamlanma</th>
                                <th className="px-6 py-4">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {jobs.map((job) => {
                                const vc = job.cars?.vehicle_class as VehicleClass | undefined
                                return (
                                    <tr key={job.id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-white tracking-wider">
                                            {job.plate_number}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {vc && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-medium uppercase">
                                                        {VEHICLE_CLASS_LABELS[vc]}
                                                    </span>
                                                )}
                                                {job.cars?.color && (
                                                    <span className="text-xs text-zinc-500">{job.cars.color}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {job.service_types?.name}
                                        </td>
                                        <td className="px-6 py-4 font-mono">
                                            ₺{job.service_types?.price}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-zinc-500" />
                                                {job.closed_at ? new Date(job.closed_at).toLocaleDateString('tr-TR') : '-'}
                                                <Clock className="w-4 h-4 text-zinc-500 ml-2" />
                                                {job.closed_at ? new Date(job.closed_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded-full text-xs font-medium border border-green-900/50">
                                                {job.payment_status === 'paid' ? 'ÖDENDİ' : job.payment_status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {jobs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                                        Arşivlenmiş iş bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
