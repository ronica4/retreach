import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import VendorsStage from '@/components/stages/VendorsStage'

interface Props { params: Promise<{ id: string }> }

export default async function VendorsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: retreat }, { data: vendors }] = await Promise.all([
    supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
    supabase.from('vendors').select('*').eq('retreat_id', id).order('created_at'),
  ])

  if (!retreat) notFound()

  return <VendorsStage retreat={retreat} vendors={vendors ?? []} />
}
