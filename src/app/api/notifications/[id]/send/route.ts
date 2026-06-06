import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// .trim() strips a stray BOM (U+FEFF) from a pasted key, which would otherwise
// make Resend's fetch throw "Cannot convert argument to ByteString".
const cleanEnv = (v: string | undefined) => (v ?? '').trim()

function getResend() {
  return new Resend(cleanEnv(process.env.RESEND_API_KEY))
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: notification } = await supabase
      .from('notifications')
      .select('*, retreat:retreats(manager_id)')
      .eq('id', id)
      .single()

    if (!notification) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (notification.retreat?.manager_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (notification.channel === 'email') {
      if (!notification.recipient_email) {
        return NextResponse.json({ error: 'No recipient email on this notification' }, { status: 400 })
      }
      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
      }
      const resend = getResend()
      const { error: sendError } = await resend.emails.send({
        from: 'RetReach <onboarding@resend.dev>',
        to: notification.recipient_email,
        subject: notification.subject ?? '(no subject)',
        html: notification.body
          ? notification.body.replace(/\n/g, '<br>')
          : '',
      })
      if (sendError) throw new Error(sendError.message)
    }

    const { error } = await supabase
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
