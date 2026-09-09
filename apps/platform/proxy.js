import { NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

const PROTECTED_PREFIXES = ['/developer', '/review', '/agents']

export async function proxy(request) {
  const { response, user } = await updateSession(request)
  const { pathname, search } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === '/login' && user) {
    const next = request.nextUrl.searchParams.get('next') || '/'
    return NextResponse.redirect(new URL(next, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
