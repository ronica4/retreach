import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import NotificationsStage from '@/components/stages/NotificationsStage'

interface Props { params: Promise<{ id: string }> }

export default async function NotificationsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: retreat }, { data: notifications }] = await Promise.all([
    supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
    supabase.from('notifications').select('*').eq('retreat_id', id).order('created_at', { ascending: false }),
  ])

  if (!retreat) notFound()

  return (
    <NotificationsStage
      retreat={retreat}
      notifications={notifications ?? []}
    />
  )
}
