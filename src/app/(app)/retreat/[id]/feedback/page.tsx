import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import FeedbackStage from '@/components/stages/FeedbackStage'

interface Props { params: Promise<{ id: string }> }

export default async function FeedbackPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: retreat } = await supabase
    .from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single()

  if (!retreat) notFound()

  return <FeedbackStage retreatId={id} />
}
