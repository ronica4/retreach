import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import HotelsStage from '@/components/stages/HotelsStage'

interface Props { params: Promise<{ id: string }> }

export default async function HotelsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: retreat }, { data: vendors }] = await Promise.all([
    supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
    supabase.from('vendors').select('*').eq('retreat_id', id).eq('category', 'hotel').order('created_at'),
  ])

  if (!retreat) notFound()

  return <HotelsStage retreat={retreat} vendors={vendors ?? []} />
}
