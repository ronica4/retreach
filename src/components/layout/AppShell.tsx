'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Profile } from '@/types'
import { cn } from '@/lib/utils'
import { LayoutDashboard, LogOut, User, Sprout } from 'lucide-react'

interface Props {
  profile: Profile | null
  children: React.ReactNode
}

export default function AppShell({ profile, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-full flex flex-col bg-stone-50">
      <header className="bg-white/70 backdrop-blur border-b border-stone-200/70 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-emerald-700 grid place-items-center text-white">
              <Sprout size={14} />
            </div>
            <span className="text-base font-semibold text-stone-800">RetReach</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              )}
            >
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <User size={15} />
              <span>{profile?.full_name || profile?.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 transition-colors"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
