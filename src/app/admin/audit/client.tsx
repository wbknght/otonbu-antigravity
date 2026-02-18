'use client'

import { useState, useTransition } from 'react'
import { ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'
import { formatDateTime } from '@/lib/i18n/format'
import { getAuditLog } from '@/app/actions/admin'

interface AuditEntry {
    id: string
    user_email: string | null
    action: string
    table_name: string
    record_id: string | null
    old_data: any
    new_data: any
    created_at: string
}

const actionColors: Record<string, string> = {
    CREATE: 'bg-green-900/30 text-green-400',
    UPDATE: 'bg-blue-900/30 text-blue-400',
    DELETE: 'bg-red-900/30 text-red-400',
    TOGGLE: 'bg-yellow-900/30 text-yellow-400',
    SET_ITEMS: 'bg-purple-900/30 text-purple-400',
}

export function AuditClient({
    initialLogs,
    totalCount,
    branchId,
}: {
    initialLogs: AuditEntry[]
    totalCount: number
    branchId?: string
}) {
    const [logs, setLogs] = useState(initialLogs)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [page, setPage] = useState(0)
    const [isPending, startTransition] = useTransition()
    const pageSize = 50

    function loadMore() {
        const nextPage = page + 1
        startTransition(async () => {
            const result = await getAuditLog(pageSize, nextPage * pageSize, branchId)
            setLogs(prev => [...prev, ...(result.data as AuditEntry[])])
            setPage(nextPage)
        })
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <ClipboardList className="w-6 h-6 text-zinc-400" />
                <h1 className="text-2xl font-bold text-white">{tr.audit.title}</h1>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">{totalCount} kayıt</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/50 text-zinc-300 border-b border-zinc-800 text-xs uppercase font-medium">
                        <tr>
                            <th className="px-4 py-3 w-8"></th>
                            <th className="px-4 py-3">{tr.audit.time}</th>
                            <th className="px-4 py-3">{tr.audit.user}</th>
                            <th className="px-4 py-3">{tr.audit.action}</th>
                            <th className="px-4 py-3">{tr.audit.table}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {logs.map(entry => (
                            <>
                                <tr
                                    key={entry.id}
                                    className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                                >
                                    <td className="px-4 py-3 text-zinc-500">
                                        {expanded === entry.id
                                            ? <ChevronDown className="w-3.5 h-3.5" />
                                            : <ChevronRight className="w-3.5 h-3.5" />
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-zinc-400 text-xs font-mono whitespace-nowrap">
                                        {formatDateTime(entry.created_at)}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-300 text-xs">{entry.user_email || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            'text-[10px] px-2 py-0.5 rounded font-medium',
                                            actionColors[entry.action] || 'bg-zinc-700/50 text-zinc-400'
                                        )}>
                                            {entry.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{entry.table_name}</td>
                                </tr>
                                {expanded === entry.id && (
                                    <tr key={`${entry.id}-detail`}>
                                        <td colSpan={5} className="px-6 py-4 bg-zinc-800/20">
                                            <div className="text-xs space-y-2">
                                                {entry.record_id && (
                                                    <div>
                                                        <span className="text-zinc-500">Kayıt ID: </span>
                                                        <span className="text-zinc-300 font-mono">{entry.record_id}</span>
                                                    </div>
                                                )}
                                                {entry.new_data && (
                                                    <div>
                                                        <span className="text-zinc-500 block mb-1">Yeni Veri:</span>
                                                        <pre className="bg-zinc-800 rounded-lg px-3 py-2 text-zinc-300 overflow-x-auto text-[11px]">
                                                            {JSON.stringify(entry.new_data, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                                {entry.old_data && (
                                                    <div>
                                                        <span className="text-zinc-500 block mb-1">Eski Veri:</span>
                                                        <pre className="bg-zinc-800 rounded-lg px-3 py-2 text-zinc-300 overflow-x-auto text-[11px]">
                                                            {JSON.stringify(entry.old_data, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>

                {/* Load More */}
                {logs.length < totalCount && (
                    <div className="border-t border-zinc-800 px-4 py-3 text-center">
                        <button
                            onClick={loadMore}
                            disabled={isPending}
                            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                        >
                            {isPending ? tr.common.loading : `Daha fazla yükle (${totalCount - logs.length} kalan)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
