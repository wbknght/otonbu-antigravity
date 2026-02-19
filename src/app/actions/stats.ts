'use server'

import { createClient } from '@/utils/supabase/server'
import { StaffRole } from '@/types'

// ─── Types ───

export type StatsPeriod = 'last7days' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'all'

export interface DateRange {
    start: string // ISO date string
    end: string   // ISO date string
}

export interface BranchStats {
    totalJobs: number
    revenue: number
    pendingRevenue: number
    avgJobValue: number
    byBrand: { make: string | null; count: number }[]
    byService: { name: string | null; count: number }[]
    byVehicleClass: { class: string; count: number }[]
}

export interface WorkerStats {
    workers: {
        userId: string
        fullName: string
        claimed: number
        completed: number
        completionRate: number
    }[]
}

// ─── Session Helper ───

async function getStaffSession() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    const { data: staff } = await supabase
        .from('staff_profiles')
        .select('role, branch_id, full_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

    if (!staff) throw new Error('Personel profili bulunamadı')

    return {
        supabase,
        userId: user.id,
        role: staff.role as StaffRole,
        branchId: staff.branch_id as string,
        fullName: staff.full_name,
        isSuperAdmin: staff.role === 'super_admin' || staff.role === 'partner',
    }
}

// ─── Date Range Helper ───

export function getDateRange(period: StatsPeriod, customRange?: { start: string; end: string }): DateRange {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (period) {
        case 'last7days': {
            const start = new Date(today)
            start.setDate(start.getDate() - 7)
            return {
                start: start.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0],
            }
        }
        case 'thisWeek': {
            const start = new Date(today)
            const day = start.getDay()
            const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday
            start.setDate(diff)
            return {
                start: start.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0],
            }
        }
        case 'thisMonth': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1)
            return {
                start: start.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0],
            }
        }
        case 'lastMonth': {
            const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            const end = new Date(today.getFullYear(), today.getMonth(), 0)
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            }
        }
        case 'all': {
            return {
                start: '2000-01-01',
                end: '2100-12-31',
            }
        }
        case 'custom':
        default:
            if (customRange) {
                return customRange
            }
            return {
                start: '2000-01-01',
                end: '2100-12-31',
            }
    }
}

// ─── Branch Stats ───

export async function getBranchStats(
    branchId: string,
    period: StatsPeriod,
    customRange?: { start: string; end: string }
): Promise<BranchStats> {
    const { supabase } = await getStaffSession()
    const range = getDateRange(period, customRange)

    // Get completed jobs within date range
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
            id,
            price,
            payment_status,
            closed_at,
            car_id,
            service_id,
            cars ( make, vehicle_class ),
            services ( name )
        `)
        .eq('branch_id', branchId)
        .not('closed_at', 'is', null)
        .gte('closed_at', range.start)
        .lte('closed_at', range.end + 'T23:59:59')

    if (error) {
        console.error('Error fetching branch stats:', error)
        return {
            totalJobs: 0,
            revenue: 0,
            pendingRevenue: 0,
            avgJobValue: 0,
            byBrand: [],
            byService: [],
            byVehicleClass: [],
        }
    }

    const totalJobs = jobs.length
    const revenue = jobs.filter(j => j.payment_status === 'paid').reduce((sum, j) => sum + (j.price || 0), 0)
    const pendingRevenue = jobs.filter(j => j.payment_status === 'pending').reduce((sum, j) => sum + (j.price || 0), 0)
    const avgJobValue = totalJobs > 0 ? revenue / totalJobs : 0

    // Group by brand
    const brandMap = new Map<string | null, number>()
    jobs.forEach(job => {
        const make = job.cars?.make || 'Bilinmeyen'
        brandMap.set(make, (brandMap.get(make) || 0) + 1)
    })
    const byBrand = Array.from(brandMap.entries())
        .map(([make, count]) => ({ make, count }))
        .sort((a, b) => b.count - a.count)

    // Group by service
    const serviceMap = new Map<string | null, number>()
    jobs.forEach(job => {
        const name = job.services?.name || 'Bilinmiyor'
        serviceMap.set(name, (serviceMap.get(name) || 0) + 1)
    })
    const byService = Array.from(serviceMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

    // Group by vehicle class
    const vcMap = new Map<string, number>()
    const vcLabels: Record<string, string> = {
        small: 'Küçük',
        sedan: 'Sedan',
        suv: 'SUV',
        van: 'Van',
        pickup: 'Pikap',
        luxury: 'Lüks',
    }
    jobs.forEach(job => {
        const vc = job.cars?.vehicle_class || 'unknown'
        const label = vcLabels[vc] || vc
        vcMap.set(label, (vcMap.get(label) || 0) + 1)
    })
    const byVehicleClass = Array.from(vcMap.entries())
        .map(([vc, count]) => ({ class: vc, count }))
        .sort((a, b) => b.count - a.count)

    return {
        totalJobs,
        revenue,
        pendingRevenue,
        avgJobValue,
        byBrand,
        byService,
        byVehicleClass,
    }
}

// ─── Worker Stats ───

export async function getWorkerStats(
    branchId: string,
    period: StatsPeriod,
    customRange?: { start: string; end: string }
): Promise<WorkerStats> {
    const { supabase } = await getStaffSession()
    const range = getDateRange(period, customRange)

    // Get all staff for the branch (staff, manager, branch_admin)
    const { data: staff } = await supabase
        .from('staff_profiles')
        .select('user_id, full_name')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .in('role', ['staff', 'manager', 'branch_admin'])

    if (!staff || staff.length === 0) {
        return { workers: [] }
    }

    const userIds = staff.map(s => s.user_id)

    // Get jobs claimed by these users (completed within range)
    const { data: claimedJobs } = await supabase
        .from('jobs')
        .select('assigned_to')
        .eq('branch_id', branchId)
        .not('closed_at', 'is', null)
        .gte('closed_at', range.start)
        .lte('closed_at', range.end + 'T23:59:59')
        .in('assigned_to', userIds)

    // Get completions from job_status_history
    const { data: completions } = await supabase
        .from('job_status_history')
        .select('actor_user_id')
        .eq('branch_id', branchId)
        .eq('new_status', 'completed')
        .gte('created_at', range.start)
        .lte('created_at', range.end + 'T23:59:59')
        .in('actor_user_id', userIds)

    // Build stats per worker
    const claimedMap = new Map<string, number>()
    const completedMap = new Map<string, number>()

    // Initialize
    staff.forEach(s => {
        claimedMap.set(s.user_id, 0)
        completedMap.set(s.user_id, 0)
    })

    // Count claimed
    claimedJobs?.forEach(job => {
        if (job.assigned_to) {
            claimedMap.set(job.assigned_to, (claimedMap.get(job.assigned_to) || 0) + 1)
        }
    })

    // Count completed
    completions?.forEach(c => {
        if (c.actor_user_id) {
            completedMap.set(c.actor_user_id, (completedMap.get(c.actor_user_id) || 0) + 1)
        }
    })

    const workers = staff.map(s => {
        const claimed = claimedMap.get(s.user_id) || 0
        const completed = completedMap.get(s.user_id) || 0
        const completionRate = claimed > 0 ? Math.round((completed / claimed) * 100) : 0
        return {
            userId: s.user_id,
            fullName: s.full_name,
            claimed,
            completed,
            completionRate,
        }
    })

    // Sort by completed (desc)
    workers.sort((a, b) => b.completed - a.completed)

    return { workers }
}
