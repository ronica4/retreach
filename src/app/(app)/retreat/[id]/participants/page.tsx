import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ParticipantsStage from '@/components/stages/ParticipantsStage'

interface Props { params: Promise<{ id: string }> }

export default async function ParticipantsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: retreat }, { data: participants }] = await Promise.all([
    supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
    supabase.from('participants').select('*').eq('retreat_id', id).order('created_at'),
  ])

  if (!retreat) notFound()

  return <ParticipantsStage retreat={retreat} participants={participants ?? []} />
}
