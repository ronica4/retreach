import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import AgendaStage from '@/components/stages/AgendaStage'

interface Props { params: Promise<{ id: string }> }

export default async function AgendaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: retreat }, { data: schedule }, { data: vendors }] = await Promise.all([
    supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
    supabase.from('schedule_items').select('*, vendor:vendors(*)').eq('retreat_id', id).order('date').order('start_time'),
    supabase.from('vendors').select('*').eq('retreat_id', id).order('name'),
  ])

  if (!retreat) notFound()

  return <AgendaStage retreat={retreat} schedule={schedule ?? []} vendors={vendors ?? []} />
}
