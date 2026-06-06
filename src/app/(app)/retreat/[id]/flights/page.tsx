import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import FlightsStage from '@/components/stages/FlightsStage'

interface Props { params: Promise<{ id: string }> }

export default async function FlightsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: retreat }, { data: vendors }] = await Promise.all([
    supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
    supabase.from('vendors').select('*').eq('retreat_id', id).eq('category', 'flights').order('created_at'),
  ])

  if (!retreat) notFound()

  return <FlightsStage retreat={retreat} vendors={vendors ?? []} />
}
