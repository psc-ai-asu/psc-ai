import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role Supabase client: bypasses RLS, so only server code that has
// already decided who the caller is may use it (today, trace ingest).
// It has no user session; auth.uid() is null inside its queries.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
