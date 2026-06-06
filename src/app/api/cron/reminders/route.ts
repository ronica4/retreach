import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { daysUntilDeadline, draftDeadlineNotification } from '@/lib/notification-helpers'

// This endpoint is called by Vercel Cron every day at 8am UTC.
// It scans ALL retreats for vendor deadlines within 7 days and queues
// personalized reminder notifications. No browser or user session needed.
//
// In production: swap the insert for a real delivery call (Resend, Twilio, FCM).
// The trigger_key prevents duplicate notifications for the same vendor+window.

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Vercel sends Authorization: Bearer <CRON_SECRET> with every cron invocation.
// Set CRON_SECRET in your Vercel project environment variables.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // local dev: allow without secret
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = serviceClient()
  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Load all vendors with deadlines in the next 7 days that aren't completed
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*, retreat:retreats(*)')
    .not('deadline', 'is', null)
    .gte('deadline', now.toISOString().slice(0, 10))
    .lte('deadline', sevenDaysOut.toISOString().slice(0, 10))
    .not('status', 'eq', 'completed')
    .not('contact_email', 'is', null)

  if (error) {
    console.error('Cron: vendor query failed', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!vendors || vendors.length === 0) {
    return NextResponse.json({ message: 'No upcoming deadlines found', created: 0 })
  }

  // Only fire reminders at the 7, 3, and 1-day marks
  const REMINDER_DAYS = [7, 3, 1, 0]
  let created = 0

  for (const vendor of vendors) {
    const retreat = vendor.retreat
    if (!retreat) continue

    const days = daysUntilDeadline(vendor.deadline)
    if (!REMINDER_DAYS.includes(days)) continue

    const triggerKey = `vendor_${vendor.id}_days_${days}`

    // Skip if already queued for this window
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('trigger_key', triggerKey)
      .maybeSingle()

    if (existing) continue

    const { subject, body } = draftDeadlineNotification(
      { ...vendor, retreat },
      days,
    )

    const { error: insertError } = await supabase.from('notifications').insert({
      retreat_id: retreat.id,
      recipient_type: 'vendor',
      recipient_id: vendor.id,
      recipient_name: vendor.contact_name ?? vendor.name,
      recipient_email: vendor.contact_email,
      channel: 'email',
      subject,
      body,
      status: 'pending',
      scheduled_for: new Date().toISOString(),
      trigger_key: triggerKey,
    })

    if (!insertError) created++

    // ── PRODUCTION HOOK ──────────────────────────────────────────────────────
    // To enable real delivery, replace the insert above with:
    //
    // await resend.emails.send({
    //   from: 'reminders@retreach.app',
    //   to: vendor.contact_email,
    //   subject,
    //   html: body.replace(/\n/g, '<br>'),
    // })
    //
    // Or for SMS via Twilio:
    // await twilioClient.messages.create({
    //   body: `${subject}\n\n${body}`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: vendor.contact_phone,
    // })
    // ────────────────────────────────────────────────────────────────────────
  }

  console.log(`Cron: queued ${created} reminder notifications`)
  return NextResponse.json({
    message: `Queued ${created} reminder notification${created !== 1 ? 's' : ''}`,
    created,
    scanned: vendors.length,
  })
}
