import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Session is stored in cookies (not
// localStorage) so middleware and Server Components can see it too.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
