import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ActiveView from '@/components/retreat/ActiveView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ActivePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: retreat }, { data: vendors }, { data: participants }, { data: schedule }] =
    await Promise.all([
      supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
      supabase.from('vendors').select('*').eq('retreat_id', id).order('name'),
      supabase.from('participants').select('*').eq('retreat_id', id).order('name'),
      supabase.from('schedule_items').select('*, vendor:vendors(*)').eq('retreat_id', id).order('date').order('start_time'),
    ])

  if (!retreat) notFound()

  return (
    <ActiveView
      retreat={retreat}
      vendors={vendors ?? []}
      participants={participants ?? []}
      schedule={schedule ?? []}
    />
  )
}
