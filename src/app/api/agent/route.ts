import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { getRetreatStage, formatDate, formatCurrency } from '@/lib/utils'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface AgentRequest {
  message: string
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}

function buildSystemPrompt(
  retreat: Retreat,
  vendors: Vendor[],
  participants: Participant[],
  schedule: ScheduleItem[],
  pastPatterns: string
): string {
  const stage = getRetreatStage(retreat)
  const spent = vendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const upcomingDeadlines = vendors
    .filter(v => v.deadline && new Date(v.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5)

  const scheduleText = schedule.length > 0
    ? schedule.map(s => `  - ${s.date} ${s.start_time}: ${s.title}${s.location ? ` @ ${s.location}` : ''}${s.vendor ? ` (${s.vendor.name})` : ''}`).join('\n')
    : '  No schedule items yet'

  const vendorText = vendors.length > 0
    ? vendors.map(v => `  - ${v.name} (${v.category}) | Status: ${v.status} | ${v.contact_email ? `Email: ${v.contact_email}` : 'No email'} | ${v.cost ? `Cost: ${formatCurrency(v.cost)}` : 'No cost set'} | ${v.deadline ? `Deadline: ${formatDate(v.deadline)}` : 'No deadline'} | ${v.deliverables ? `Deliverables: ${v.deliverables}` : ''}`).join('\n')
    : '  No vendors yet'

  const deadlineText = upcomingDeadlines.length > 0
    ? upcomingDeadlines.map(v => `  - ${v.name}: ${formatDate(v.deadline!)} (${v.deliverables ?? 'no deliverables specified'})`).join('\n')
    : '  No upcoming deadlines'

  const stageContext = {
    planning: 'You are in PLANNING mode. Focus on: vendor coordination, budget review, schedule building, participant registration, identifying gaps.',
    active: 'You are in ACTIVE mode. The retreat is happening NOW. Focus on: real-time updates, immediate issues, daily briefings, urgent vendor/participant communications.',
    closed: 'You are in CLOSED mode. Focus on: vendor ratings, budget reconciliation, participant feedback, lessons learned for future retreats.',
  }[stage]

  return `You are the AI manager for RetReach, a retreat planning tool. You act as a knowledgeable, proactive retreat coordinator — not a generic assistant.

${stageContext}

## Current Retreat: ${retreat.name}
- Destination: ${retreat.destination}
- Dates: ${formatDate(retreat.start_date)} – ${formatDate(retreat.end_date)}
- Concept: ${retreat.concept ?? 'Not specified'}
- Budget: ${formatCurrency(retreat.budget)} total | ${formatCurrency(spent)} committed | ${formatCurrency(retreat.budget - spent)} remaining

## Vendors (${vendors.length})
${vendorText}

## Upcoming Deadlines
${deadlineText}

## Schedule (${schedule.length} items)
${scheduleText}

## Participants: ${participants.length} registered
${participants.filter(p => p.food_preferences).map(p => `  - ${p.name}: ${p.food_preferences}`).join('\n') || '  No dietary restrictions noted'}

## What you know from past retreats
${pastPatterns || 'No historical data yet for this manager. This is the first retreat.'}

## Your capabilities
- Draft personalized emails to specific vendors (reference their name, deliverables, deadlines)
- Flag budget risks, overdue items, or scheduling conflicts
- Suggest schedule adjustments when things change
- Generate a daily briefing (TLD) for the active retreat
- Answer questions about any aspect of this retreat
- Recommend actions the manager should take

## Rules
- Always reference actual vendor names, dates, and amounts from the data — never use generic placeholders
- When drafting messages, write them ready to send (subject line + body)
- Be concise and action-oriented — the manager is busy
- If something looks risky (over budget, deadline missed, vendor not confirmed), flag it proactively
- Format emails clearly with Subject: and Body: labels`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: AgentRequest = await req.json()
    const { message, retreat, vendors, participants, schedule, history } = body

    // Fetch past patterns: accepted AI suggestions and vendor ratings from previous retreats
    const { data: pastInteractions } = await supabase
      .from('ai_interactions')
      .select('prompt, response, accepted, action_taken')
      .eq('manager_id', user.id)
      .eq('accepted', true)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: vendorHistory } = await supabase
      .from('vendors')
      .select('name, category, rating, rating_notes, retreat_id')
      .eq('retreat_id', retreat.id)
      .not('rating', 'is', null)

    // Also get ratings from other retreats by this manager for cross-retreat learning
    const { data: allVendorRatings } = await supabase
      .from('vendors')
      .select('name, category, rating, rating_notes, retreats!inner(manager_id)')
      .eq('retreats.manager_id', user.id)
      .not('rating', 'is', null)
      .limit(20)

    let pastPatterns = ''
    if (pastInteractions && pastInteractions.length > 0) {
      pastPatterns += `Suggestions previously accepted by this manager:\n${pastInteractions.slice(0, 5).map(i => `- ${i.action_taken ?? i.prompt.slice(0, 80)}`).join('\n')}\n\n`
    }
    if (allVendorRatings && allVendorRatings.length > 0) {
      pastPatterns += `Vendor ratings from past retreats:\n${allVendorRatings.map(v => `- ${v.name} (${v.category}): ${v.rating}/5${v.rating_notes ? ` — ${v.rating_notes}` : ''}`).join('\n')}`
    }

    const systemPrompt = buildSystemPrompt(retreat, vendors, participants, schedule, pastPatterns)

    const messages = [
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    })

    const response = completion.choices[0].message.content ?? ''

    // Log the interaction for future learning
    const { data: interaction } = await supabase
      .from('ai_interactions')
      .insert({
        retreat_id: retreat.id,
        manager_id: user.id,
        prompt: message,
        response,
        action_taken: null,
        accepted: null,
      })
      .select()
      .single()

    return NextResponse.json({ response, interactionId: interaction?.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Agent error:', message)
    return NextResponse.json({ error: 'Agent failed', detail: message }, { status: 500 })
  }
}
