import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ybrzysgpuiysroajzctm.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlicnp5c2dwdWl5c3JvYWp6Y3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwODkxMTcsImV4cCI6MjEwMTY2NTExN30.RzjjqvX4vXC49w4CGaw9ij4c2K0xjQ3KN5tL3LyXbJU'

let clientInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return clientInstance
}
