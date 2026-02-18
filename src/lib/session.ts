'use server'

import { createClient } from '@/utils/supabase/server'
import { Branch, StaffRole } from '@/types'

export interface SessionContext {
    userId: string
    email: string
    role: StaffRole
    branchId: string | null
    branch: Branch | null
    allBranches: Branch[]
    isSuperAdmin: boolean
}

/**
 * Resolve the current user's session, role, and branch.
 * Returns null if not authenticated or no staff profile.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: staff } = await supabase
        .from('staff_profiles')
        .select('role, branch_id, full_name, email')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

    if (!staff) return null

    const role = staff.role as StaffRole
    const isSuperAdmin = role === 'super_admin' || role === 'partner'

    // Get all branches for super_admin, otherwise just own branch
    let allBranches: Branch[] = []
    let branch: Branch | null = null

    if (isSuperAdmin) {
        const { data } = await supabase
            .from('branches')
            .select('*')
            .eq('is_active', true)
            .order('name')
        allBranches = (data || []) as Branch[]
        branch = allBranches[0] || null
    } else if (staff.branch_id) {
        const { data } = await supabase
            .from('branches')
            .select('*')
            .eq('id', staff.branch_id)
            .single()
        branch = (data as Branch) || null
        allBranches = branch ? [branch] : []
    }

    return {
        userId: user.id,
        email: user.email || staff.email,
        role,
        branchId: isSuperAdmin ? (branch?.id || null) : staff.branch_id,
        branch,
        allBranches,
        isSuperAdmin,
    }
}
