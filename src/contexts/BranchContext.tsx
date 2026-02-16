'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Branch, StaffRole } from '@/types'

interface BranchContextType {
    currentBranch: Branch | null
    userRole: StaffRole | null
    userId: string | null
    userEmail: string | null
    branches: Branch[]
    isSuperAdmin: boolean
    switchBranch: (branch: Branch) => void
}

const BranchContext = createContext<BranchContextType>({
    currentBranch: null,
    userRole: null,
    userId: null,
    userEmail: null,
    branches: [],
    isSuperAdmin: false,
    switchBranch: () => { },
})

export function useBranch() {
    return useContext(BranchContext)
}

interface BranchProviderProps {
    children: ReactNode
    initialBranch: Branch | null
    userRole: StaffRole
    userId: string
    userEmail: string
    allBranches: Branch[]
}

export function BranchProvider({
    children,
    initialBranch,
    userRole,
    userId,
    userEmail,
    allBranches,
}: BranchProviderProps) {
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(initialBranch)
    const isSuperAdmin = userRole === 'super_admin'

    const switchBranch = useCallback((branch: Branch) => {
        setCurrentBranch(branch)
    }, [])

    return (
        <BranchContext.Provider
            value={{
                currentBranch,
                userRole,
                userId,
                userEmail,
                branches: allBranches,
                isSuperAdmin,
                switchBranch,
            }}
        >
            {children}
        </BranchContext.Provider>
    )
}
