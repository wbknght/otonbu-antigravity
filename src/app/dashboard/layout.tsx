import { AppSidebar } from '@/components/AppSidebar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-zinc-950">
            <AppSidebar />
            {/* pt-14 on mobile to account for the fixed top bar, lg:pt-0 since sidebar is static */}
            <main className="flex-1 overflow-y-auto p-4 pt-[72px] lg:p-8 lg:pt-8 text-zinc-100">
                {children}
            </main>
        </div>
    )
}
