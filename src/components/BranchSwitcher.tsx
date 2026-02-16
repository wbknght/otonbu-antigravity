'use client'

import { useBranch } from '@/contexts/BranchContext'
import { ChevronDown, Building2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function BranchSwitcher() {
    const { currentBranch, branches, isSuperAdmin, switchBranch } = useBranch()
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Only render for super_admin with multiple branches
    if (!isSuperAdmin || branches.length <= 1) {
        if (currentBranch) {
            return (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{currentBranch.name}</span>
                </div>
            )
        }
        return null
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full",
                    "bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600",
                    "text-zinc-200 transition-colors"
                )}
            >
                <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate flex-1 text-left">
                    {currentBranch?.name || 'Şube Seç'}
                </span>
                <ChevronDown className={cn(
                    "w-4 h-4 text-zinc-500 shrink-0 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {branches.map(branch => (
                        <button
                            key={branch.id}
                            onClick={() => {
                                switchBranch(branch)
                                setIsOpen(false)
                            }}
                            className={cn(
                                "w-full px-3 py-2.5 text-left text-sm transition-colors",
                                "hover:bg-zinc-700/50",
                                currentBranch?.id === branch.id
                                    ? "text-blue-400 bg-blue-500/10"
                                    : "text-zinc-300"
                            )}
                        >
                            <div className="font-medium">{branch.name}</div>
                            {branch.address && (
                                <div className="text-xs text-zinc-500 mt-0.5">{branch.address}</div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
