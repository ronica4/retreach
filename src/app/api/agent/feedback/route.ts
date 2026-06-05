import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { interactionId, accepted } = await req.json()

  await supabase
    .from('ai_interactions')
    .update({ accepted })
    .eq('id', interactionId)
    .eq('manager_id', user.id)

  return NextResponse.json({ ok: true })
}
