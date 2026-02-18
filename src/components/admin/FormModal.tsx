'use client'

import { useState, useEffect, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'

interface FormField {
    key: string
    label: string
    type: 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'password' | 'date'
    required?: boolean
    placeholder?: string
    options?: { value: string; label: string }[]
}

interface FormModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    fields: FormField[]
    initialData?: Record<string, any>
    onSubmit: (data: Record<string, any>) => Promise<{ error?: string; success?: boolean }>
}

export function FormModal({ isOpen, onClose, title, fields, initialData, onSubmit }: FormModalProps) {
    const [data, setData] = useState<Record<string, any>>({})
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        if (isOpen) {
            setData(initialData || {})
            setError(null)
        }
    }, [isOpen, initialData])

    function handleChange(key: string, value: any) {
        setData(prev => ({ ...prev, [key]: value }))
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        startTransition(async () => {
            const result = await onSubmit(data)
            if (result.error) {
                setError(result.error)
            } else {
                onClose()
            }
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2.5 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {fields.map((field) => (
                        <div key={field.key}>
                            {field.type === 'checkbox' ? (
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data[field.key] ?? false}
                                        onChange={e => handleChange(field.key, e.target.checked)}
                                        className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-zinc-300">{field.label}</span>
                                </label>
                            ) : (
                                <>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                        {field.label}
                                        {field.required && <span className="text-red-400 ml-1">*</span>}
                                    </label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            value={data[field.key] ?? ''}
                                            onChange={e => handleChange(field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            rows={3}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    ) : field.type === 'select' ? (
                                        <select
                                            value={data[field.key] ?? ''}
                                            onChange={e => handleChange(field.key, e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {field.options?.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type === 'date' ? 'date' : field.type}
                                            value={data[field.key] ?? ''}
                                            onChange={e => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                            placeholder={field.placeholder}
                                            required={field.required}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    ))}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                        >
                            {tr.common.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium disabled:opacity-50 transition-all"
                        >
                            {isPending ? tr.common.saving : tr.common.save}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
