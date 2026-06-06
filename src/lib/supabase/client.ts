import { createBrowserClient } from '@supabase/ssr'

// .trim() also strips a stray BOM (U+FEFF), which would otherwise make
// supabase-js throw "Cannot convert argument to ByteString" on the auth header.
const cleanEnv = (v: string | undefined) => (v ?? '').trim()

export function createClient() {
  return createBrowserClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}
