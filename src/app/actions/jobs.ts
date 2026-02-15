'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Job, JobStatus } from '@/types'

export async function getJobs() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('jobs')
        .select(`
      *,
      service_types (
        name,
        price
      )
    `)
        .is('closed_at', null)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching jobs:', error)
        return []
    }

    return data as unknown as Job[]
}

export async function updateJobStatus(jobId: string, newStatus: JobStatus) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId)

    if (error) {
        console.error('Error updating job status:', error)
        throw new Error('Failed to update job status')
    }

    revalidatePath('/dashboard')
}

export async function createJob(plateNumber: string, serviceTypeId: string) {
    const supabase = await createClient()

    // basic validation
    if (!plateNumber || !serviceTypeId) {
        return { error: 'Missing required fields' }
    }

    const { data, error } = await supabase
        .from('jobs')
        .insert([
            {
                plate_number: plateNumber.toUpperCase(),
                service_type_id: serviceTypeId,
                status: 'queue',
            },
        ])
        .select()
        .single()

    if (error) {
        console.error('Error creating job:', error)
        if (error.code === '23505') { // Unique violation
            return { error: 'Active job already exists for this plate' }
        }
        return { error: 'Failed to create job' }
    }

    revalidatePath('/dashboard')
    return { success: true, job: data }
}

export async function recordPayment(jobId: string, amount: number, method: 'cash' | 'card' | 'transfer') {
    const supabase = await createClient()

    // 1. Record payment
    const { error: paymentError } = await supabase
        .from('payments')
        .insert([
            {
                job_id: jobId,
                amount: amount,
                method: method,
                recorded_by: (await supabase.auth.getUser()).data.user?.id
            }
        ])

    if (paymentError) {
        console.error('Error recording payment:', paymentError)
        return { error: 'Failed to record payment' }
    }

    // 2. Update job payment status
    const { error: jobError } = await supabase
        .from('jobs')
        .update({ payment_status: 'paid' })
        .eq('id', jobId)

    if (jobError) {
        console.error('Error updating job payment status:', jobError)
        return { error: 'Failed to update job status' }
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
        .eq('payment_status', 'paid') // Security check: must be paid

    if (error) {
        console.error('Error archiving job:', error)
        return { error: 'Failed to archive job' }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function getArchivedJobs(search?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('jobs')
        .select(`
      *,
      service_types (
        name,
        price
      )
    `)
        .not('closed_at', 'is', null)
        .order('closed_at', { ascending: false })
        .limit(50) // Pagination later

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
