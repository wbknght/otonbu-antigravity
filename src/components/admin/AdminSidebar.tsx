'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Wrench,
    Car,
    Package,
    DollarSign,
    Users,
    Settings,
    ClipboardList,
    ArrowLeft,
    Building2,
    Globe,
    Crown,
    BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'
import { useBranch } from '@/contexts/BranchContext'

// Universal admin items (no branch context needed)
const universalNav = [
    { name: tr.adminNav.services, href: '/admin/services', icon: Wrench, roles: ['super_admin', 'partner'] },
    { name: tr.adminNav.vehicles, href: '/admin/vehicles', icon: Car, roles: ['super_admin', 'partner'] },
    { name: tr.adminNav.packages, href: '/admin/packages', icon: Package, roles: ['super_admin', 'partner'] },
    { name: 'Kullanıcılar', href: '/admin/users', icon: Crown, roles: ['super_admin'] },
    { name: 'Şubeler', href: '/admin/branches', icon: Building2, roles: ['super_admin', 'partner'] },
]

// Branch-specific admin items (need branch context)
const branchNav = [
    { name: tr.adminNav.pricing, href: '/admin/pricing', icon: DollarSign, roles: ['super_admin', 'partner'] },
    { name: tr.adminNav.staff, href: '/admin/staff', icon: Users, roles: ['super_admin', 'partner', 'branch_admin', 'manager'] },
    { name: 'İstatistikler', href: '/admin/stats', icon: BarChart3, roles: ['super_admin', 'partner', 'branch_admin', 'manager'] },
    { name: tr.adminNav.settings, href: '/admin/settings', icon: Settings, roles: ['super_admin', 'partner'] },
    { name: tr.adminNav.audit, href: '/admin/audit', icon: ClipboardList, roles: ['super_admin', 'partner'] },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const { isSuperAdmin } = useBranch()

    return (
        <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen">
            {/* Header */}
            <div className="h-16 flex items-center px-4 border-b border-zinc-800">
                <h1 className="text-lg font-bold text-white">{tr.adminNav.title}</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                {/* Universal Section */}
                <div className="px-3 mb-6">
                    <div className="flex items-center gap-2 px-3 mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        <Globe className="w-3.5 h-3.5" />
                        Evrensel
                    </div>
                    <div className="space-y-1">
                        {universalNav.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                            if (!isSuperAdmin && !item.roles.includes('branch_admin') && !item.roles.includes('manager')) return null

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-brand/20 text-white border border-brand/30'
                                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                    )}
                                >
                                    <item.icon className={cn('w-4 h-4', isActive ? 'text-brand' : 'text-zinc-500')} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Branch-Specific Section */}
                <div className="px-3">
                    <div className="flex items-center gap-2 px-3 mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        <Building2 className="w-3.5 h-3.5" />
                        Şube Yönetimi
                    </div>
                    <div className="space-y-1">
                        {branchNav.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

                            if (!isSuperAdmin && !item.roles.includes('branch_admin') && !item.roles.includes('manager')) return null

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-brand/20 text-white border border-brand/30'
                                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                    )}
                                >
                                    <item.icon className={cn('w-4 h-4', isActive ? 'text-brand' : 'text-zinc-500')} />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </nav>

            {/* Back to Dashboard */}
            <div className="border-t border-zinc-800 p-3">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4 text-zinc-500" />
                    Panele Dön
                </Link>
            </div>
        </div>
    )
}
