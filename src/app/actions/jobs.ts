'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Job, JobStatus, VehicleClass } from '@/types'

// ─── Queries ───

export async function getJobs() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            service_types ( name, price ),
            cars ( id, plate_number, vehicle_class, make, model, color, has_damage ),
            customers ( id, name, phone )
        `)
        .is('closed_at', null)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching jobs:', error)
        return []
    }

    return data as unknown as Job[]
}

export async function getArchivedJobs(search?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('jobs')
        .select(`
            *,
            service_types ( name, price ),
            cars ( id, plate_number, vehicle_class, make, model, color )
        `)
        .not('closed_at', 'is', null)
        .order('closed_at', { ascending: false })
        .limit(50)

    if (search) {
        query = query.ilike('plate_number', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching archived jobs:', error)
        return []
    }

    return data as unknown as Job[]
}

export async function getServiceTypes() {
    const supabase = await createClient()
    const { data } = await supabase.from('service_types').select('*').eq('is_active', true)
    return data || []
}

// ─── Car & Customer Lookup ───

export async function lookupCarByPlate(plate: string) {
    const supabase = await createClient()
    const { data: car } = await supabase
        .from('cars')
        .select('*')
        .eq('plate_number', plate.toUpperCase())
        .single()

    if (!car) return null

    // Find the most recent customer linked to a job with this car
    const { data: recentJob } = await supabase
        .from('jobs')
        .select('customer_id, customers ( * )')
        .eq('car_id', car.id)
        .not('customer_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    return {
        car,
        customer: (recentJob as any)?.customers || null,
    }
}

export async function lookupCustomerByPhone(phone: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single()
    return data
}

// ─── Job Creation (Step 1) ───

export async function createJob(
    plateNumber: string,
    serviceTypeId: string,
    vehicleClass: VehicleClass,
    phone?: string
) {
    const supabase = await createClient()
    const plate = plateNumber.toUpperCase().trim()

    if (!plate || !serviceTypeId || !vehicleClass) {
        return { error: 'Zorunlu alanlar eksik' }
    }

    // 1. Upsert car
    const { data: existingCar } = await supabase
        .from('cars')
        .select('id')
        .eq('plate_number', plate)
        .single()

    let carId: string

    if (existingCar) {
        carId = existingCar.id
        // Update vehicle class if changed
        await supabase
            .from('cars')
            .update({ vehicle_class: vehicleClass, updated_at: new Date().toISOString() })
            .eq('id', carId)
    } else {
        const { data: newCar, error: carError } = await supabase
            .from('cars')
            .insert([{ plate_number: plate, vehicle_class: vehicleClass }])
            .select('id')
            .single()

        if (carError || !newCar) {
            console.error('Error creating car:', carError)
            return { error: 'Araç kaydı oluşturulamadı' }
        }
        carId = newCar.id
    }

    // 2. Resolve customer
    let customerId: string | null = null

    if (phone?.trim()) {
        const cleanPhone = phone.trim()
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', cleanPhone)
            .single()

        if (existingCustomer) {
            customerId = existingCustomer.id
        } else {
            const { data: newCustomer, error: custError } = await supabase
                .from('customers')
                .insert([{ phone: cleanPhone }])
                .select('id')
                .single()

            if (!custError && newCustomer) {
                customerId = newCustomer.id
            }
        }
    } else if (existingCar) {
        // No phone provided but car exists — carry over previous customer
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

    // 3. Create job
    const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([{
            plate_number: plate,
            service_type_id: serviceTypeId,
            status: 'queue',
            car_id: carId,
            customer_id: customerId,
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

// ─── Car Details Update (Step 2) ───

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
    const supabase = await createClient()

    const { error } = await supabase
        .from('cars')
        .update({ ...details, updated_at: new Date().toISOString() })
        .eq('id', carId)

    if (error) {
        console.error('Error updating car details:', error)
        return { error: 'Araç bilgileri güncellenemedi' }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

// ─── Customer Update (Step 2) ───

export async function updateJobCustomer(
    jobId: string,
    customerData: { name?: string; email?: string; phone?: string }
) {
    const supabase = await createClient()

    // Get job to find existing customer
    const { data: job } = await supabase
        .from('jobs')
        .select('customer_id')
        .eq('id', jobId)
        .single()

    if (!job) return { error: 'İş bulunamadı' }

    let customerId = job.customer_id

    if (customerId) {
        // Update existing customer
        const { error } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', customerId)

        if (error) {
            console.error('Error updating customer:', error)
            return { error: 'Müşteri bilgileri güncellenemedi' }
        }
    } else if (customerData.phone || customerData.name || customerData.email) {
        // Create new customer and link
        const { data: newCustomer, error: custError } = await supabase
            .from('customers')
            .insert([customerData])
            .select('id')
            .single()

        if (custError || !newCustomer) {
            console.error('Error creating customer:', custError)
            return { error: 'Müşteri kaydı oluşturulamadı' }
        }

        customerId = newCustomer.id
        await supabase
            .from('jobs')
            .update({ customer_id: customerId })
            .eq('id', jobId)
    }

    revalidatePath('/dashboard')
    return { success: true }
}

// ─── Status & Payment ───

export async function updateJobStatus(jobId: string, newStatus: JobStatus) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId)

    if (error) {
        console.error('Error updating job status:', error)
        throw new Error('İş durumu güncellenemedi')
    }

    revalidatePath('/dashboard')
}

export async function recordPayment(jobId: string, amount: number, method: 'cash' | 'card' | 'transfer') {
    const supabase = await createClient()

    const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
            job_id: jobId,
            amount,
            method,
            recorded_by: (await supabase.auth.getUser()).data.user?.id
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
    const supabase = await createClient()

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
