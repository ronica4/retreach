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
        .order('updated_at', { ascending: false })
        .limit(4),
    ])

    if (!retreat) return NextResponse.json({ error: 'Retreat not found' }, { status: 404 })
    if (!retreat.start_date || !retreat.end_date) {
      return NextResponse.json({ error: 'Set retreat dates before generating a schedule' }, { status: 400 })
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
      lines.push('\nInsights from past retreats (use to inform scheduling):')
      pastSummaries.forEach(s => {
        const parts = [`[${s.retreat_name}]`]
        if (s.top_loved_themes) parts.push(`guests loved: ${s.top_loved_themes}`)
        if (s.top_improve_themes) parts.push(`wanted better: ${s.top_improve_themes}`)
        if (s.lessons_learned) parts.push(`lesson: ${s.lessons_learned.slice(0, 120)}`)
        lines.push('- ' + parts.join(' | '))
      })
    }

    const openai = getOpenAI()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      tool_choice: { type: 'function', function: { name: 'create_schedule' } },
      tools: [{
        type: 'function',
        function: {
          name: 'create_schedule',
          description: 'Output the complete retreat schedule',
          parameters: {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
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
          content: `You are a professional retreat planner. Generate a realistic, detailed daily schedule for a ${totalDays}-day retreat.
Rules:
- Day 1 begins with arrival/check-in, last day ends with check-out/departure
- Include: breakfast, lunch, dinner (at the retreat venue — do NOT add restaurants, external dining, or restaurant names), morning activity, afternoon activity or session, evening program
- Each day: 6–9 items. Spread through 07:00–22:00.
- Match activities to the retreat concept and destination
- Incorporate booked vendors/services — name them in the title
- Respect dietary needs for meal planning
- Use past retreat insights to improve the schedule (replicate what worked, fix what didn't)
- Be specific: use real activity names, not placeholders`,
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

    const rows = items.map(item => ({
      retreat_id:  retreatId,
      day_number:  Math.min(Math.max(item.day_number, 1), totalDays),
      date:        addDays(retreat.start_date, Math.min(Math.max(item.day_number, 1), totalDays) - 1),
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
