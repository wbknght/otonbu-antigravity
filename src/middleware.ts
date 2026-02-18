import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: { headers: request.headers },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session (this also gives us the user)
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Guard /dashboard and /admin — must be logged in
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Fetch staff profile
        const { data: staff } = await supabase
            .from('staff_profiles')
            .select('role, branch_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single()

        if (!staff) {
            // No staff profile → no access to any protected route
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // /admin routes: super_admin, partner, branch_admin, or manager only
        if (pathname.startsWith('/admin')) {
            const adminRoles = ['super_admin', 'partner', 'branch_admin', 'manager']
            if (!adminRoles.includes(staff.role)) {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
