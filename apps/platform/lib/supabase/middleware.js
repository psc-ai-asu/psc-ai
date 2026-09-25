import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Refreshes the Supabase session cookie (if needed) and reports the
// current user. Called from the root middleware.js on every request.
export async function updateSession(request) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() re-validates against Supabase's auth server (unlike
  // getSession(), which just trusts the cookie) — this is what refreshes
  // an expired access token using the refresh token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
