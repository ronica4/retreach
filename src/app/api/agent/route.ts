import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { getRetreatStage, formatDate, formatCurrency } from '@/lib/utils'
import { type Retreat, type Vendor, type Participant, type ScheduleItem, type RetreatSummary } from '@/types'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// ── Tools ──────────────────────────────────────────────────────────────────

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_schedule_items',
      description: 'Add or replace schedule items. Use days_to_clear to surgically replace specific days without touching others. NEVER use replace_all_existing unless the user explicitly asks to rebuild the ENTIRE schedule from scratch.',
      parameters: {
        type: 'object',
        properties: {
          days_to_clear: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Day numbers whose existing items should be deleted before inserting the new ones. Use this for partial edits (e.g. "change day 2"). Leave empty to add items without removing anything.',
          },
          replace_all_existing: {
            type: 'boolean',
            description: 'Delete ALL existing schedule items before inserting. Only use when the user explicitly asks to replace or regenerate the ENTIRE schedule.',
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day_number: { type: 'integer', description: '1-based day offset from retreat start.' },
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
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// ── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(
  retreat: Retreat,
  vendors: Vendor[],
  participants: Participant[],
  schedule: ScheduleItem[],
  historicalContext: string,
): string {
  const stage = getRetreatStage(retreat)
  const now   = new Date()
  const spent = vendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const totalDays = retreat.start_date && retreat.end_date
    ? Math.round((new Date(retreat.end_date + 'T00:00:00').getTime() - new Date(retreat.start_date + 'T00:00:00').getTime()) / 86400000) + 1
    : 0

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

  const paidCount    = participants.filter(p => p.payment_status === 'paid').length
  const partialCount = participants.filter(p => p.payment_status === 'partial').length
  const unpaidCount  = participants.filter(p => p.payment_status === 'unpaid').length

  const participantText = participants.length > 0
    ? participants.map(p => {
        const parts = [
          `  - ${p.name} <${p.email}>`,
          p.phone              ? `phone: ${p.phone}`                     : null,
          p.city_country       ? `from: ${p.city_country}`               : null,
          p.age                ? `age: ${p.age}`                         : null,
          p.occupation         ? `job: ${p.occupation}`                  : null,
          p.activity_level     ? `activity: ${p.activity_level}`         : null,
          p.rooming_preference ? `room: ${p.rooming_preference}`         : null,
          p.dietary_needs || p.food_preferences
            ? `diet: ${[p.dietary_needs, p.food_preferences].filter(Boolean).join('; ')}` : null,
          `payment: ${p.payment_status}${p.payment_amount ? ` ($${p.payment_amount})` : ''}`,
          p.emergency_contact_name ? `emergency: ${p.emergency_contact_name} ${p.emergency_contact_phone ?? ''}` : null,
        ]
        return parts.filter(Boolean).join(' | ')
      }).join('\n')
    : '  None registered'

  const stageContext = {
    planning: 'PLANNING MODE — vendor coordination, budget review, schedule gaps, registration completeness.',
    active:   'ACTIVE MODE — retreat is live. Daily briefings, urgent issues, real-time comms.',
    closed:   'CLOSED MODE — vendor ratings, budget reconciliation, lessons learned.',
  }[stage]

  return `You are the AI retreat manager in RetReach. You have full access to all retreat data and can take actions. You are NOT a generic assistant — every response must reference real names, dates, and numbers from the data below.

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

## Schedule (${schedule.length} items, ${totalDays} days)
${scheduleText}

## Participants (${participants.length} registered — ${paidCount} paid, ${partialCount} partial, ${unpaidCount} unpaid)
${participantText}

## Historical context (from ALL your retreats — use this to suggest improvements, NOT as this retreat's data)
${historicalContext || 'No prior retreat data yet.'}

## Schedule creation/editing — CONFIRMATION REQUIRED
When asked to build, create, generate, or update the schedule:
1. FIRST respond with the proposed changes as a formatted list (Day X · HH:MM · Title · Location)
2. End with: "Shall I apply these changes? Reply **yes** to confirm, or tell me what to adjust."
3. Do NOT call create_schedule_items until the user explicitly confirms (yes / ok / sure / add them / looks good)
4. After confirmation, call the tool and summarize what was created

CRITICAL — partial edits:
- If the user asks to change/update/fix SPECIFIC days or events, use days_to_clear with only those day numbers. NEVER use replace_all_existing for partial edits.
- replace_all_existing = true ONLY when the user says "redo the whole schedule", "start over", or "replace everything".
- If adding new items without removing existing ones, leave both days_to_clear and replace_all_existing unset.
- Preserve ALL days and events that the user did not ask to change.

## Drafting messages
Always use real values. Never write [Vendor Name], [Date], [Amount]. Substitute actual data.
Format:
Subject: …
Body: …
Address contacts by first name.

## Rules
- Be concise — the manager is busy
- Proactively flag overdue deadlines and budget risks
- When mentioning feedback patterns from past retreats, be specific about what to replicate or avoid`
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { message, retreatId, history } = body

    if (!retreatId) return NextResponse.json({ error: 'retreatId required' }, { status: 400 })

    // Fetch this retreat's data (RLS ensures ownership)
    const [
      { data: retreat },
      { data: vendors },
      { data: participants },
      { data: schedule },
    ] = await Promise.all([
      supabase.from('retreats').select('*').eq('id', retreatId).eq('manager_id', user.id).single(),
      supabase.from('vendors').select('*').eq('retreat_id', retreatId).order('name'),
      supabase.from('participants').select('*').eq('retreat_id', retreatId),
      supabase.from('schedule_items').select('*, vendor:vendors(name,category)').eq('retreat_id', retreatId),
    ])

    if (!retreat) return NextResponse.json({ error: 'Retreat not found or access denied' }, { status: 404 })

    // Build historical context — graceful fallback if any table hasn't been migrated yet
    const [
      pastInteractionsResult,
      vendorRatingsResult,
      retreatSummariesResult,
    ] = await Promise.allSettled([
      supabase.from('ai_interactions')
        .select('prompt, action_taken')
        .eq('manager_id', user.id).eq('accepted', true)
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('vendors')
        .select('name, category, rating, rating_notes, retreats!inner(manager_id)')
        .eq('retreats.manager_id', user.id).not('rating', 'is', null).limit(20),
      supabase.from('retreat_summaries')
        .select('*')
        .eq('manager_id', user.id)
        .neq('retreat_id', retreatId)
        .order('updated_at', { ascending: false })
        .limit(8),
    ])

    const pastInteractions = pastInteractionsResult.status === 'fulfilled' ? (pastInteractionsResult.value.data ?? []) : []
    const allVendorRatings = vendorRatingsResult.status   === 'fulfilled' ? (vendorRatingsResult.value.data   ?? []) : []
    const retreatSummaries = retreatSummariesResult.status === 'fulfilled' ? ((retreatSummariesResult.value.data ?? []) as RetreatSummary[]) : []

    let historicalContext = ''

    if (pastInteractions.length > 0) {
      historicalContext += `Previously accepted AI suggestions:\n${pastInteractions.map(i => `- ${i.action_taken ?? i.prompt.slice(0, 80)}`).join('\n')}\n\n`
    }
    if (allVendorRatings.length > 0) {
      historicalContext += `Vendor ratings from past retreats:\n${allVendorRatings.map(v => `- ${v.name} (${v.category}): ${v.rating}/5${v.rating_notes ? ` — ${v.rating_notes}` : ''}`).join('\n')}\n\n`
    }
    if (retreatSummaries.length > 0) {
      historicalContext += `Past retreat summaries — schedule + manager reflection + guest feedback together:\n`
      retreatSummaries.forEach(s => {
        historicalContext += `\n[${s.retreat_name}] ${s.destination ?? ''} | ${s.start_date ?? '?'} | ${s.total_days ?? '?'} days | ${s.participant_count} participants\n`

        if (Array.isArray(s.schedule_snapshot) && s.schedule_snapshot.length > 0) {
          historicalContext += `  Schedule (${s.schedule_snapshot.length} items):\n`
          s.schedule_snapshot.forEach(item => {
            historicalContext += `    Day ${item.day} ${item.start}${item.end ? `–${item.end}` : ''}: ${item.title}${item.location ? ` @ ${item.location}` : ''}\n`
          })
        }

        if (s.overall_rating || s.what_went_well || s.what_to_improve || s.lessons_learned) {
          historicalContext += `  Manager reflection (${s.overall_rating ? `${s.overall_rating}/5 stars` : 'unrated'}):\n`
          if (s.what_went_well)  historicalContext += `    Went well: "${s.what_went_well.slice(0, 120)}"\n`
          if (s.what_to_improve) historicalContext += `    Improve: "${s.what_to_improve.slice(0, 120)}"\n`
          if (s.lessons_learned) historicalContext += `    Lessons: "${s.lessons_learned.slice(0, 120)}"\n`
          if (s.would_run_again != null) historicalContext += `    Would run again: ${s.would_run_again ? 'Yes' : 'No'}\n`
        }

        if (s.participant_response_count > 0) {
          historicalContext += `  Guest feedback (${s.participant_response_count} responses, avg NPS ${s.avg_nps}/10 — ${s.nps_promoters} promoters, ${s.nps_detractors} detractors):\n`
          if (s.top_loved_themes)   historicalContext += `    Guests loved: ${s.top_loved_themes}\n`
          if (s.top_improve_themes) historicalContext += `    Guests wanted better: ${s.top_improve_themes}\n`
        }
      })
    }

    const systemPrompt = buildSystemPrompt(
      retreat,
      vendors ?? [],
      participants ?? [],
      schedule ?? [],
      historicalContext,
    )

    type OAIMessage =
      | OpenAI.Chat.ChatCompletionSystemMessageParam
      | OpenAI.Chat.ChatCompletionUserMessageParam
      | OpenAI.Chat.ChatCompletionAssistantMessageParam
      | OpenAI.Chat.ChatCompletionToolMessageParam

    const chatMessages: OAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(history ?? []).map((h: { role: 'user' | 'assistant'; content: string }) =>
        ({ role: h.role, content: h.content } as OAIMessage)
      ),
      { role: 'user', content: message },
    ]

    const actionsPerformed: Array<{ type: string; count?: number }> = []
    const openai = getOpenAI()

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
        if (toolCall.type !== 'function') continue
        let toolResult = ''

        if (toolCall.function.name === 'create_schedule_items') {
          const args = JSON.parse(toolCall.function.arguments) as {
            days_to_clear?: number[]
            replace_all_existing?: boolean
            items: Array<{
              day_number: number; start_time: string; end_time?: string
              title: string; item_type: string; location?: string
            }>
          }

          if (args.replace_all_existing) {
            await supabase.from('schedule_items').delete().eq('retreat_id', retreatId)
          } else if (args.days_to_clear && args.days_to_clear.length > 0) {
            await supabase.from('schedule_items')
              .delete()
              .eq('retreat_id', retreatId)
              .in('day_number', args.days_to_clear)
          }

          const rows = args.items.map(item => ({
            retreat_id: retreatId,
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
            toolResult = `Created ${rows.length} schedule items successfully.`
            actionsPerformed.push({ type: 'schedule_created', count: rows.length })
          }
        }

        chatMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult })
      }

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
        retreat_id: retreatId,
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
