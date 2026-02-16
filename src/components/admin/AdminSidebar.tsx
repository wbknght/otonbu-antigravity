'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Wrench,
    Car,
    Package,
    DollarSign,
    Users,
    MapPin,
    Settings,
    ClipboardList,
    ArrowLeft,
    Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'
import { BranchSwitcher } from '@/components/BranchSwitcher'
import { useBranch } from '@/contexts/BranchContext'

const adminNav = [
    { name: tr.adminNav.services, href: '/admin/services', icon: Wrench },
    { name: tr.adminNav.vehicles, href: '/admin/vehicles', icon: Car },
    { name: tr.adminNav.packages, href: '/admin/packages', icon: Package },
    { name: tr.adminNav.pricing, href: '/admin/pricing', icon: DollarSign },
    { name: tr.adminNav.staff, href: '/admin/staff', icon: Users },
    { name: tr.adminNav.locations, href: '/admin/locations', icon: MapPin },
    { name: tr.adminNav.settings, href: '/admin/settings', icon: Settings },
    { name: tr.adminNav.audit, href: '/admin/audit', icon: ClipboardList },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const { isSuperAdmin } = useBranch()

    return (
        <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen">
            {/* Header */}
            <div className="h-16 flex items-center px-6 border-b border-zinc-800">
                <h1 className="text-lg font-bold text-white">{tr.adminNav.title}</h1>
            </div>

            {/* Branch Switcher */}
            <div className="px-3 pt-3">
                <BranchSwitcher />
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {adminNav.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all min-h-[44px]',
                                isActive
                                    ? 'bg-blue-600/20 text-white border border-blue-500/30'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                            )}
                        >
                            <item.icon className={cn('w-4 h-4', isActive ? 'text-blue-400' : 'text-zinc-500')} />
                            {item.name}
                        </Link>
                    )
                })}
                {isSuperAdmin && (
                    <Link
                        href="/admin/branches"
                        className={cn(
                            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all min-h-[44px]',
                            pathname === '/admin/branches'
                                ? 'bg-blue-600/20 text-white border border-blue-500/30'
                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        )}
                    >
                        <Building2 className={cn('w-4 h-4', pathname === '/admin/branches' ? 'text-blue-400' : 'text-zinc-500')} />
                        Şubeler
                    </Link>
                )}
            </nav>

            {/* Back to Dashboard */}
            <div className="border-t border-zinc-800 p-4">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white min-h-[44px]"
                >
                    <ArrowLeft className="w-4 h-4 text-zinc-500" />
                    Panele Dön
                </Link>
            </div>
        </div>
    )
}
