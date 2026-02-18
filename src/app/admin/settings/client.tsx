'use client'

import { useState, useTransition } from 'react'
import { Settings, Save } from 'lucide-react'
import { tr } from '@/lib/i18n/tr'
import { updateSetting } from '@/app/actions/admin'
import { useBranch } from '@/contexts/BranchContext'

interface Setting {
    id: string
    key: string
    value: string
    description: string | null
}

const settingLabels: Record<string, string> = {
    default_currency: tr.settings.currency,
    default_locale: tr.settings.locale,
    timezone: tr.settings.timezone,
}

export function SettingsClient({ initialSettings, branchId }: { initialSettings: Setting[], branchId?: string }) {
    const [values, setValues] = useState<Record<string, string>>(
        Object.fromEntries(initialSettings.map(s => [s.key, s.value]))
    )
    const [saved, setSaved] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const { currentBranch } = useBranch()

    // Use URL branchId if available, otherwise fall back to context
    const activeBranchId = branchId || currentBranch?.id

    function handleSave(key: string) {
        startTransition(async () => {
            const result = await updateSetting(key, values[key], activeBranchId)
            if (!result.error) {
                setSaved(key)
                setTimeout(() => setSaved(null), 2000)
            }
        })
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-zinc-400" />
                <h1 className="text-2xl font-bold text-white">{tr.settings.title}</h1>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                {initialSettings.map(setting => (
                    <div key={setting.id} className="px-6 py-5">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-white">
                                {settingLabels[setting.key] || setting.key}
                            </label>
                            <button
                                onClick={() => handleSave(setting.key)}
                                disabled={isPending}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                            >
                                <Save className="w-3 h-3" />
                                {saved === setting.key ? '✓ Kaydedildi' : tr.common.save}
                            </button>
                        </div>
                        {setting.description && (
                            <p className="text-xs text-zinc-500 mb-2">{setting.description}</p>
                        )}
                        <input
                            type="text"
                            value={values[setting.key] || ''}
                            onChange={e => setValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
