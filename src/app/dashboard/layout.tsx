import { AppSidebar } from '@/components/AppSidebar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-zinc-950">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto p-8 text-zinc-100">
                {children}
            </main>
        </div>
    )
}
