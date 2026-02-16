'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAppointments() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
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

    return data
}

export async function createAppointment(formData: FormData) {
    const supabase = await createClient()

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

    const { error } = await supabase
        .from('appointments')
        .insert([
            {
                customer_name: customerName,
                customer_phone: customerPhone,
                plate_number: plateNumber?.toUpperCase(),
                scheduled_time: scheduledTime,
                service_id: serviceId,
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
    const supabase = await createClient()

    // 1. Get Appointment
    const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()

    if (fetchError || !appointment) {
        return { error: 'Randevu bulunamadı' }
    }

    // 2. Create Job
    const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([
            {
                plate_number: appointment.plate_number || 'UNKNOWN',
                service_id: appointment.service_id,
                status: 'queue',
                payment_status: 'pending'
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
