import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// .trim() also strips a stray BOM (U+FEFF), which would otherwise make
// supabase-js throw "Cannot convert argument to ByteString" on the auth header.
const cleanEnv = (v: string | undefined) => (v ?? '').trim()

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
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
          } catch {}
        },
      },
    }
  )
}
