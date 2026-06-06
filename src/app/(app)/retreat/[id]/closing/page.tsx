import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ClosingStage from '@/components/stages/ClosingStage'

interface Props { params: Promise<{ id: string }> }

export default async function ClosingPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: retreat }, { data: vendors }, { data: participants }] = await Promise.all([
    supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
    supabase.from('vendors').select('*').eq('retreat_id', id).order('name'),
    supabase.from('participants').select('*').eq('retreat_id', id).order('name'),
  ])

  if (!retreat) notFound()

  return <ClosingStage retreat={retreat} vendors={vendors ?? []} participants={participants ?? []} />
}
