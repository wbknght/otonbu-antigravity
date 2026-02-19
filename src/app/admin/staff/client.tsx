'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Search, ToggleLeft, ToggleRight, UserCircle, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n/tr'
import { FormModal } from '@/components/admin/FormModal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { upsertStaffProfile, toggleStaffActive, deleteStaffProfile } from '@/app/actions/admin'
import { useBranch } from '@/contexts/BranchContext'

interface StaffProfile {
    id: string
    email: string
    full_name: string
    phone: string | null
    role: string
    is_active: boolean
    user_id: string | null
}

const roleBadgeColors: Record<string, string> = {
    super_admin: 'bg-purple-900/30 text-purple-400',
    branch_admin: 'bg-red-900/30 text-red-400',
    manager: 'bg-yellow-900/30 text-yellow-400',
    staff: 'bg-brand/20 text-brand',
    partner: 'bg-indigo-900/30 text-indigo-400',
}

function getStaffFields(isEditing: boolean, callerRole: string | null) {
    // Role options based on caller's role
    const allRoles = [
        { value: 'staff', label: tr.staff.roles.staff },
        { value: 'manager', label: tr.staff.roles.manager },
        { value: 'branch_admin', label: tr.staff.roles.branch_admin },
    ]

    const roleOptions = callerRole === 'super_admin' || callerRole === 'partner'
        ? allRoles
        : callerRole === 'branch_admin'
            ? allRoles.filter(r => ['staff', 'manager'].includes(r.value))
            : allRoles.filter(r => ['staff', 'manager'].includes(r.value))

    const fields: any[] = [
        { key: 'full_name', label: tr.staff.name, type: 'text' as const, required: true, placeholder: 'Ahmet Yılmaz' },
        { key: 'email', label: tr.staff.email, type: 'text' as const, required: true, placeholder: 'ahmet@ornek.com' },
        ...(!isEditing ? [
            { key: 'password', label: 'Şifre', type: 'password' as const, required: true, placeholder: 'Giriş şifresi' },
        ] : []),
        { key: 'phone', label: tr.staff.phone, type: 'text' as const, placeholder: '0532 xxx xx xx' },
        {
            key: 'role', label: tr.staff.role, type: 'select' as const,
            options: roleOptions,
        },
        { key: 'is_active', label: tr.common.active, type: 'checkbox' as const },
    ]

    return fields
}

export function StaffClient({ initialStaff, branchId }: { initialStaff: StaffProfile[], branchId?: string }) {
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<StaffProfile | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<StaffProfile | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const { userRole, currentBranch, branches, isSuperAdmin } = useBranch()

    // Use URL branchId if available, otherwise fall back to context
    const activeBranchId = branchId || currentBranch?.id

    const filtered = initialStaff.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    )

    function handleToggle(staff: StaffProfile) {
        startTransition(async () => {
            await toggleStaffActive(staff.id, !staff.is_active)
        })
    }

    function handleDelete() {
        if (!confirmDelete) return
        startTransition(async () => {
            const result = await deleteStaffProfile(confirmDelete.id)
            setConfirmDelete(null)
            if (!result?.error) router.refresh()
        })
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">{tr.staff.title}</h1>
                <button
                    onClick={() => { setEditing(null); setModalOpen(true) }}
                    className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    {tr.staff.addNew}
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={tr.common.search}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand"
                />
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map(staff => (
                    <div
                        key={staff.id}
                        className={cn(
                            'bg-zinc-900 border rounded-xl p-5 flex items-start gap-4 transition-all',
                            staff.is_active ? 'border-zinc-800' : 'border-zinc-800 opacity-60'
                        )}
                    >
                        <div className="bg-zinc-800 rounded-full p-3">
                            <UserCircle className="w-6 h-6 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-white truncate">{staff.full_name}</span>
                                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', roleBadgeColors[staff.role] || '')}>
                                    {(tr.staff.roles as any)[staff.role] || staff.role}
                                </span>
                            </div>
                            <div className="text-xs text-zinc-500">{staff.email}</div>
                            {staff.phone && <div className="text-xs text-zinc-500 mt-0.5">{staff.phone}</div>}
                            <div className="flex items-center gap-1 mt-2">
                                {staff.user_id ? (
                                    <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">Bağlı</span>
                                ) : (
                                    <span className="text-[10px] bg-zinc-700/50 text-zinc-500 px-2 py-0.5 rounded-full">Bekleniyor</span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => { setEditing(staff); setModalOpen(true) }}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleToggle(staff)}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
                            >
                                {staff.is_active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setConfirmDelete(staff)}
                                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-zinc-500">{tr.common.noData}</div>
                )}
            </div>

            {/* Modal */}
            <FormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? tr.staff.edit : tr.staff.addNew}
                fields={getStaffFields(!!editing, userRole)}
                initialData={editing || { role: 'staff', is_active: true }}
                onSubmit={async (data) => upsertStaffProfile({
                    id: editing?.id,
                    email: data.email,
                    full_name: data.full_name,
                    phone: data.phone,
                    role: data.role,
                    is_active: data.is_active,
                    password: data.password,
                    branch_id: activeBranchId,
                })}
            />

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title={tr.common.delete}
                message="Bu personeli silmek istediğinize emin misiniz?"
                confirmLabel={tr.common.delete}
                loading={isPending}
            />
        </div>
    )
}
