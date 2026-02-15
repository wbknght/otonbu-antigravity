'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createJob } from '@/app/actions/jobs'

interface AddJobProps {
    serviceTypes: { id: string; name: string }[]
}

export function AddJobButton({ serviceTypes }: AddJobProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [plate, setPlate] = useState('')
    const [serviceId, setServiceId] = useState(serviceTypes[0]?.id || '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const result = await createJob(plate, serviceId)

        setLoading(false)
        if (result.error) {
            setError(result.error)
        } else {
            setIsOpen(false)
            setPlate('')
            // Optional: reset serviceId or keep it
        }
    }

    return (
        <>
            <button
                onClick={() => { setIsOpen(true); setError(null); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-3 rounded-xl font-medium transition-all min-h-[48px] active:scale-95"
            >
                <Plus className="w-5 h-5" />
                New Job
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-4">Add New Job</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded text-sm">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">
                                    Plate Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={plate}
                                    onChange={e => setPlate(e.target.value.toUpperCase())}
                                    placeholder="ABC-123"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 h-12 text-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">
                                    Service Type
                                </label>
                                <select
                                    value={serviceId}
                                    onChange={e => setServiceId(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 h-12 text-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {serviceTypes.map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-5 py-3 min-h-[48px] rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 active:bg-zinc-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 min-h-[48px] rounded-xl font-medium disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {loading ? 'Creating...' : 'Create Job'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
