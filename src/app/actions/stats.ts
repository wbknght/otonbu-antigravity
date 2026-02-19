'use server'

import { createClient } from '@/utils/supabase/server'
import { StaffRole, StatsPeriod, BranchStats, WorkerStats } from '@/types'
import { getDateRange } from '@/lib/stats-utils'

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

// ─── Branch Stats ───

export async function getBranchStats(
    branchId: string,
    period: StatsPeriod,
    customRange?: { start: string; end: string }
): Promise<BranchStats> {
    const { supabase } = await getStaffSession()
    const range = getDateRange(period, customRange)

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
            services ( name ),
            packages ( name )
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

    // Cast to any to handle nested relations properly
    const jobsTyped = jobs as unknown as {
        id: string
        price: number | null
        payment_status: string
        closed_at: string | null
        car_id: string | null
        service_id: string | null
        cars: { make: string | null; vehicle_class: string } | null
        services: { name: string } | null
        packages: { name: string } | null
    }[]

    const totalJobs = jobsTyped.length
    const revenue = jobsTyped.filter(j => j.payment_status === 'paid').reduce((sum, j) => sum + (j.price || 0), 0)
    const pendingRevenue = jobsTyped.filter(j => j.payment_status === 'pending').reduce((sum, j) => sum + (j.price || 0), 0)
    const avgJobValue = totalJobs > 0 ? revenue / totalJobs : 0

    const brandMap = new Map<string | null, number>()
    jobsTyped.forEach(job => {
        const make = job.cars?.make || 'Bilinmeyen'
        brandMap.set(make, (brandMap.get(make) || 0) + 1)
    })
    const byBrand = Array.from(brandMap.entries())
        .map(([make, count]) => ({ make, count }))
        .sort((a, b) => b.count - a.count)

    const serviceMap = new Map<string | null, number>()
    jobsTyped.forEach(job => {
        const name = job.packages?.name || job.services?.name || 'Bilinmiyor'
        serviceMap.set(name, (serviceMap.get(name) || 0) + 1)
    })
    const byService = Array.from(serviceMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

    const vcMap = new Map<string, number>()
    const vcLabels: Record<string, string> = {
        small: 'Küçük',
        sedan: 'Sedan',
        suv: 'SUV',
        van: 'Van',
        pickup: 'Pikap',
        luxury: 'Lüks',
    }
    jobsTyped.forEach(job => {
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

    const { data: claimedJobs } = await supabase
        .from('jobs')
        .select('assigned_to')
        .eq('branch_id', branchId)
        .not('closed_at', 'is', null)
        .gte('closed_at', range.start)
        .lte('closed_at', range.end + 'T23:59:59')
        .in('assigned_to', userIds)

    const { data: completions } = await supabase
        .from('job_status_history')
        .select('actor_user_id')
        .eq('branch_id', branchId)
        .eq('new_status', 'completed')
        .gte('created_at', range.start)
        .lte('created_at', range.end + 'T23:59:59')
        .in('actor_user_id', userIds)

    const claimedMap = new Map<string, number>()
    const completedMap = new Map<string, number>()

    staff.forEach(s => {
        claimedMap.set(s.user_id, 0)
        completedMap.set(s.user_id, 0)
    })

    claimedJobs?.forEach(job => {
        if (job.assigned_to) {
            claimedMap.set(job.assigned_to, (claimedMap.get(job.assigned_to) || 0) + 1)
        }
    })

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

    workers.sort((a, b) => b.completed - a.completed)

    return { workers }
}
