'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Job, JobStatus, VehicleClass, StaffRole } from '@/types'

// ─── Session helper ───

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
        email: user.email || '',
        role: staff.role as StaffRole,
        branchId: staff.branch_id as string,
        fullName: staff.full_name,
        isSuperAdmin: staff.role === 'super_admin' || staff.role === 'partner',
    }
}

// ─── Queries ───

export async function getJobs(branchId?: string) {
    const { supabase, branchId: myBranch, isSuperAdmin } = await getStaffSession()
    const bid = branchId || myBranch

    let query = supabase
        .from('jobs')
        .select(`
            *,
            services ( name ),
            cars ( id, plate_number, vehicle_class, make, model, color, has_damage ),
            customers ( id, name, phone )
        `)
        .is('closed_at', null)
    if (bid) query = query.eq('branch_id', bid)
    query = query.order('created_at', { ascending: true })

    const { data, error } = await query

    if (error) {
        console.error('Error fetching jobs:', error)
        return []
    }

    // Enrich with assigned staff name
    const jobs = data as unknown as Job[]
    if (jobs.length > 0) {
        const assignedIds = [...new Set(jobs.filter(j => j.assigned_to).map(j => j.assigned_to!))]
        if (assignedIds.length > 0) {
            const { data: staffData } = await supabase
                .from('staff_profiles')
                .select('user_id, full_name, email')
                .in('user_id', assignedIds)

            if (staffData) {
                const staffMap = new Map(staffData.map(s => [s.user_id, { full_name: s.full_name, email: s.email }]))
                jobs.forEach(job => {
                    if (job.assigned_to && staffMap.has(job.assigned_to)) {
                        job.assigned_staff = staffMap.get(job.assigned_to) || null
                    }
                })
            }
        }
    }

    return jobs
}

export async function getArchivedJobs(search?: string) {
    const { supabase, branchId } = await getStaffSession()

    let query = supabase
        .from('jobs')
        .select(`
            *,
            services ( name ),
            cars ( id, plate_number, vehicle_class, make, model, color, has_damage ),
            customers ( id, name, phone )
        `, { count: 'exact' })
        .not('closed_at', 'is', null)

    if (branchId) query = query.eq('branch_id', branchId)

    if (search?.trim()) {
        query = query.ilike('plate_number', `%${search.trim().toUpperCase()}%`)
    }

    query = query.order('closed_at', { ascending: false }).limit(50)

    const { data, error, count } = await query
    if (error) {
        console.error('Error fetching archived jobs:', error)
        return { data: [], count: 0 }
    }

    // Enrich with assigned staff name (for "Tamamlayan" / productivity stats)
    const jobs = data as unknown as Job[]
    if (jobs.length > 0) {
        const assignedIds = [...new Set(jobs.filter(j => j.assigned_to).map(j => j.assigned_to!))]
        if (assignedIds.length > 0) {
            const { data: staffData } = await supabase
                .from('staff_profiles')
                .select('user_id, full_name, email')
                .in('user_id', assignedIds)

            if (staffData) {
                const staffMap = new Map(staffData.map(s => [s.user_id, { full_name: s.full_name, email: s.email }]))
                jobs.forEach(job => {
                    if (job.assigned_to && staffMap.has(job.assigned_to)) {
                        job.assigned_staff = staffMap.get(job.assigned_to) || null
                    }
                })
            }
        }
    }

    return { data: jobs, count: count || 0 }
}

export async function getAvailableServices(branchId?: string) {
    const { supabase, branchId: myBranch } = await getStaffSession()
    const bid = branchId || myBranch

    // Fetch universal + branch specific services
    let query = supabase.from('services')
        .select(`
            *,
            branch_services (
                is_active,
                custom_price,
                custom_duration_min
            )
        `)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

    if (bid) {
        query = query.or(`branch_id.is.null,branch_id.eq.${bid}`)
    } else {
        query = query.is('branch_id', null)
    }

    const { data: services, error } = await query
    if (error) return []

    // Transform logic similar to admin.ts but geared for usage (filtering inactive)
    const available = services.map((s: any) => {
        const bs = bid
            ? s.branch_services?.find((b: any) => b.branch_id === bid)
            : null

        const isActive = s.branch_id === null
            ? (bs ? bs.is_active : true)
            : s.is_active

        return {
            id: s.id,
            name: s.name,
            price: bs?.custom_price || s.price || 0,
            duration_min: bs?.custom_duration_min || s.duration_min,
            is_active: isActive
        }
    }).filter((s: any) => s.is_active)

    return available
}

// ─── Packages & Vehicle Classes for Job Creation ───

export async function getPackagesAndVehicleClasses(branchId?: string) {
    const { supabase, branchId: myBranch } = await getStaffSession()
    const bid = branchId || myBranch

    // Fetch packages
    const { data: packages } = await supabase
        .from('packages')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

    // Fetch vehicle classes
    const { data: vehicleClasses } = await supabase
        .from('vehicle_classes')
        .select('id, key, label')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    return {
        packages: packages || [],
        vehicleClasses: vehicleClasses || [],
    }
}

// ─── Car & Customer Lookup ───

export async function lookupCarByPlate(plate: string) {
    const { supabase, branchId } = await getStaffSession()
    const upperPlate = plate.toUpperCase().trim()
    if (!upperPlate) return null

    let query = supabase
        .from('cars')
        .select('*')
        .eq('plate_number', upperPlate)
    if (branchId) query = query.eq('branch_id', branchId)
    const { data } = await query.single()

    if (!data) return null

    // Get last customer
    const { data: prevJob } = await supabase
        .from('jobs')
        .select('customer_id, customers ( id, name, phone, email )')
        .eq('car_id', data.id)
        .not('customer_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    const rawCustomer = prevJob?.customers
    const lastCustomer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer

    return {
        car: data,
        lastCustomer: lastCustomer || null,
    }
}

export async function lookupCustomerByPhone(phone: string) {
    const { supabase, branchId } = await getStaffSession()
    const clean = phone.trim()
    if (!clean) return null

    let query = supabase.from('customers').select('*').eq('phone', clean)
    if (branchId) query = query.eq('branch_id', branchId)
    const { data } = await query.single()

    return data
}

// ─── Job Creation ───

export async function createJob(
    plateNumber: string,
    packageId: string,
    vehicleClassId: string,
    phone?: string,
    branchIdOverride?: string,
) {
    const { supabase, userId, branchId: myBranch, isSuperAdmin } = await getStaffSession()
    const branchId = isSuperAdmin ? (branchIdOverride || myBranch) : myBranch
    const plate = plateNumber.toUpperCase().trim()

    if (!plate || !packageId || !vehicleClassId) {
        return { error: 'Zorunlu alanlar eksik' }
    }
    if (!branchId) return { error: 'Şube bilgisi gerekli' }

    // 0. Get price from pricing rules for package × vehicle class
    const { resolvePrice } = await import('@/lib/pricing')
    const priceResult = await resolvePrice(packageId, vehicleClassId)
    const price = priceResult.amount_krs

    // Get vehicle class key from ID for car record
    const { data: vcData } = await supabase
        .from('vehicle_classes')
        .select('key')
        .eq('id', vehicleClassId)
        .single()
    const vehicleClassKey = vcData?.key || 'sedan'

    // 1. Upsert car (branch-scoped)
    let query = supabase.from('cars').select('id').eq('plate_number', plate)
    query = query.eq('branch_id', branchId)
    const { data: existingCar } = await query.single()

    let carId: string

    if (existingCar) {
        carId = existingCar.id
        await supabase
            .from('cars')
            .update({ vehicle_class: vehicleClassKey, updated_at: new Date().toISOString() })
            .eq('id', carId)
    } else {
        const { data: newCar, error: carError } = await supabase
            .from('cars')
            .insert([{ plate_number: plate, vehicle_class: vehicleClassKey, branch_id: branchId }])
            .select('id')
            .single()

        if (carError || !newCar) {
            console.error('Error creating car:', carError)
            return { error: 'Araç kaydı oluşturulamadı' }
        }
        carId = newCar.id
    }

    // 2. Resolve customer (branch-scoped)
    let customerId: string | null = null

    if (phone?.trim()) {
        const cleanPhone = phone.trim()
        let custQuery = supabase.from('customers').select('id').eq('phone', cleanPhone)
        custQuery = custQuery.eq('branch_id', branchId)
        const { data: existingCustomer } = await custQuery.single()

        if (existingCustomer) {
            customerId = existingCustomer.id
        } else {
            const { data: newCustomer, error: custError } = await supabase
                .from('customers')
                .insert([{ phone: cleanPhone, branch_id: branchId }])
                .select('id')
                .single()

            if (!custError && newCustomer) {
                customerId = newCustomer.id
            }
        }
    } else if (existingCar) {
        const { data: prevJob } = await supabase
            .from('jobs')
            .select('customer_id')
            .eq('car_id', carId)
            .not('customer_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (prevJob?.customer_id) {
            customerId = prevJob.customer_id
        }
    }

    // 3. Create job with branch_id, package_id and price (frozen at creation)
    const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([{
            plate_number: plate,
            package_id: packageId,
            status: 'queue',
            car_id: carId,
            customer_id: customerId,
            branch_id: branchId,
            price: price,
        }])
        .select(`
            *,
            cars ( * ),
            customers ( * )
        `)
        .single()

    if (jobError) {
        console.error('Error creating job:', jobError)
        if (jobError.code === '23505') {
            return { error: 'Bu plaka için zaten aktif bir iş var' }
        }
        return { error: 'İş oluşturulamadı' }
    }

    revalidatePath('/dashboard')
    return { success: true, job }
}

// ─── Car Details Update ───

export async function updateCarDetails(
    carId: string,
    details: {
        make?: string
        model?: string
        color?: string
        notes?: string
        has_damage?: boolean
    }
) {
    const { supabase } = await getStaffSession()

    const { error } = await supabase
        .from('cars')
        .update({
            ...details,
            updated_at: new Date().toISOString(),
        })
        .eq('id', carId)

    if (error) {
        console.error('Error updating car:', error)
        return { error: 'Araç bilgileri güncellenemedi' }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

// ─── Customer Update ───

export async function updateJobCustomer(
    jobId: string,
    customerData: { name?: string; email?: string; phone?: string }
) {
    const { supabase, branchId } = await getStaffSession()

    const { data: job } = await supabase
        .from('jobs')
        .select('customer_id')
        .eq('id', jobId)
        .single()

    if (!job) return { error: 'İş bulunamadı' }

    if (job.customer_id) {
        const { error } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', job.customer_id)

        if (error) return { error: 'Müşteri bilgileri güncellenemedi' }
    } else if (customerData.phone) {
        // Create new customer
        const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert([{ ...customerData, branch_id: branchId }])
            .select('id')
            .single()

        if (error || !newCustomer) return { error: 'Müşteri oluşturulamadı' }

        await supabase
            .from('jobs')
            .update({ customer_id: newCustomer.id })
            .eq('id', jobId)
    }

    revalidatePath('/dashboard')
    return { success: true }
}

// ─── Status & Assignment ───

export async function updateJobStatus(jobId: string, newStatus: JobStatus) {
    const { supabase, userId, email, role, branchId } = await getStaffSession()

    // Get current job
    const { data: currentJob } = await supabase
        .from('jobs')
        .select('status, assigned_to, branch_id')
        .eq('id', jobId)
        .single()

    if (!currentJob) throw new Error('İş bulunamadı')

    // Permission check
    const isAssigned = currentJob.assigned_to === userId
    const canMove = role === 'super_admin' || role === 'branch_admin' || role === 'manager' || (role === 'staff' && isAssigned)

    if (!canMove) {
        throw new Error('Bu işlemi yapmak için yetkiniz yok')
    }

    const updates: any = { status: newStatus }

    // Set timestamps based on status
    if (newStatus === 'washing' && !currentJob.status || currentJob.status === 'queue') {
        updates.started_at = new Date().toISOString()
    }
    if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', jobId)

    if (error) {
        console.error('Error updating job status:', error)
        throw new Error('İş durumu güncellenemedi')
    }

    // Record status history
    await supabase.from('job_status_history').insert([{
        job_id: jobId,
        branch_id: currentJob.branch_id,
        from_status: currentJob.status,
        to_status: newStatus,
        actor_user_id: userId,
        actor_email: email,
    }])

    revalidatePath('/dashboard')
}

export async function claimJob(jobId: string) {
    const { supabase, userId, email, branchId, role } = await getStaffSession()

    // Use atomic claim function
    const { data: claimed, error } = await supabase.rpc('claim_job', {
        p_job_id: jobId,
        p_user_id: userId,
    })

    if (error) {
        console.error('Error claiming job:', error)
        return { error: 'İş alınamadı' }
    }

    if (!claimed) {
        return { error: 'Bu iş zaten başka birine atanmış veya sırada değil' }
    }

    // Get job branch for history (super_admin might have null branchId)
    const { data: job } = await supabase.from('jobs').select('branch_id').eq('id', jobId).single()

    // Record in status history
    await supabase.from('job_status_history').insert([{
        job_id: jobId,
        // Use job branch if available, fallback to session branch (though session might be null for super_admin)
        branch_id: job?.branch_id || branchId,
        from_status: null,
        to_status: 'claimed',
        actor_user_id: userId,
        actor_email: email,
    }])

    revalidatePath('/dashboard')
    return { success: true }
}

export async function reassignJob(jobId: string, targetUserId: string) {
    const { supabase, userId, email, role, branchId } = await getStaffSession()

    // Only managers+ can reassign
    if (!['super_admin', 'branch_admin', 'manager'].includes(role)) {
        return { error: 'Yetkiniz yok' }
    }

    const { data: updatedJob, error } = await supabase
        .from('jobs')
        .update({
            assigned_to: targetUserId,
            assigned_by: userId,
            assigned_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select('branch_id')
        .single()

    if (error) {
        console.error('Error reassigning job:', error)
        return { error: 'İş atanamadı' }
    }

    await supabase.from('job_status_history').insert([{
        job_id: jobId,
        branch_id: updatedJob?.branch_id || branchId,
        from_status: null,
        to_status: 'reassigned',
        actor_user_id: userId,
        actor_email: email,
    }])

    revalidatePath('/dashboard')
    return { success: true }
}

// ─── Get branch staff for assignment dropdown ───

export async function getBranchStaff() {
    const { supabase, branchId, isSuperAdmin } = await getStaffSession()

    let query = supabase
        .from('staff_profiles')
        .select('user_id, full_name, email, role')
        .eq('is_active', true)

    if (!isSuperAdmin && branchId) {
        query = query.eq('branch_id', branchId)
    }

    query = query.order('full_name', { ascending: true })
    const { data, error } = await query

    if (error) {
        console.error('Error fetching branch staff:', error)
        return []
    }
    return data || []
}

// ─── Payment ───

export async function recordPayment(jobId: string, amount: number, method: 'cash' | 'card' | 'transfer') {
    const { supabase, userId, branchId } = await getStaffSession()

    // We need to ensure we have the branch_id. 
    // If the user is super_admin, they might have specific branch context, 
    // but for payments it's safer to use the job's branch_id to ensure consistency.
    // However, for efficiency, since we are likely in the context of the job's branch, 
    // checking the job's branch is best.

    const { data: job } = await supabase
        .from('jobs')
        .select('branch_id')
        .eq('id', jobId)
        .single()

    if (!job) return { error: 'İş bulunamadı' }

    const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
            job_id: jobId,
            branch_id: job.branch_id,
            amount,
            method,
            recorded_by: userId,
        }])

    if (paymentError) {
        console.error('Error recording payment:', paymentError)
        return { error: 'Ödeme kaydedilemedi' }
    }

    const { error: jobError } = await supabase
        .from('jobs')
        .update({ payment_status: 'paid' })
        .eq('id', jobId)

    if (jobError) {
        console.error('Error updating job payment status:', jobError)
        return { error: 'İş durumu güncellenemedi' }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function archiveJob(jobId: string) {
    const { supabase } = await getStaffSession()

    const { error } = await supabase
        .from('jobs')
        .update({ closed_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('payment_status', 'paid')

    if (error) {
        console.error('Error archiving job:', error)
        return { error: 'İş arşivlenemedi' }
    }

    revalidatePath('/dashboard')
    return { success: true }
}
