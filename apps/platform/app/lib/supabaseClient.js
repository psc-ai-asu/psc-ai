import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Singleton for files that import { supabase } directly (e.g. the platform page)
export const supabase = createClient()