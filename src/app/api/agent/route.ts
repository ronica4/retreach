import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { getRetreatStage, formatDate, formatCurrency } from '@/lib/utils'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

interface AgentRequest {
  message: string
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}

// ── Tools ──────────────────────────────────────────────────────────────────

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_schedule_items',
      description: 'Create schedule items for the retreat. Use when the user asks to build, generate, draft, or add items to the schedule. Set replace_existing=true when they ask to rebuild or replace the whole schedule.',
      parameters: {
        type: 'object',
        properties: {
          replace_existing: {
            type: 'boolean',
            description: 'Delete all existing schedule items first. Use when rebuilding the whole schedule.',
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day_number: { type: 'integer', description: '1-based day offset from retreat start. Day 1 = first day.' },
                start_time: { type: 'string', description: '24-hour HH:MM' },
                end_time:   { type: 'string', description: '24-hour HH:MM, optional' },
                title:      { type: 'string' },
                item_type:  { type: 'string', enum: ['session', 'meal', 'transport', 'activity', 'other'] },
                location:   { type: 'string', description: 'optional' },
              },
              required: ['day_number', 'start_time', 'title', 'item_type'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(
  retreat: Retreat,
  vendors: Vendor[],
  participants: Participant[],
  schedule: ScheduleItem[],
  pastPatterns: string,
): string {
  const stage = getRetreatStage(retreat)
  const now   = new Date()
  const spent = vendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const totalDays = retreat.start_date && retreat.end_date
    ? Math.round((new Date(retreat.end_date + 'T00:00:00').getTime() - new Date(retreat.start_date + 'T00:00:00').getTime()) / 86400000) + 1
    : 0

  // Vendors
  const overdueVendors = vendors.filter(v => v.deadline && new Date(v.deadline) < now && v.status !== 'completed')
  const vendorText = vendors.length > 0
    ? vendors.map(v => {
        const dl = v.deadline
          ? `${formatDate(v.deadline)}${new Date(v.deadline) < now && v.status !== 'completed' ? ' *** OVERDUE ***' : ''}`
          : 'none'
        return `  - ${v.name} (${v.category}) | contact: ${v.contact_name ?? '—'} <${v.contact_email ?? 'no email'}> | status: ${v.status} | cost: ${v.cost ? formatCurrency(v.cost) : 'not set'} | deadline: ${dl} | deliverables: ${v.deliverables ?? 'none'}`
      }).join('\n')
    : '  None'

  const overdueText = overdueVendors.length > 0
    ? overdueVendors.map(v => `  - ${v.name} (${v.contact_name ?? '—'}): was due ${formatDate(v.deadline!)} | ${v.deliverables ?? 'no deliverables'}`).join('\n')
    : '  None'

  const upcomingText = vendors
    .filter(v => v.deadline && new Date(v.deadline) >= now)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 6)
    .map(v => `  - ${v.name} (${v.contact_name ?? '—'}): ${formatDate(v.deadline!)} | ${v.deliverables ?? 'no deliverables'}`)
    .join('\n') || '  None'

  // Schedule
  const scheduleText = schedule.length > 0
    ? schedule
        .sort((a, b) => {
          const da = a.day_number ?? 1, db = b.day_number ?? 1
          return da !== db ? da - db : a.start_time.localeCompare(b.start_time)
        })
        .map(s => {
          const realDate = retreat.start_date && s.day_number
            ? addDays(retreat.start_date, s.day_number - 1)
            : s.date
          return `  - Day ${s.day_number ?? 1} (${realDate}) ${s.start_time.slice(0, 5)}: ${s.title}${s.location ? ` @ ${s.location}` : ''}${s.vendor ? ` — ${s.vendor.name}` : ''}`
        }).join('\n')
    : '  Empty'

  // Participants — full detail
  const paidCount    = participants.filter(p => p.payment_status === 'paid').length
  const partialCount = participants.filter(p => p.payment_status === 'partial').length
  const unpaidCount  = participants.filter(p => p.payment_status === 'unpaid').length

  const participantText = participants.length > 0
    ? participants.map(p => {
        const parts = [
          `  - ${p.name} <${p.email}>`,
          p.phone             ? `phone: ${p.phone}`                      : null,
          p.city_country      ? `from: ${p.city_country}`                : null,
          p.age               ? `age: ${p.age}`                          : null,
          p.occupation        ? `job: ${p.occupation}`                   : null,
          p.activity_level    ? `activity: ${p.activity_level}`          : null,
          p.rooming_preference ? `room pref: ${p.rooming_preference}`    : null,
          p.dietary_needs || p.food_preferences
            ? `diet: ${[p.dietary_needs, p.food_preferences].filter(Boolean).join('; ')}` : null,
          p.tshirt_size       ? `tshirt: ${p.tshirt_size}`               : null,
          `payment: ${p.payment_status}${p.payment_amount ? ` ($${p.payment_amount})` : ''}`,
          p.emergency_contact_name ? `emergency: ${p.emergency_contact_name} ${p.emergency_contact_phone ?? ''}` : null,
          p.notes             ? `notes: ${p.notes}`                      : null,
        ]
        return parts.filter(Boolean).join(' | ')
      }).join('\n')
    : '  None registered'

  const stageContext = {
    planning: 'PLANNING MODE — vendor coordination, budget review, schedule gaps, registration completeness.',
    active:   'ACTIVE MODE — retreat is live. Daily briefings, urgent issues, real-time participant/vendor comms.',
    closed:   'CLOSED MODE — vendor ratings, budget reconciliation, lessons learned for future retreats.',
  }[stage]

  return `You are the AI retreat manager in RetReach. You have full access to all retreat data and can take actions (like creating schedule items). You are NOT a generic assistant — every response must reference real names, dates, and numbers from the data below.

${stageContext}

## Retreat: ${retreat.name}
- Destination: ${retreat.destination}
- Dates: ${formatDate(retreat.start_date)} – ${formatDate(retreat.end_date)} (${totalDays} days)
- Concept: ${retreat.concept ?? 'not specified'}
- Budget: ${formatCurrency(retreat.budget)} total | ${formatCurrency(spent)} committed | ${formatCurrency(retreat.budget - spent)} remaining

## Vendors (${vendors.length})
${vendorText}

## ⚠️ Overdue (${overdueVendors.length})
${overdueText}

## Upcoming Deadlines
${upcomingText}

## Schedule (${schedule.length} items across ${totalDays} days)
${scheduleText}

## Participants (${participants.length} registered — ${paidCount} paid, ${partialCount} partial, ${unpaidCount} unpaid)
${participantText}

## Historical context
${pastPatterns || 'No prior retreat data for this manager.'}

## Creating the schedule
You have a create_schedule_items tool. Use it when the user asks to build, generate, or add to the schedule.
- day_number is 1-based: Day 1 = ${retreat.start_date ? formatDate(retreat.start_date) : 'first day'}, Day ${totalDays} = ${retreat.end_date ? formatDate(retreat.end_date) : 'last day'}
- After calling the tool, summarize what you created (e.g. "Created 21 items across 3 days — morning yoga at 7am, breakfast at 8:30am…")

## Drafting messages
Always use real values. Never write [Vendor Name], [Date], [Amount] — substitute the actual data.
Format emails as:
Subject: …
Body: …
Address contacts by first name when available.

## General rules
- Be concise — the manager is busy
- Proactively flag overdue deadlines and unconfirmed vendors
- When listing deadlines/status, use specific names and dates from the data above`
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: AgentRequest = await req.json()
    const { message, retreat, vendors, participants, schedule, history } = body

    // Fetch past patterns
    const [{ data: pastInteractions }, { data: allVendorRatings }] = await Promise.all([
      supabase.from('ai_interactions').select('prompt, action_taken')
        .eq('manager_id', user.id).eq('accepted', true)
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('vendors')
        .select('name, category, rating, rating_notes, retreats!inner(manager_id)')
        .eq('retreats.manager_id', user.id).not('rating', 'is', null).limit(20),
    ])

    let pastPatterns = ''
    if (pastInteractions?.length) {
      pastPatterns += `Previously accepted suggestions:\n${pastInteractions.map(i => `- ${i.action_taken ?? i.prompt.slice(0, 80)}`).join('\n')}\n\n`
    }
    if (allVendorRatings?.length) {
      pastPatterns += `Vendor ratings from past retreats:\n${allVendorRatings.map(v => `- ${v.name} (${v.category}): ${v.rating}/5${v.rating_notes ? ` — ${v.rating_notes}` : ''}`).join('\n')}`
    }

    const systemPrompt = buildSystemPrompt(retreat, vendors, participants, schedule, pastPatterns)

    // Build message array — typed to satisfy OpenAI SDK
    type OAIMessage =
      | OpenAI.Chat.ChatCompletionSystemMessageParam
      | OpenAI.Chat.ChatCompletionUserMessageParam
      | OpenAI.Chat.ChatCompletionAssistantMessageParam
      | OpenAI.Chat.ChatCompletionToolMessageParam

    const chatMessages: OAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content } as OAIMessage)),
      { role: 'user', content: message },
    ]

    // Track actions performed so the frontend can refresh
    const actionsPerformed: Array<{ type: string; count?: number }> = []
    const openai = getOpenAI()

    // Tool-calling loop — keeps running until the model stops calling tools
    let completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: chatMessages,
      tools: TOOLS,
      tool_choice: 'auto',
    })

    while (completion.choices[0].finish_reason === 'tool_calls') {
      const assistantMsg = completion.choices[0].message
      chatMessages.push(assistantMsg as OAIMessage)

      for (const toolCall of assistantMsg.tool_calls ?? []) {
        let toolResult = ''
        if (toolCall.type !== 'function') continue

        if (toolCall.function.name === 'create_schedule_items') {
          const args = JSON.parse(toolCall.function.arguments) as {
            replace_existing?: boolean
            items: Array<{
              day_number: number; start_time: string; end_time?: string
              title: string; item_type: string; location?: string
            }>
          }

          if (args.replace_existing) {
            await supabase.from('schedule_items').delete().eq('retreat_id', retreat.id)
          }

          const rows = args.items.map(item => ({
            retreat_id: retreat.id,
            day_number: item.day_number,
            date: retreat.start_date ? addDays(retreat.start_date, item.day_number - 1) : new Date().toISOString().slice(0, 10),
            start_time: item.start_time,
            end_time: item.end_time ?? null,
            title: item.title,
            item_type: item.item_type,
            location: item.location ?? null,
          }))

          const { error } = await supabase.from('schedule_items').insert(rows)
          if (error) {
            toolResult = `Error: ${error.message}`
          } else {
            toolResult = `Created ${rows.length} schedule items.`
            actionsPerformed.push({ type: 'schedule_created', count: rows.length })
          }
        }

        chatMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        })
      }

      // Continue conversation after tool results
      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: chatMessages,
        tools: TOOLS,
        tool_choice: 'auto',
      })
    }

    const response = completion.choices[0].message.content ?? ''

    const { data: interaction } = await supabase
      .from('ai_interactions')
      .insert({
        retreat_id: retreat.id,
        manager_id: user.id,
        prompt: message,
        response,
        action_taken: actionsPerformed.length > 0 ? JSON.stringify(actionsPerformed) : null,
        accepted: null,
      })
      .select()
      .single()

    return NextResponse.json({ response, interactionId: interaction?.id, actionsPerformed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Agent error:', msg)
    return NextResponse.json({ error: 'Agent failed', detail: msg }, { status: 500 })
  }
}
