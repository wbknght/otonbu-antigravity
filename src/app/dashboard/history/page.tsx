import { getArchivedJobs } from '@/app/actions/jobs'
import { Clock, Calendar } from 'lucide-react'

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
                Job History
            </h1>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/50 text-zinc-200 border-b border-zinc-800 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Plate</th>
                                <th className="px-6 py-4">Service</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Completed At</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-white tracking-wider">
                                        {job.plate_number}
                                    </td>
                                    <td className="px-6 py-4">
                                        {job.service_types?.name}
                                    </td>
                                    <td className="px-6 py-4 font-mono">
                                        ${job.service_types?.price}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-zinc-500" />
                                            {job.closed_at ? new Date(job.closed_at).toLocaleDateString() : '-'}
                                            <Clock className="w-4 h-4 text-zinc-500 ml-2" />
                                            {job.closed_at ? new Date(job.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded-full text-xs font-medium border border-green-900/50">
                                            {job.payment_status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {jobs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                                        No archived jobs found.
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
