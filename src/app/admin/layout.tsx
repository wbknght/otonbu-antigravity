import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminBranchSelector } from '@/components/admin/AdminBranchSelector'
import { BranchProvider } from '@/contexts/BranchContext'
import { getSessionContext } from '@/lib/session'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSessionContext()
    if (!session) redirect('/login')
    if (!['super_admin', 'partner', 'branch_admin', 'manager'].includes(session.role)) {
        redirect('/dashboard')
    }

    return (
        <BranchProvider
            initialBranch={session.branch}
            userRole={session.role}
            userId={session.userId}
            userEmail={session.email}
            allBranches={session.allBranches}
        >
            <div className="flex h-screen bg-zinc-950">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto p-8 text-zinc-100">
                    <AdminBranchSelector />
                    {children}
                </main>
            </div>
        </BranchProvider>
    )
}
