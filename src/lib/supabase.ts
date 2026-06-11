import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// For raw REST calls that the supabase-js client cannot make, e.g. the
// keepalive fetch that releases the session lock during pagehide.
export const supabaseRestConfig = isSupabaseConfigured
  ? { url: supabaseUrl!, anonKey: supabaseAnonKey! }
  : null

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null

