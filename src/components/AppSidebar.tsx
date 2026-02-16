'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Calendar,
    Settings,
    LogOut,
    CarFront,
    History,
    Menu,
    X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlobalSearch } from './GlobalSearch'
import { BranchSwitcher } from './BranchSwitcher'
import { useBranch } from '@/contexts/BranchContext'
import { ROLE_LABELS } from '@/types'

const navigation = [
    { name: 'Panel', href: '/dashboard', icon: Home },
    { name: 'Geçmiş', href: '/dashboard/history', icon: History },
    { name: 'Randevular', href: '/dashboard/schedule', icon: Calendar },
    { name: 'Yönetim', href: '/admin', icon: Settings },
]

export function AppSidebar() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const { userRole } = useBranch()
    const canAccessAdmin = userRole && ['super_admin', 'branch_admin', 'manager'].includes(userRole)

    // Close sidebar on route change (tablet nav)
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    // Close sidebar on escape key
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <>
            {/* ===== Mobile/Tablet Top Bar ===== */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-3">
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 active:bg-zinc-700 transition-colors"
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="flex items-center font-bold text-lg tracking-wider text-white">
                    <CarFront className="mr-2 h-5 w-5 text-blue-500" />
                    OTON<span className="text-blue-500">BU</span>
                </div>
            </div>

            {/* ===== Backdrop Overlay ===== */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* ===== Sidebar ===== */}
            <div
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50",
                    "flex h-screen w-72 flex-col bg-zinc-900 text-white",
                    "transform transition-transform duration-300 ease-in-out",
                    // On desktop: always visible
                    "lg:translate-x-0",
                    // On mobile/tablet: slide in/out
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header */}
                <div className="flex h-16 items-center justify-between px-6">
                    <div className="flex items-center font-bold text-xl tracking-wider">
                        <CarFront className="mr-2 h-6 w-6 text-blue-500" />
                        OTON<span className="text-blue-500">BU</span>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 active:bg-zinc-700"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 mb-2">
                    <GlobalSearch />
                </div>

                {/* Branch Switcher */}
                <div className="px-4 mb-2">
                    <BranchSwitcher />
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-1 px-3">
                        {navigation.map((item) => {
                            // Hide admin link if user lacks admin role
                            if (item.href === '/admin' && !canAccessAdmin) return null
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'group flex items-center rounded-xl px-4 py-3.5 text-base font-medium transition-all',
                                        'min-h-[48px]', // Apple HIG touch target
                                        isActive
                                            ? 'bg-blue-600/20 text-white border border-blue-500/30'
                                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white active:bg-zinc-700'
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

                {/* User info + Sign Out */}
                <div className="border-t border-zinc-800 p-4 space-y-2">
                    {userRole && (
                        <div className="px-4 py-1">
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                                {ROLE_LABELS[userRole]}
                            </span>
                        </div>
                    )}
                    <button className="group flex w-full items-center rounded-xl px-4 py-3.5 text-base font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white active:bg-zinc-700 min-h-[48px]">
                        <LogOut className="mr-3 h-5 w-5 text-zinc-500 group-hover:text-white" />
                        Çıkış Yap
                    </button>
                </div>
            </div>
        </>
    )
}
