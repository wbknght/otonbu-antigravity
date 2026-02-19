export type JobStatus = 'queue' | 'washing' | 'processing' | 'drying' | 'completed'

export type VehicleClass = 'small' | 'sedan' | 'suv' | 'van' | 'pickup' | 'luxury'

export type StaffRole = 'super_admin' | 'branch_admin' | 'manager' | 'staff' | 'partner'

export const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
    small: 'Küçük',
    sedan: 'Sedan',
    suv: 'SUV',
    van: 'Van',
    pickup: 'Pikap',
    luxury: 'Lüks',
}

export const ROLE_LABELS: Record<StaffRole, string> = {
    super_admin: 'Süper Admin',
    partner: 'İş Ortağı',
    branch_admin: 'Şube Admini',
    manager: 'Yönetici',
    staff: 'Personel',
}

export const ROLE_HIERARCHY: Record<StaffRole, number> = {
    super_admin: 5,
    partner: 4,
    branch_admin: 3,
    manager: 2,
    staff: 1,
}

export interface Service {
    id: string
    name: string
    description?: string | null
    duration_min: number
    price: number
    branch_id?: string | null
    is_active: boolean
    sort_order?: number
    // Computed for UI
    effective_is_active?: boolean
    is_global?: boolean
}

export interface Branch {
    id: string
    name: string
    address: string | null
    timezone: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface StaffProfile {
    id: string
    user_id: string | null
    email: string
    full_name: string
    phone: string | null
    role: StaffRole
    branch_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    // Joined
    branches?: Branch
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
    branch_id: string
    created_at: string
    updated_at: string
}

export interface Customer {
    id: string
    name: string | null
    phone: string | null
    email: string | null
    sms_consent: boolean
    branch_id: string
    created_at: string
}

export interface Job {
    id: string
    plate_number: string
    service_type_id: string // legacy - can remove later
    status: JobStatus
    payment_status: 'pending' | 'paid'
    owner_id: string | null
    car_id: string | null
    customer_id: string | null
    branch_id: string
    assigned_to: string | null
    assigned_by: string | null
    assigned_at: string | null
    started_at: string | null
    completed_at: string | null
    created_at: string
    closed_at: string | null
    price: number | null
    package_id: string | null
    services?: {
        name: string
        price?: number
    }
    cars?: Car
    customers?: Customer
    // Joined staff name for display
    assigned_staff?: {
        full_name: string
        email: string
    } | null
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
    services?: {
        name: string
        price?: number
    }
}

export const KANBAN_COLUMNS: { id: JobStatus; title: string }[] = [
    { id: 'queue', title: 'Sıra' },
    { id: 'washing', title: 'Yıkama' },
    { id: 'processing', title: 'İşlemde' },
    { id: 'drying', title: 'Kurulama' },
    { id: 'completed', title: 'Tamamlandı' },
]

// Stats types
export type StatsPeriod = 'last7days' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'all' | 'custom'

export interface DateRange {
    start: string
    end: string
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

// Permission helper: can this role move a job status?
export function canMoveStatus(role: StaffRole, isAssigned: boolean): boolean {
    if (role === 'super_admin' || role === 'branch_admin' || role === 'manager') return true
    return role === 'staff' && isAssigned
}

// Permission helper: can this role assign/reassign?
export function canAssign(role: StaffRole): boolean {
    return role === 'super_admin' || role === 'branch_admin' || role === 'manager'
}
