import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { draftWelcomeNotification } from '@/lib/notification-helpers'

// Uses service role to bypass RLS — public participants can self-register
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ retreatId: string }> }) {
  try {
    const body = await request.json()
    const { retreatId } = await params
    const supabase = serviceClient()

    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json({ error: 'Name, email, and phone are required' }, { status: 400 })
    }

    const { error } = await supabase.from('participants').insert({
      retreat_id: retreatId,
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      age: body.age ? parseInt(body.age) : null,
      gender: body.gender || null,
      city_country: body.city_country || null,
      occupation: body.occupation || null,
      languages: body.languages || null,
      first_retreat: body.first_retreat === 'Yes' ? true : body.first_retreat === 'No' ? false : null,
      how_heard: body.how_heard || null,
      motivation: body.motivation || null,
      hoping_to_gain: body.hoping_to_gain || null,
      skills_to_share: body.skills_to_share || null,
      hobbies: body.hobbies || null,
      fun_fact: body.fun_fact || null,
      dietary_needs: body.dietary_needs || null,
      tshirt_size: body.tshirt_size || null,
      activity_level: body.activity_level || null,
      wellness_experience: body.wellness_experience || null,
      rooming_preference: body.rooming_preference || null,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_relationship: body.emergency_contact_relationship || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      additional_info: body.additional_info || null,
      photo_consent: body.photo_consent === 'Yes' ? true : body.photo_consent === 'No' ? false : null,
      stay_connected: body.stay_connected === 'Yes' ? true : body.stay_connected === 'No' ? false : null,
      custom_answers: body.custom_answers || {},
      payment_status: 'unpaid',
      payment_amount: 0,
    })

    if (error) throw error

    // Send welcome email + record it in notifications (fire-and-forget — don't fail registration)
    try {
      const { data: retreat } = await supabase
        .from('retreats').select('name,start_date,destination').eq('id', retreatId).single()
      if (retreat) {
        const { subject, body: notifBody } = draftWelcomeNotification(
          body.name, body.email, retreat.name, retreat.start_date, retreat.destination,
        )

        let emailStatus: 'sent' | 'pending' = 'pending'

        if (process.env.RESEND_API_KEY) {
          const resend = getResend()
          const { error: sendError } = await resend.emails.send({
            from: 'RetReach <onboarding@resend.dev>',
            to: body.email,
            subject,
            html: notifBody.replace(/\n/g, '<br>'),
          })
          if (!sendError) emailStatus = 'sent'
        }

        await supabase.from('notifications').insert({
          retreat_id: retreatId,
          recipient_type: 'participant',
          recipient_id: retreatId,
          recipient_name: body.name,
          recipient_email: body.email,
          channel: 'email',
          subject,
          body: notifBody,
          status: emailStatus,
          scheduled_for: new Date().toISOString(),
          sent_at: emailStatus === 'sent' ? new Date().toISOString() : null,
        })
      }
    } catch { /* welcome notification failure should not block registration */ }

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error
      ? error.message
      : (error as Record<string, unknown>)?.message as string ?? JSON.stringify(error)
    console.error('Registration error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
