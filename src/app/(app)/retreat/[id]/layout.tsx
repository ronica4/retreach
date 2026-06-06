import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RetreatSidebar from '@/components/retreat/RetreatSidebar'

interface Props {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function RetreatLayout({ children, params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: retreat },
    { count: vendorCount },
    { count: participantCount },
  ] = await Promise.all([
    supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
    supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('retreat_id', id),
    supabase.from('participants').select('*', { count: 'exact', head: true }).eq('retreat_id', id),
  ])

  if (!retreat) notFound()

  return (
    <div className="h-screen flex overflow-hidden bg-stone-50">
      <RetreatSidebar
        retreat={retreat}
        vendorCount={vendorCount ?? 0}
        participantCount={participantCount ?? 0}
      />
      <main className="flex-1 min-w-0 overflow-y-auto nice-scroll">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
