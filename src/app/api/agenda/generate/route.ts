import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { RetreatSummary } from '@/types'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  try {
    const { retreatId } = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const [
      { data: retreat },
      { data: vendors },
      { data: participants },
      { data: summaries },
    ] = await Promise.all([
      supabase.from('retreats').select('*').eq('id', retreatId).eq('manager_id', user.id).single(),
      supabase.from('vendors').select('name,category,status,deliverables').eq('retreat_id', retreatId),
      supabase.from('participants').select('dietary_needs,activity_level,wellness_experience,hobbies').eq('retreat_id', retreatId),
      supabase.from('retreat_summaries')
        .select('retreat_name,top_loved_themes,top_improve_themes,what_went_well,lessons_learned,avg_nps')
        .eq('manager_id', user.id)
        .neq('retreat_id', retreatId)
        .order('updated_at', { ascending: false }),
    ])

    if (!retreat) return NextResponse.json({ error: 'Retreat not found' }, { status: 404 })
    if (!retreat.start_date || !retreat.end_date) {
      return NextResponse.json({ error: 'Set retreat dates before generating a schedule' }, { status: 400 })
    }

    // Guard: never overwrite an existing schedule — only generate once
    const { count: existingCount } = await supabase
      .from('schedule_items')
      .select('id', { count: 'exact', head: true })
      .eq('retreat_id', retreatId)
    if (existingCount && existingCount > 0) {
      return NextResponse.json({ success: true, count: 0, skipped: true })
    }

    const totalDays = Math.round(
      (new Date(retreat.end_date + 'T12:00:00Z').getTime() -
        new Date(retreat.start_date + 'T12:00:00Z').getTime()) / 86400000
    ) + 1

    // Build context string
    const lines: string[] = [
      `Retreat: "${retreat.name}"`,
      `Destination: ${retreat.destination}`,
      `Concept: ${retreat.concept ?? 'general retreat'}`,
      `Dates: ${formatDate(retreat.start_date)} – ${formatDate(retreat.end_date)} (${totalDays} days)`,
      `Participants: ${retreat.number_of_participants ?? 'unknown'}`,
    ]

    const confirmedVendors = (vendors ?? []).filter(v => ['confirmed', 'completed', 'pending'].includes(v.status))
    if (confirmedVendors.length > 0) {
      lines.push('\nBooked vendors/services:')
      confirmedVendors.forEach(v => {
        lines.push(`- ${v.name} (${v.category})${v.deliverables ? ': ' + v.deliverables : ''}`)
      })
    }

    const dietaryNeeds = [...new Set((participants ?? []).map(p => p.dietary_needs).filter(Boolean))]
    const activityLevels = [...new Set((participants ?? []).map(p => p.activity_level).filter(Boolean))]
    if (dietaryNeeds.length) lines.push(`\nDietary needs among participants: ${dietaryNeeds.join(', ')}`)
    if (activityLevels.length) lines.push(`Activity levels: ${activityLevels.join(', ')}`)

    const pastSummaries = (summaries ?? []) as RetreatSummary[]
    if (pastSummaries.length > 0) {
      const avoidLines: string[] = []
      const replicateLines: string[] = []

      pastSummaries.forEach(s => {
        const label = `[${s.retreat_name}]`
        if (s.what_to_improve) avoidLines.push(`${label} Manager said to improve: ${s.what_to_improve}`)
        if (s.top_improve_themes) avoidLines.push(`${label} Guests wanted better: ${s.top_improve_themes}`)
        if (s.lessons_learned) avoidLines.push(`${label} Lesson: ${s.lessons_learned}`)
        if (s.what_went_well) replicateLines.push(`${label} What worked well: ${s.what_went_well}`)
        if (s.top_loved_themes) replicateLines.push(`${label} Guests loved: ${s.top_loved_themes}`)
      })

      if (avoidLines.length > 0) {
        lines.push('\nHARD CONSTRAINTS from past retreats — you MUST respect these in the schedule:')
        avoidLines.forEach(l => lines.push(`- ${l}`))
      }
      if (replicateLines.length > 0) {
        lines.push('\nWhat worked well in past retreats — replicate these:')
        replicateLines.forEach(l => lines.push(`- ${l}`))
      }
    }

    const openai = getOpenAI()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      tool_choice: { type: 'function', function: { name: 'create_schedule' } },
      tools: [{
        type: 'function',
        function: {
          name: 'create_schedule',
          description: 'Output the complete retreat schedule. MUST include items for every single day.',
          parameters: {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                minItems: totalDays * 4,
                items: {
                  type: 'object',
                  required: ['day_number', 'start_time', 'title', 'item_type'],
                  properties: {
                    day_number:  { type: 'integer', minimum: 1, maximum: totalDays },
                    start_time:  { type: 'string', description: '24h HH:MM' },
                    end_time:    { type: 'string', description: '24h HH:MM' },
                    title:       { type: 'string' },
                    item_type:   { type: 'string', enum: ['session', 'meal', 'transport', 'activity', 'other'] },
                    location:    { type: 'string' },
                  },
                },
              },
            },
          },
        },
      }],
      messages: [
        {
          role: 'system',
          content: `You are a professional retreat planner. Generate a complete daily schedule for a ${totalDays}-day retreat.

CRITICAL: You MUST produce items for EVERY day from Day 1 to Day ${totalDays}. Missing days are a failure.

Rules:
- Day 1: arrival/check-in first, then first activities
- Day ${totalDays}: morning activities, then check-out/departure last
- Every day must have: breakfast (08:00), lunch (13:00), dinner (19:00), morning activity, afternoon session/activity, evening program — minimum 6 items per day
- Meals are at the retreat venue only — no restaurant names
- Spread items through 07:00–22:00
- Match activities to the retreat concept and destination
- Incorporate booked vendors/services by name in the title
- HARD CONSTRAINTS from past retreats in the context MUST be followed — treat them as non-negotiable rules, not suggestions. Example: if feedback says "meals after physical activities", then no meal may appear before an activity block on the same day.
- Replicate what worked well from past retreats
- Be specific: real activity names, not placeholders like "Activity" or "Session"`,
        },
        {
          role: 'user',
          content: lines.join('\n'),
        },
      ],
    })

    const toolCall = completion.choices[0].message.tool_calls?.[0]
    if (!toolCall || toolCall.type !== 'function') throw new Error('AI did not return a schedule')

    const { items } = JSON.parse(toolCall.function.arguments) as {
      items: Array<{
        day_number: number; start_time: string; end_time?: string
        title: string; item_type: string; location?: string
      }>
    }

    if (!items || items.length === 0) throw new Error('AI returned an empty schedule')

    // Clamp day numbers to valid range
    const clamped = items.map(item => ({
      ...item,
      day_number: Math.min(Math.max(item.day_number, 1), totalDays),
    }))

    // Identify any days that have no items and fill them with a basic fallback
    const coveredDays = new Set(clamped.map(i => i.day_number))
    const fallbackItems: typeof clamped = []
    for (let d = 1; d <= totalDays; d++) {
      if (coveredDays.has(d)) continue
      const isFirst = d === 1
      const isLast  = d === totalDays
      fallbackItems.push(
        { day_number: d, start_time: '08:00', end_time: '09:00', title: 'Breakfast', item_type: 'meal', location: 'Dining area' },
        { day_number: d, start_time: isFirst ? '10:00' : '09:30', end_time: isFirst ? '11:00' : '11:00', title: isFirst ? 'Welcome & check-in' : 'Morning session', item_type: isFirst ? 'other' : 'session', location: undefined },
        { day_number: d, start_time: '13:00', end_time: '14:00', title: 'Lunch', item_type: 'meal', location: 'Dining area' },
        { day_number: d, start_time: '15:00', end_time: '17:00', title: isLast ? 'Closing ceremony' : 'Afternoon activity', item_type: 'activity', location: undefined },
        { day_number: d, start_time: '19:00', end_time: '20:00', title: 'Dinner', item_type: 'meal', location: 'Dining area' },
        { day_number: d, start_time: isLast ? '21:00' : '20:30', end_time: isLast ? '22:00' : '22:00', title: isLast ? 'Farewell & departure' : 'Evening gathering', item_type: 'other', location: undefined },
      )
    }

    const allItems = [...clamped, ...fallbackItems]

    const rows = allItems.map(item => ({
      retreat_id:  retreatId,
      day_number:  item.day_number,
      date:        addDays(retreat.start_date, item.day_number - 1),
      start_time:  item.start_time,
      end_time:    item.end_time ?? null,
      title:       item.title,
      item_type:   item.item_type,
      location:    item.location ?? null,
    }))

    const { error } = await supabase.from('schedule_items').insert(rows)
    if (error) throw error

    return NextResponse.json({ success: true, count: rows.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Agenda auto-generate error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
