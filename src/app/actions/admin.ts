'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/server-admin'
import { revalidatePath } from 'next/cache'
import { StaffRole } from '@/types'

// ─── Auth Guard Helper ───

async function requireAdmin(overrideBranchId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Oturum açmanız gerekiyor')
    }

    const { data: staff } = await supabase
        .from('staff_profiles')
        .select('role, branch_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle() // Use maybeSingle instead of single to handle no results gracefully

    if (!staff) {
        throw new Error('Personel profili bulunamadı')
    }

    if (!['super_admin', 'partner', 'branch_admin', 'manager'].includes(staff.role)) {
        throw new Error('Bu işlem için yetkiniz yok')
    }

    const isSuperAdmin = ['super_admin', 'partner'].includes(staff.role)
    const branchId = isSuperAdmin
        ? (overrideBranchId || staff.branch_id)
        : staff.branch_id

    return { supabase, user, role: staff.role as StaffRole, branchId, isSuperAdmin }
}

// ─── Audit Helper ───

async function auditLog(
    supabase: any,
    userId: string,
    userEmail: string,
    action: string,
    tableName: string,
    recordId: string,
    branchId?: string | null,
    oldData?: any,
    newData?: any,
) {
    await supabase.from('admin_audit_log').insert([{
        user_id: userId,
        user_email: userEmail,
        action,
        table_name: tableName,
        record_id: recordId,
        branch_id: branchId || null,
        old_data: oldData || null,
        new_data: newData || null,
    }])
}

// ═══════════════════════════════════════
// BRANCHES (super_admin only)
// ═══════════════════════════════════════

export async function getBranches() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name', { ascending: true })

    if (error) return { error: error.message, data: [] }
    return { data: data || [] }
}

export async function upsertBranch(formData: {
    id?: string
    name: string
    address?: string
    timezone?: string
    is_active?: boolean
}) {
    const { supabase, user, isSuperAdmin } = await requireAdmin()
    if (!isSuperAdmin) return { error: 'Sadece süper admin şube oluşturabilir' }
    const isNew = !formData.id

    if (!formData.name?.trim()) return { error: 'Şube adı zorunludur' }

    const payload = {
        name: formData.name.trim(),
        address: formData.address?.trim() || null,
        timezone: formData.timezone || 'Europe/Istanbul',
        is_active: formData.is_active ?? true,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        ...(isNew ? { created_by: user.id } : {}),
    }

    let result
    if (isNew) {
        result = await supabase.from('branches').insert([payload]).select().single()
    } else {
        result = await supabase.from('branches').update(payload).eq('id', formData.id).select().single()
    }

    if (result.error) return { error: result.error.message }
    await auditLog(supabase, user.id, user.email!, isNew ? 'CREATE' : 'UPDATE', 'branches', result.data.id, result.data.id, null, payload)
    revalidatePath('/admin')
    return { success: true, id: result.data.id }
}

// ═══════════════════════════════════════
// SERVICES (branch-scoped)
// ═══════════════════════════════════════

export async function getServices(branchId?: string) {
    const { supabase, branchId: myBranch, isSuperAdmin } = await requireAdmin(branchId)
    const bid = branchId || myBranch

    // 1. Get all services that are:
    //    - Global (branch_id IS NULL)
    //    - OR Private to this branch (branch_id = bid)
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
    if (error) return { error: error.message, data: [] }

    // 2. Transform data to Attach "effective" status for the branch
    const effectiveServices = services.map((s: any) => {
        // If it's a global service, check the branch_services junction
        const branchSettings = s.branch_services?.find((bs: any) => true) // Filtering done by RLS/Query if we could, but here we might get array. 
        // Actually, supabase query with foreign key might return array.
        // Let's rely on post-processing or specific query. 

        // Since we can't easily filter the nested relation by branch_id in a simple select without more complex syntax,
        // and we prioritized getting "global" services, the `branch_services` relation might return entries for OTHER branches if RLS allows.
        // BUT RLS for branch_services should restrict to "can_access_branch".
        // If I am BranchAdmin of B1, I only see branch_services for B1. 
        // So `s.branch_services[0]` should be my settings.

        const bs = bid
            ? s.branch_services?.find((b: any) => b.branch_id === bid)
            : null

        return {
            ...s,
            // If global, active status depends on junction. If no junction, default is TRUE (or FALSE? user preference. Migration said default true).
            // Let's say default is TRUE for global services unless explicitly disabled.
            // OR: Global services are available to everyone by default.
            effective_is_active: s.branch_id === null
                ? (bs ? bs.is_active : true)
                : s.is_active,

            // Allow overrides
            price: bs?.custom_price || s.price, // Assuming we add price to services later, currently not in schema but good to prepare
            duration_min: bs?.custom_duration_min || s.duration_min
        }
    })

    return { data: effectiveServices }
}

export async function upsertService(formData: {
    id?: string
    name: string
    description?: string
    duration_min?: number
    is_active?: boolean
    sort_order?: number
    branch_id?: string
}) {
    const { supabase, user, branchId, isSuperAdmin } = await requireAdmin(formData.branch_id)
    const isNew = !formData.id
    // If branch_id provided, use it. If not, and not super admin, fail. 
    // If super admin and no branch_id, it is GLOBAL.

    let bid = formData.branch_id
    if (!bid && !isSuperAdmin) {
        // Fallback to user's branch if they are not super admin trying to create global
        bid = branchId
    }
    // If bid is still null here, it means Super Admin is creating a GLOBAL service.

    if (!formData.name?.trim()) return { error: 'Hizmet adı zorunludur' }
    if (!bid && !isSuperAdmin) return { error: 'Şube bilgisi gerekli' }

    const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        duration_min: formData.duration_min || null,
        is_active: formData.is_active ?? true,
        sort_order: formData.sort_order ?? 0,
        branch_id: bid,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        ...(isNew ? { created_by: user.id } : {}),
    }

    let result
    if (isNew) {
        result = await supabase.from('services').insert([payload]).select().single()
    } else {
        result = await supabase.from('services').update(payload).eq('id', formData.id).select().single()
    }

    if (result.error) return { error: result.error.message }

    await auditLog(supabase, user.id, user.email!, isNew ? 'CREATE' : 'UPDATE', 'services', result.data.id, bid, null, payload)
    revalidatePath('/admin/services')
    return { success: true }
}

export async function toggleServiceAvailability(serviceId: string, branchId: string, is_active: boolean) {
    const { supabase, user } = await requireAdmin(branchId)

    // Check if it's a global service or local private service
    const { data: service } = await supabase.from('services').select('branch_id').eq('id', serviceId).single()

    if (service?.branch_id) {
        // It is a private branch service, update directly
        const { error } = await supabase
            .from('services')
            .update({ is_active, updated_at: new Date().toISOString(), updated_by: user.id })
            .eq('id', serviceId)
            .eq('branch_id', branchId) // Security check
        if (error) return { error: error.message }
    } else {
        // It is a global service, update junction table
        const { error } = await supabase
            .from('branch_services')
            .upsert({
                branch_id: branchId,
                service_id: serviceId,
                is_active,
                updated_at: new Date().toISOString(),
                updated_by: user.id
            }, { onConflict: 'branch_id, service_id' })
        if (error) return { error: error.message }
    }

    revalidatePath('/admin/services')
    return { success: true }
}

// Legacy toggle (renamed or kept for backward compat, but we prefer the explicit one above)
export async function toggleServiceActive(id: string, is_active: boolean) {
    // This function signature is missing branchId, which is critical now.
    // adapting to use user's branch.
    const { branchId } = await requireAdmin()
    if (!branchId) return { error: 'Şube seçilmedi' }
    return toggleServiceAvailability(id, branchId, is_active)
}

export async function deleteService(id: string) {
    const { supabase, user, branchId } = await requireAdmin()

    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) return { error: error.message }

    await auditLog(supabase, user.id, user.email!, 'DELETE', 'services', id, branchId)
    revalidatePath('/admin/services')
    return { success: true }
}

// ═══════════════════════════════════════
// VEHICLE CLASSES (branch-scoped)
// ═══════════════════════════════════════

export async function getVehicleClasses(branchId?: string) {
    // For pricing purposes, show all vehicle classes regardless of branch
    const supabase = await createClient()

    let query = supabase.from('vehicle_classes').select('*')
    query = query.order('sort_order', { ascending: true })

    const { data, error } = await query
    if (error) return { error: error.message, data: [] }
    return { data: data || [] }
}

export async function upsertVehicleClass(formData: {
    id?: string
    key: string
    label: string
    is_active?: boolean
    sort_order?: number
    branch_id?: string
}) {
    const { supabase, user, branchId } = await requireAdmin(formData.branch_id)
    const isNew = !formData.id
    const bid = formData.branch_id || branchId

    if (!formData.key?.trim() || !formData.label?.trim()) {
        return { error: 'Kod ve görünen isim zorunludur' }
    }
    if (!bid) return { error: 'Şube bilgisi gerekli' }

    const payload = {
        key: formData.key.trim().toLowerCase(),
        label: formData.label.trim(),
        is_active: formData.is_active ?? true,
        sort_order: formData.sort_order ?? 0,
        branch_id: bid,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        ...(isNew ? { created_by: user.id } : {}),
    }

    let result
    if (isNew) {
        result = await supabase.from('vehicle_classes').insert([payload]).select().single()
    } else {
        result = await supabase.from('vehicle_classes').update(payload).eq('id', formData.id).select().single()
    }

    if (result.error) {
        if (result.error.code === '23505') return { error: 'Bu kod zaten kullanılıyor' }
        return { error: result.error.message }
    }

    await auditLog(supabase, user.id, user.email!, isNew ? 'CREATE' : 'UPDATE', 'vehicle_classes', result.data.id, bid, null, payload)
    revalidatePath('/admin/vehicles')
    return { success: true }
}

export async function toggleVehicleClassActive(id: string, is_active: boolean) {
    const { supabase, user, branchId } = await requireAdmin()

    const { error } = await supabase
        .from('vehicle_classes')
        .update({ is_active, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('id', id)

    if (error) return { error: error.message }

    await auditLog(supabase, user.id, user.email!, 'TOGGLE', 'vehicle_classes', id, branchId, null, { is_active })
    revalidatePath('/admin/vehicles')
    return { success: true }
}

// ═══════════════════════════════════════
// PACKAGES (branch-scoped)
// ═══════════════════════════════════════

export async function getPackages(branchId?: string) {
    // For pricing purposes, show all packages regardless of branch
    // since pricing is branch-specific but packages/vehicle_classes should be available
    const supabase = await createClient()

    let query = supabase.from('packages').select(`
        *,
        package_items (
            id, service_id, is_base, sort_order,
            services ( id, name )
        )
    `)
    query = query.order('sort_order', { ascending: true }).order('name', { ascending: true })

    const { data, error } = await query
    if (error) return { error: error.message, data: [] }
    return { data: data || [] }
}

export async function upsertPackage(formData: {
    id?: string
    name: string
    description?: string
    is_active?: boolean
    sort_order?: number
    branch_id?: string
}) {
    const { supabase, user, branchId } = await requireAdmin(formData.branch_id)
    const isNew = !formData.id
    const bid = formData.branch_id || branchId

    if (!formData.name?.trim()) return { error: 'Paket adı zorunludur' }
    if (!bid) return { error: 'Şube bilgisi gerekli' }

    const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        is_active: formData.is_active ?? true,
        sort_order: formData.sort_order ?? 0,
        branch_id: bid,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        ...(isNew ? { created_by: user.id } : {}),
    }

    let result
    if (isNew) {
        result = await supabase.from('packages').insert([payload]).select().single()
    } else {
        result = await supabase.from('packages').update(payload).eq('id', formData.id).select().single()
    }

    if (result.error) return { error: result.error.message }

    await auditLog(supabase, user.id, user.email!, isNew ? 'CREATE' : 'UPDATE', 'packages', result.data.id, bid, null, payload)
    revalidatePath('/admin/packages')
    return { success: true, id: result.data.id }
}

export async function setPackageItems(
    packageId: string,
    items: { service_id: string; is_base: boolean; sort_order: number }[]
) {
    const { supabase, user, branchId } = await requireAdmin()

    await supabase.from('package_items').delete().eq('package_id', packageId)

    if (items.length > 0) {
        const rows = items.map(item => ({
            package_id: packageId,
            service_id: item.service_id,
            is_base: item.is_base,
            sort_order: item.sort_order,
        }))
        const { error } = await supabase.from('package_items').insert(rows)
        if (error) return { error: error.message }
    }

    await auditLog(supabase, user.id, user.email!, 'SET_ITEMS', 'package_items', packageId, branchId, null, { items })
    revalidatePath('/admin/packages')
    return { success: true }
}

export async function togglePackageActive(id: string, is_active: boolean) {
    const { supabase, user, branchId } = await requireAdmin()

    const { error } = await supabase
        .from('packages')
        .update({ is_active, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('id', id)

    if (error) return { error: error.message }

    await auditLog(supabase, user.id, user.email!, 'TOGGLE', 'packages', id, branchId, null, { is_active })
    revalidatePath('/admin/packages')
    return { success: true }
}

export async function deletePackage(id: string) {
    const { supabase, user, branchId } = await requireAdmin()

    const { error } = await supabase.from('packages').delete().eq('id', id)
    if (error) return { error: error.message }

    await auditLog(supabase, user.id, user.email!, 'DELETE', 'packages', id, branchId)
    revalidatePath('/admin/packages')
    return { success: true }
}

// ═══════════════════════════════════════
// PRICE LISTS (branch-scoped)
// ═══════════════════════════════════════

export async function getPriceLists(branchId?: string) {
    const { supabase, branchId: myBranch } = await requireAdmin(branchId)
    const bid = branchId || myBranch

    let query = supabase.from('price_lists').select('*')
    if (bid) query = query.eq('branch_id', bid)
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) return { error: error.message, data: [] }
    return { data: data || [] }
}

export async function upsertPriceList(formData: {
    id?: string
    name: string
    valid_from?: string
    valid_to?: string
    is_active?: boolean
    branch_id?: string
}) {
    const { supabase, user, branchId } = await requireAdmin(formData.branch_id)
    const isNew = !formData.id
    const bid = formData.branch_id || branchId

    if (!formData.name?.trim()) return { error: 'Liste adı zorunludur' }
    if (!bid) return { error: 'Şube bilgisi gerekli' }

    const payload = {
        name: formData.name.trim(),
        valid_from: formData.valid_from || null,
        valid_to: formData.valid_to || null,
        is_active: formData.is_active ?? true,
        branch_id: bid,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        ...(isNew ? { created_by: user.id } : {}),
    }

    let result
    if (isNew) {
        result = await supabase.from('price_lists').insert([payload]).select().single()
    } else {
        result = await supabase.from('price_lists').update(payload).eq('id', formData.id).select().single()
    }

    if (result.error) return { error: result.error.message }

    await auditLog(supabase, user.id, user.email!, isNew ? 'CREATE' : 'UPDATE', 'price_lists', result.data.id, bid, null, payload)
    revalidatePath('/admin/pricing')
    return { success: true, id: result.data.id }
}

// ═══════════════════════════════════════
// PRICE RULES
// ═══════════════════════════════════════

export async function getPriceRules(priceListId: string) {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
        .from('price_rules')
        .select(`
            *,
            packages ( id, name ),
            vehicle_classes ( id, label )
        `)
        .eq('price_list_id', priceListId)
        .order('created_at', { ascending: true })

    if (error) return { error: error.message, data: [] }
    return { data: data || [] }
}

export async function upsertPriceRule(formData: {
    id?: string
    price_list_id: string
    package_id: string
    vehicle_class_id: string
    amount_krs: number
    currency?: string
}) {
    const { supabase, user, branchId } = await requireAdmin()
    const isNew = !formData.id

    if (!formData.package_id || !formData.vehicle_class_id || !formData.amount_krs) {
        return { error: 'Tüm alanlar zorunludur' }
    }

    const payload = {
        price_list_id: formData.price_list_id,
        package_id: formData.package_id,
        vehicle_class_id: formData.vehicle_class_id,
        amount_krs: formData.amount_krs,
        currency: formData.currency || 'TRY',
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        ...(isNew ? { created_by: user.id } : {}),
    }

    let result
    if (isNew) {
        result = await supabase.from('price_rules').insert([payload]).select().single()
    } else {
        result = await supabase.from('price_rules').update(payload).eq('id', formData.id).select().single()
    }

    if (result.error) {
        if (result.error.code === '23505') return { error: 'Bu paket ve araç sınıfı kombinasyonu zaten mevcut' }
        return { error: result.error.message }
    }

    await auditLog(supabase, user.id, user.email!, isNew ? 'CREATE' : 'UPDATE', 'price_rules', result.data.id, branchId, null, payload)
    revalidatePath('/admin/pricing')
    return { success: true }
}

export async function deletePriceRule(id: string) {
    const { supabase, user, branchId } = await requireAdmin()

    const { error } = await supabase.from('price_rules').delete().eq('id', id)
    if (error) return { error: error.message }

    await auditLog(supabase, user.id, user.email!, 'DELETE', 'price_rules', id, branchId)
    revalidatePath('/admin/pricing')
    return { success: true }
}

// ═══════════════════════════════════════
// STAFF PROFILES (branch-scoped)
// ═══════════════════════════════════════

export async function checkUserRole() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: staff } = await supabase
        .from('staff_profiles')
        .select('role, full_name, branch_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

    return staff
}

export async function getStaffProfiles(branchId?: string) {
    try {
        const { supabase, branchId: myBranch, isSuperAdmin, role } = await requireAdmin(branchId)
        const bid = branchId || myBranch

        let query = supabase.from('staff_profiles').select('*')
        
        // Exclude super_admin and partner - they're managed in /admin/users
        query = query.or('role.eq.staff,role.eq.manager,role.eq.branch_admin')
        
        // Filter by branch
        if (bid) {
            query = query.eq('branch_id', bid)
        }
        
        query = query.order('full_name', { ascending: true })

        const { data, error } = await query
        if (error) return { error: error.message, data: [] }
        return { data: data || [] }
    } catch (err: any) {
        console.error('getStaffProfiles error:', err.message)
        return { error: err.message, data: [] }
    }
}

export async function getAllStaff() {
    // Only for super_admin - returns all users (super_admin and partner) across all branches
    const { supabase, isSuperAdmin } = await requireAdmin()
    
    if (!isSuperAdmin) {
        return { error: 'Yetkiniz yok', data: [] }
    }

    const { data, error } = await supabase
        .from('staff_profiles')
        .select('*, branches(name)')
        .or('role.eq.super_admin,role.eq.partner')
        .order('full_name', { ascending: true })

    if (error) return { error: error.message, data: [] }
    return { data: data || [] }
}

export async function upsertStaffProfile(formData: {
    id?: string
    email: string
    full_name: string
    phone?: string
    role: string
    is_active?: boolean
    branch_id?: string
    password?: string
}) {
    const { supabase, user, branchId, isSuperAdmin, role: callerRole } = await requireAdmin(formData.branch_id)
    const isNew = !formData.id
    const bid = formData.branch_id || branchId

    if (!formData.email?.trim() || !formData.full_name?.trim()) {
        return { error: 'E-posta ve ad soyad zorunludur' }
    }

    // Password required for new staff
    if (isNew && !formData.password?.trim()) {
        return { error: 'Yeni personel için şifre zorunludur' }
    }

    // Role permission checks
    if (formData.role === 'super_admin' && callerRole !== 'super_admin') {
        return { error: 'Sadece süper admin bu rolü atayabilir' }
    }
    // Partners cannot create partners or super admins (enforced by the check above for super_admin, adding partner specific check if needed)
    if (formData.role === 'partner' && callerRole !== 'super_admin') {
        return { error: 'Sadece süper admin iş ortağı atayabilir' }
    }

    if (formData.role === 'branch_admin' && !isSuperAdmin) {
        return { error: 'Sadece süper admin veya iş ortağı şube yöneticisi atayabilir' }
    }
    if (callerRole === 'manager' && !['staff', 'manager'].includes(formData.role)) {
        return { error: 'Yöneticiler sadece personel ve yönetici ekleyebilir' }
    }

    let authUserId: string | undefined

    // Create auth user for new staff members
    if (isNew) {
        try {
            const adminClient = createAdminClient()
            const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
                email: formData.email.trim().toLowerCase(),
                password: formData.password!,
                email_confirm: true,
                user_metadata: {
                    full_name: formData.full_name.trim(),
                },
            })

            if (authError) {
                if (authError.message?.includes('already been registered')) {
                    return { error: 'Bu e-posta adresi zaten kayıtlı' }
                }
                return { error: `Kullanıcı oluşturulamadı: ${authError.message}` }
            }

            authUserId = authUser.user.id
        } catch (err: any) {
            return { error: `Kullanıcı oluşturulamadı: ${err.message}` }
        }
    }

    const payload = {
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        phone: formData.phone?.trim() || null,
        role: formData.role || 'staff',
        branch_id: ['super_admin', 'partner'].includes(formData.role) ? null : bid,
        is_active: formData.is_active ?? true,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        ...(isNew ? { created_by: user.id } : {}),
        ...(authUserId ? { user_id: authUserId } : {}),
    }

    let result
    if (isNew) {
        result = await supabase.from('staff_profiles').insert([payload]).select().single()
    } else {
        result = await supabase.from('staff_profiles').update(payload).eq('id', formData.id).select().single()
    }

    if (result.error) {
        if (result.error.code === '23505') return { error: 'Bu e-posta zaten kayıtlı' }
        return { error: result.error.message }
    }

    await auditLog(supabase, user.id, user.email!, isNew ? 'CREATE' : 'UPDATE', 'staff_profiles', result.data.id, bid, null, payload)
    revalidatePath('/admin/staff')
    revalidatePath('/admin/users')
    return { success: true }
}

export async function toggleStaffActive(id: string, is_active: boolean) {
    const { supabase, user, branchId } = await requireAdmin()

    const { error } = await supabase
        .from('staff_profiles')
        .update({ is_active, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('id', id)

    if (error) return { error: error.message }

    await auditLog(supabase, user.id, user.email!, 'TOGGLE', 'staff_profiles', id, branchId, null, { is_active })
    revalidatePath('/admin/staff')
    return { success: true }
}

// ═══════════════════════════════════════
// SETTINGS (branch-scoped)
// ═══════════════════════════════════════

export async function getSettings(branchId?: string) {
    const { supabase, branchId: myBranch } = await requireAdmin(branchId)
    const bid = branchId || myBranch

    let query = supabase.from('business_settings').select('*')
    if (bid) query = query.eq('branch_id', bid)
    query = query.order('key', { ascending: true })

    const { data, error } = await query
    if (error) return { error: error.message, data: [] }
    return { data: data || [] }
}

export async function updateSetting(key: string, value: string, branchId?: string) {
    const { supabase, user, branchId: myBranch } = await requireAdmin(branchId)
    const bid = branchId || myBranch

    const { error } = await supabase
        .from('business_settings')
        .update({ value, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('key', key)
        .eq('branch_id', bid)

    if (error) return { error: error.message }

    await auditLog(supabase, user.id, user.email!, 'UPDATE', 'business_settings', key, bid, null, { key, value })
    revalidatePath('/admin/settings')
    return { success: true }
}

// ═══════════════════════════════════════
// AUDIT LOG (branch-scoped)
// ═══════════════════════════════════════

export async function getAuditLog(limit = 50, offset = 0, branchId?: string) {
    const { supabase, branchId: myBranch, isSuperAdmin } = await requireAdmin(branchId)
    const bid = branchId || myBranch

    let query = supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact' })
    if (!isSuperAdmin && bid) query = query.eq('branch_id', bid)
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) return { error: error.message, data: [], count: 0 }
    return { data: data || [], count: count || 0 }
}
