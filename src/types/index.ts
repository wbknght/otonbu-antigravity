export type JobStatus = 'queue' | 'washing' | 'drying' | 'completed'

export type VehicleClass = 'small' | 'sedan' | 'suv' | 'van' | 'pickup' | 'luxury'

export const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
    small: 'Küçük',
    sedan: 'Sedan',
    suv: 'SUV',
    van: 'Van',
    pickup: 'Pikap',
    luxury: 'Lüks',
}

export interface Car {
    id: string
    plate_number: string
    vehicle_class: VehicleClass
    make: string | null
    model: string | null
    color: string | null
    notes: string | null
    has_damage: boolean
    created_at: string
    updated_at: string
}

export interface Customer {
    id: string
    name: string | null
    phone: string | null
    email: string | null
    sms_consent: boolean
    created_at: string
}

export interface Job {
    id: string
    plate_number: string
    service_type_id: string
    status: JobStatus
    payment_status: 'pending' | 'paid'
    owner_id: string | null
    car_id: string | null
    customer_id: string | null
    created_at: string
    closed_at: string | null
    service_types?: {
        name: string
        price: number
    }
    cars?: Car
    customers?: Customer
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
    converted_job_id: string | null
    is_valet: boolean
    valet_address: string | null
    service_types?: {
        name: string
        price: number
    }
}

export const KANBAN_COLUMNS: { id: JobStatus; title: string }[] = [
    { id: 'queue', title: 'Sıra' },
    { id: 'washing', title: 'Yıkama' },
    { id: 'drying', title: 'Kurulama' },
    { id: 'completed', title: 'Tamamlandı' },
]
