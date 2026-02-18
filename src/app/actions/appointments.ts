'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Session helper ───

async function getStaffSession() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    const { data: staff } = await supabase
        .from('staff_profiles')
        .select('role, branch_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

    if (!staff) throw new Error('Personel profili bulunamadı')

    return {
        supabase,
        branchId: staff.branch_id,
        isSuperAdmin: staff.role === 'super_admin' || staff.role === 'partner',
    }
}

export async function getAppointments(branchId?: string) {
    const { supabase, branchId: myBranch, isSuperAdmin } = await getStaffSession()
    const bid = branchId || myBranch

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            services (
                name,
                price
            )
        `)
        .order('scheduled_time', { ascending: true })

    if (error) {
        console.error('Error fetching appointments:', error)
        return []
    }

    // Filter by branch_id for non-superadmins (RLS should handle this, but double-check)
    if (!isSuperAdmin && bid) {
        return data?.filter((a: any) => a.branch_id === bid) || []
    }

    return data
}

export async function createAppointment(formData: FormData) {
    const { supabase, branchId } = await getStaffSession()

    const customerName = formData.get('customerName') as string
    const customerPhone = formData.get('customerPhone') as string
    const plateNumber = formData.get('plateNumber') as string
    const scheduledTime = formData.get('scheduledTime') as string
    const serviceId = formData.get('serviceTypeId') as string
    const isValet = formData.get('isValet') === 'on'
    const valetAddress = formData.get('valetAddress') as string

    // Validate
    if (!customerName || !scheduledTime || !serviceId) {
        return { error: 'Zorunlu alanlar eksik' }
    }
    if (!branchId) {
        return { error: 'Şube bilgisi bulunamadı' }
    }

    const { error } = await supabase
        .from('appointments')
        .insert([
            {
                customer_name: customerName,
                customer_phone: customerPhone,
                plate_number: plateNumber?.toUpperCase(),
                scheduled_time: scheduledTime,
                service_id: serviceId,
                branch_id: branchId,
                is_valet: isValet,
                valet_address: isValet ? valetAddress : null
            }
        ])

    if (error) {
        console.error('Error creating appointment:', error)
        return { error: 'Randevu oluşturulamadı' }
    }

    revalidatePath('/dashboard/schedule')
    return { success: true }
}

export async function convertAppointmentToJob(appointmentId: string) {
    const { supabase, branchId } = await getStaffSession()

    // 1. Get Appointment
    const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()

    if (fetchError || !appointment) {
        return { error: 'Randevu bulunamadı' }
    }

    if (!branchId) {
        return { error: 'Şube bilgisi bulunamadı' }
    }

    // 2. Create Job
    const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([
            {
                plate_number: appointment.plate_number || 'UNKNOWN',
                service_id: appointment.service_id,
                status: 'queue',
                payment_status: 'pending',
                branch_id: branchId
            }
        ])
        .select()
        .single()

    if (jobError) {
        if (jobError.code === '23505') {
            // Job already active for this plate. Find it.
            const { data: existingJob } = await supabase
                .from('jobs')
                .select('id')
                .eq('plate_number', appointment.plate_number)
                .is('closed_at', null)
                .single()

            if (existingJob) {
                // Link to existing job
                await supabase
                    .from('appointments')
                    .update({
                        status: 'completed',
                        converted_job_id: existingJob.id
                    })
                    .eq('id', appointmentId)

                revalidatePath('/dashboard')
                revalidatePath('/dashboard/schedule')
                return { success: true, jobId: existingJob.id, message: 'Zaten aktif iş var. Randevu bağlandı.' }
            }
        }
        console.error('Error converting to job:', jobError)
        return { error: 'İş oluşturulamadı' }
    }

    // 3. Update Appointment Status
    const { error: updateError } = await supabase
        .from('appointments')
        .update({
            status: 'completed',
            converted_job_id: job.id
        })
        .eq('id', appointmentId)

    if (updateError) {
        console.error('Error updating appointment status:', updateError)
        // Non-critical
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/schedule')
    return { success: true, jobId: job.id }
}
