import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { retreatId, subject, message, scheduledFor } = await req.json()
    if (!retreatId || !subject || !scheduledFor) {
      return NextResponse.json({ error: 'retreatId, subject, and scheduledFor are required' }, { status: 400 })
    }

    const { data: retreat } = await supabase
      .from('retreats').select('id').eq('id', retreatId).eq('manager_id', user.id).single()
    if (!retreat) return NextResponse.json({ error: 'Retreat not found' }, { status: 404 })

    const { error } = await supabase.from('notifications').insert({
      retreat_id: retreatId,
      recipient_type: 'manager',
      recipient_id: user.id,
      recipient_name: 'Me',
      recipient_email: user.email,
      channel: 'email',
      subject,
      body: message ?? '',
      status: 'pending',
      scheduled_for: scheduledFor,
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
