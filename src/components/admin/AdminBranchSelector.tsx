'use client'

import { usePathname } from 'next/navigation'
import { BranchSwitcher } from '@/components/BranchSwitcher'

// Branch-specific admin routes that need the selector in main area
const branchRoutes = [
    '/admin/pricing',
    '/admin/staff',
    '/admin/settings',
    '/admin/audit',
]

export function AdminBranchSelector() {
    const pathname = usePathname()
    
    const isBranchSpecific = branchRoutes.some(route => 
        pathname === route || pathname?.startsWith(route + '/')
    )

    if (!isBranchSpecific) return null

    return (
        <div className="flex items-center justify-between mb-6">
            <div></div> {/* Spacer */}
            <div className="w-64">
                <BranchSwitcher basePath="/admin" />
            </div>
        </div>
    )
}
