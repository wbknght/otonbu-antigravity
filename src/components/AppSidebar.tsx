'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Calendar,
    Settings,
    LogOut,
    CarFront,
    History
} from 'lucide-react'
import { cn } from '@/lib/utils' // We assume standard shadcn-like utils or I will create it
import { GlobalSearch } from './GlobalSearch'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'History', href: '/dashboard/history', icon: History },
    { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
    { name: 'Admin', href: '/admin', icon: Settings }, // Manager only, but visible for now
]

export function AppSidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-screen w-64 flex-col bg-zinc-900 text-white">
            <div className="flex h-16 items-center px-6 font-bold text-xl tracking-wider">
                <CarFront className="mr-2 h-6 w-6 text-blue-500" />
                WASH<span className="text-blue-500">OPS</span>
            </div>

            <div className="px-4 mb-4">
                <GlobalSearch />
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-zinc-800 text-white'
                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'mr-3 h-5 w-5 flex-shrink-0',
                                        isActive ? 'text-blue-500' : 'text-zinc-500 group-hover:text-white'
                                    )}
                                />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="border-t border-zinc-800 p-4">
                <button className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white">
                    <LogOut className="mr-3 h-5 w-5 text-zinc-500 group-hover:text-white" />
                    Sign Out
                </button>
            </div>
        </div>
    )
}
