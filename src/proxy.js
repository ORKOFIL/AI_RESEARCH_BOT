import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
    const requestHeaders = new Headers(request.headers)
    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    const isLocalhost = request.nextUrl.hostname === 'localhost';

    const supabaseServer = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, {
                            ...options,
                            // Якщо локалка — ставимо 'localhost', якщо деплой — дозволяємо браузеру самому визначити домен автоматично
                            domain: isLocalhost ? 'localhost' : undefined,
                            // Якщо локалка — false, якщо деплой (production) — ТІЛЬКИ true (через https)
                            secure: !isLocalhost,
                        })
                    })
                },
            }
        }
    )

    // 2. Отримуємо користувача
    const { data: { user } } = await supabaseServer.auth.getUser()

    const isDashboard = request.nextUrl.pathname.startsWith('/research')
    const isAuthPage = request.nextUrl.pathname.startsWith('/main')

    // Тепер лог покаже правду в терміналі (консолі VS Code)
    if (isDashboard) {
        console.log("=== MIDDLEWARE CHECK ===");
        console.log("User email found:", user?.email || "NOT LOGGED IN (NULL)");
        console.log("========================");
        //console.log(user)
    }

    if (!user && isDashboard) {
        return NextResponse.redirect(new URL('/main', request.url))
    }

    if (user && isAuthPage) {
        return NextResponse.redirect(new URL('/research', request.url))
    }
}

export const config = {
    matcher: [
        /*
         * Збіг з усіма запитами, окрім тих, що починаються з:
         * - api (внутрішні API роути)
         * - _next/static (статичні файли)
         * - _next/image (оптимізовані зображення)
         * - favicon.ico (іконка)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}