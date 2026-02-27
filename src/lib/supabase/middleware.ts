import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 🛡️ 세션 확인 (Auth Guard)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // API 경로 보호: 로그인하지 않은 사용자가 /api/analyze 호출 시 차단
  if (request.nextUrl.pathname.startsWith('/api/analyze') && !user) {
    return NextResponse.json(
      { error: 'Unauthorized: Please log in to use this feature.' },
      { status: 401 }
    )
  }

  // 👇 주석 처리 완료: 대시보드 진입은 NextAuth가 관리하도록 Supabase 미들웨어에서는 검사 패스!
  /*
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    console.log('[Middleware] Unauthorized access to dashboard. Redirecting to /login');
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  */

  return response
}