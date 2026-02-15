export type JobStatus = 'queue' | 'washing' | 'drying' | 'completed'

export interface Job {
    id: string
    plate_number: string
    service_type_id: string
    status: JobStatus
    payment_status: 'pending' | 'paid'
    owner_id: string | null
    created_at: string
    closed_at: string | null
    service_types?: {
        name: string
        price: number
    }
}

export type PaymentMethod = 'cash' | 'card' | 'transfer'

export interface Payment {
    id: string
    job_id: string
    amount: number
    method: PaymentMethod
    completed_at: string
    recorded_by: string
}

export interface Appointment {
    id: string
    customer_name: string
    customer_phone: string
    plate_number: string
    scheduled_time: string
    service_type_id: string
    status: 'booked' | 'cancelled' | 'completed'
    service_type_id: string
    status: 'booked' | 'cancelled' | 'completed'
    converted_job_id: string | null
    is_valet: boolean
    valet_address: string | null
    service_types?: {
        name: string
        price: number
    }
}

export const KANBAN_COLUMNS: { id: JobStatus; title: string }[] = [
    { id: 'queue', title: 'Queue' },
    { id: 'washing', title: 'Washing' },
    { id: 'drying', title: 'Drying' },
    { id: 'completed', title: 'Completed' },
]
