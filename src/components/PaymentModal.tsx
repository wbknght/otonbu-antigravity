'use client'

import { useState } from 'react'
import { Job, PaymentMethod } from '@/types'
import { recordPayment } from '@/app/actions/jobs'
import { X, CreditCard, Banknote, Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentModalProps {
    job: Job
    isOpen: boolean
    onClose: () => void
}

export function PaymentModal({ job, isOpen, onClose }: PaymentModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [method, setMethod] = useState<PaymentMethod | null>(null)
    const [amount, setAmount] = useState<string>((job.price ?? job.services?.price ?? 0).toString())

    if (!isOpen) return null

    async function handlePayment() {
        if (!method) return

        setIsLoading(true)
        try {
            const result = await recordPayment(job.id, parseFloat(amount), method)
            if (result && 'error' in result) {
                alert(result.error)
            } else {
                onClose()
            }
        } catch (error) {
            console.error(error)
            alert('Ödeme başarısız')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Ödeme Al</h2>
                        <p className="text-sm text-zinc-400">{job.plate_number} • {job.services?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Tutar
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">₺</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-3 pl-8 pr-4 text-white text-xl font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Ödeme Yöntemi
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setMethod('cash')}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                                    method === 'cash'
                                        ? "bg-green-900/30 border-green-500 text-green-400"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                )}
                            >
                                <Banknote className="w-6 h-6" />
                                <span className="text-xs font-medium">Nakit</span>
                            </button>
                            <button
                                onClick={() => setMethod('card')}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                                    method === 'card'
                                        ? "bg-blue-900/30 border-blue-500 text-blue-400"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                )}
                            >
                                <CreditCard className="w-6 h-6" />
                                <span className="text-xs font-medium">Kart</span>
                            </button>
                            <button
                                onClick={() => setMethod('transfer')}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                                    method === 'transfer'
                                        ? "bg-purple-900/30 border-purple-500 text-purple-400"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                                )}
                            >
                                <Landmark className="w-6 h-6" />
                                <span className="text-xs font-medium">Havale</span>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handlePayment}
                        disabled={!method || isLoading}
                        className={cn(
                            "w-full py-4 rounded-lg font-bold text-lg transition-all",
                            method
                                ? "bg-white text-black hover:bg-zinc-200"
                                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? 'İşleniyor...' : 'Ödemeyi Onayla'}
                    </button>
                </div>
            </div>
        </div>
    )
}
