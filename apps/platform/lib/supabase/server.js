import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side Supabase client for use in Server Components. Reads the
// session from cookies; writes are a no-op here since Server Components
// can't set cookies — middleware handles refreshing the session cookie.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component render — cookies can't be
            // written here. Safe to ignore; middleware refreshes the session.
          }
        },
      },
    }
  )
}
