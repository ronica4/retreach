import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { daysUntilDeadline, draftDeadlineNotification } from '@/lib/notification-helpers'

// Generates deadline reminder notifications for a specific retreat on demand.
// Called when the manager clicks "Generate deadline reminders" in the UI.

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { retreatId } = await req.json()
    if (!retreatId) return NextResponse.json({ error: 'retreatId required' }, { status: 400 })

    // Verify ownership
    const { data: retreat } = await supabase
      .from('retreats')
      .select('*')
      .eq('id', retreatId)
      .eq('manager_id', user.id)
      .single()

    if (!retreat) return NextResponse.json({ error: 'Retreat not found' }, { status: 404 })

    // Get all vendors with upcoming deadlines (next 30 days)
    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const { data: vendors } = await supabase
      .from('vendors')
      .select('*')
      .eq('retreat_id', retreatId)
      .not('deadline', 'is', null)
      .gte('deadline', new Date().toISOString().slice(0, 10))
      .lte('deadline', thirtyDaysOut.toISOString().slice(0, 10))
      .not('status', 'eq', 'completed')

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({ message: 'No upcoming vendor deadlines in the next 30 days', created: 0 })
    }

    let created = 0

    for (const vendor of vendors) {
      const days = daysUntilDeadline(vendor.deadline)
      const triggerKey = `vendor_${vendor.id}_manual_${new Date().toISOString().slice(0, 10)}`

      // Don't re-generate if already queued today for this vendor
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

      const { error } = await supabase.from('notifications').insert({
        retreat_id: retreatId,
        recipient_type: 'vendor',
        recipient_id: vendor.id,
        recipient_name: vendor.contact_name ?? vendor.name,
        recipient_email: vendor.contact_email ?? null,
        channel: 'email',
        subject,
        body,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
        trigger_key: triggerKey,
      })

      if (!error) created++
    }

    return NextResponse.json({
      message: `Queued ${created} reminder${created !== 1 ? 's' : ''} for ${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}`,
      created,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
