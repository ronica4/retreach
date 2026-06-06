import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ContentStage from '@/components/stages/ContentStage'

interface Props { params: Promise<{ id: string }> }

export default async function ContentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: retreat } = await supabase
    .from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single()

  if (!retreat) notFound()

  return <ContentStage retreatId={id} />
}
