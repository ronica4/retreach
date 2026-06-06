import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// .trim() strips a stray BOM (U+FEFF) from pasted env values, which would
// otherwise make supabase-js throw "Cannot convert argument to ByteString".
const cleanEnv = (v: string | undefined) => (v ?? '').trim()

function serviceClient() {
  return createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ retreatId: string }> },
) {
  try {
    const body = await request.json()
    const { retreatId } = await params
    const supabase = serviceClient()

    const { error } = await supabase.from('participant_feedback').insert({
      retreat_id: retreatId,
      participant_name: body.name || null,
      participant_email: body.email || null,
      nps_score: typeof body.nps === 'number' && body.nps >= 0 ? body.nps : null,
      what_loved: body.what_loved || null,
      what_to_improve: body.what_to_improve || null,
      custom_answers: body.custom_answers || {},
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error
      ? error.message
      : (error as Record<string, unknown>)?.message as string ?? JSON.stringify(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
