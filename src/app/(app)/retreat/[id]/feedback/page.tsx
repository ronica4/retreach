import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import FeedbackStage from '@/components/stages/FeedbackStage'

interface Props { params: Promise<{ id: string }> }

export default async function FeedbackPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: retreat },
    { data: participantFeedback },
    { data: managerFeedback },
    { data: feedbackQuestionnaire },
  ] = await Promise.all([
    supabase.from('retreats').select('*').eq('id', id).eq('manager_id', user.id).single(),
    supabase.from('participant_feedback').select('*').eq('retreat_id', id).order('submitted_at', { ascending: false }),
    supabase.from('manager_feedback').select('*').eq('retreat_id', id).single(),
    supabase.from('feedback_questionnaires').select('*').eq('retreat_id', id).single(),
  ])

  if (!retreat) notFound()

  return (
    <FeedbackStage
      retreat={retreat}
      participantFeedback={participantFeedback ?? []}
      managerFeedback={managerFeedback ?? null}
      feedbackQuestionnaire={feedbackQuestionnaire ?? null}
    />
  )
}
