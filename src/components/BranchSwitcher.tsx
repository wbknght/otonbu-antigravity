'use client'

import { useBranch } from '@/contexts/BranchContext'
import { ChevronDown, Building2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

interface BranchSwitcherProps {
    basePath?: string
}

export function BranchSwitcher({ basePath = '/admin' }: BranchSwitcherProps) {
    const { currentBranch, branches, isSuperAdmin, switchBranch } = useBranch()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const selectedBranchId = searchParams.get('branch')

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

    const handleBranchSelect = (branchId: string) => {
        // Get current path and preserve it, just update the branch param
        const url = new URL(window.location.href)
        url.searchParams.set('branch', branchId)
        
        // Use full page navigation to ensure server component re-renders
        window.location.href = url.toString()
    }

    // Only render for super_admin with multiple branches
    if (!isSuperAdmin || branches.length <= 1) {
        if (currentBranch) {
            return (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="truncate">{currentBranch.name}</span>
                </div>
            )
        }
        return null
    }

    // Find the selected branch from URL or use currentBranch
    const selectedBranch = selectedBranchId 
        ? branches.find(b => b.id === selectedBranchId) 
        : currentBranch

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
                    {selectedBranch?.name || 'Şube Seç'}
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
                            onClick={() => handleBranchSelect(branch.id)}
                            className={cn(
                                "w-full px-3 py-2.5 text-left text-sm transition-colors",
                                "hover:bg-zinc-700/50",
                                selectedBranchId === branch.id || (!selectedBranchId && currentBranch?.id === branch.id)
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
