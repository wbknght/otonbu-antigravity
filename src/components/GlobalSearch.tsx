'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GlobalSearch() {
    const [query, setQuery] = useState('')
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!query.trim()) return

        // In a real app, this might navigate to a search results page
        // For now, we can perhaps highlight on the dashboard or filter
        // Let's implement a simple history search navigation for now 
        // asking the server to find jobs with this plate
        // But for "Global Plate Search", navigating to history with a query param works best
        // OR simply filtering the visible dashboard if implemented. 
        // Given the instructions "Type plate number to filter", let's assume filtering the dashboard or History.
        // Let's go to History page with a search param.

        startTransition(() => {
            router.push(`/dashboard/history?search=${encodeURIComponent(query.toUpperCase())}`)
        })
    }

    return (
        <form onSubmit={handleSearch} className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Plaka ile ara..."
                className={cn(
                    "w-full bg-zinc-800 border border-zinc-700 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all",
                    isPending && "opacity-50"
                )}
            />
            {isPending && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
            )}
        </form>
    )
}
