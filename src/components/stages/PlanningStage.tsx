'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import AgentPanel from '@/components/retreat/AgentPanel'
import {
  Edit2, Check, X, MapPin, Calendar, DollarSign, FileText, Users, Handshake,
  CalendarDays, Sparkles, Circle, CheckCircle2, PenLine, Lightbulb, Wallet,
  CalendarPlus, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
}

const inputCls = 'w-full text-sm bg-white rounded-lg px-3 py-2.5 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-1 block'

// Budget breakdown by our category keys
const BUDGET_CATS = [
  { key: 'hotel',      label: 'Lodging',   bar: 'bg-emerald-500' },
  { key: 'food',       label: 'Catering',  bar: 'bg-amber-400' },
  { key: 'transport',  label: 'Transport', bar: 'bg-emerald-300' },
  { key: 'flights',    label: 'Flights',   bar: 'bg-emerald-400' },
  { key: 'attraction', label: 'Activities',bar: 'bg-rose-400' },
  { key: 'merch',      label: 'Photo/AV',  bar: 'bg-amber-300' },
  { key: 'other',      label: 'Other',     bar: 'bg-stone-300' },
]

export default function PlanningStage({ retreat, vendors, participants, schedule }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: retreat.name,
    destination: retreat.destination,
    concept: retreat.concept ?? '',
    start_date: retreat.start_date,
    end_date: retreat.end_date,
    budget: String(retreat.budget),
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('retreats').update({
      name: form.name,
      destination: form.destination,
      concept: form.concept || null,
      start_date: form.start_date,
      end_date: form.end_date,
      budget: parseFloat(form.budget) || 0,
    }).eq('id', retreat.id)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setForm({
      name: retreat.name,
      destination: retreat.destination,
      concept: retreat.concept ?? '',
      start_date: retreat.start_date,
      end_date: retreat.end_date,
      budget: String(retreat.budget),
    })
    setEditing(false)
  }

  const days = daysUntil(retreat.start_date)
  const spent = vendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const paidPct = participants.length > 0
    ? Math.round((participants.filter(p => p.payment_status === 'paid').length / participants.length) * 100)
    : 0

  // budget breakdown per category
  const catSpend = vendors.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] ?? 0) + (v.cost ?? 0); return acc
  }, {} as Record<string, number>)
  const totalBudget = retreat.budget || 0
  const budgetRows = BUDGET_CATS.map(c => ({
    ...c, amount: catSpend[c.key] ?? 0,
    pct: totalBudget > 0 ? Math.round(((catSpend[c.key] ?? 0) / totalBudget) * 100) : 0,
  })).filter(b => b.amount > 0)

  // open decisions
  const haveCategories = new Set(vendors.map(v => v.category))
  const decisions = [
    { id: 'd-dates',   label: 'Set the retreat dates',    done: !!(retreat.start_date && retreat.end_date), hint: 'Dates drive every deadline.' },
    { id: 'd-budget',  label: 'Set a total budget',       done: retreat.budget > 0, hint: 'Unlocks the budget breakdown.' },
    { id: 'd-concept', label: 'Define the concept',       done: !!(retreat.concept?.trim()), hint: 'Lets the planner tailor everything.' },
    { id: 'd-venue',   label: 'Add lodging vendor',       done: haveCategories.has('hotel'), hint: 'The first and biggest booking.' },
    { id: 'd-food',    label: 'Add catering vendor',      done: haveCategories.has('food'), hint: 'Lock the menu and numbers.' },
    { id: 'd-agenda',  label: 'Build the agenda',         done: schedule.length > 0, hint: 'Draft the daily flow.' },
    { id: 'd-guests',  label: 'Register guests',          done: participants.length > 0, hint: "Track who's coming." },
  ]
  const doneCount = decisions.filter(d => d.done).length
  const decisionPct = Math.round((doneCount / decisions.length) * 100)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
      <div className="space-y-5">
        {/* page header */}
        <div className="flex flex-wrap items-end justify-between gap-4 fade-up">
          <div>
            <h1 className="text-xl font-semibold text-stone-800">Planning</h1>
            <p className="text-sm text-stone-400 mt-0.5">Set the compass — concept, dates, budget.</p>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 ring-1 ring-stone-200 rounded-lg px-4 py-2.5 transition">
              <PenLine size={13} /> Edit details
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancel}
                className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600 hover:bg-stone-100 ring-1 ring-stone-200 rounded-lg px-4 py-2.5 transition">
                <X size={13} /> Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 rounded-lg disabled:opacity-50 transition shadow-sm">
                <Check size={13} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* details card */}
        <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-5 fade-up">
          <div className="flex items-center gap-2 mb-4">
            <span className="size-7 shrink-0 grid place-items-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100 text-emerald-700">
              <PenLine size={14} />
            </span>
            <h2 className="text-sm font-semibold text-stone-800">Retreat details</h2>
          </div>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={labelCls}>Retreat name</label>
                <input value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Start date</label>
                <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>End date</label>
                <input type="date" value={form.end_date} min={form.start_date} onChange={e => update('end_date', e.target.value)} className={inputCls} /></div>
              <div className="col-span-2"><label className={labelCls}>Destination</label>
                <input value={form.destination} onChange={e => update('destination', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Concept / theme</label>
                <input value={form.concept} onChange={e => update('concept', e.target.value)}
                  placeholder="e.g. Yoga & nature reset" className={inputCls} /></div>
              <div><label className={labelCls}>Budget (USD)</label>
                <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)} className={inputCls} /></div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-stone-900">{retreat.name}</h3>
                {days > 0 && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 ring-1 ring-amber-200 rounded-full px-2.5 py-1">
                    {days}d to go
                  </span>
                )}
              </div>
              <div className="space-y-2 mt-3 text-sm text-stone-600">
                <div className="flex items-center gap-2"><Calendar size={13} className="text-emerald-600" />
                  {formatDate(retreat.start_date)} – {formatDate(retreat.end_date)}
                </div>
                <div className="flex items-center gap-2"><MapPin size={13} className="text-emerald-600" />
                  {retreat.destination}
                </div>
                <div className="flex items-center gap-2"><DollarSign size={13} className="text-emerald-600" />
                  {formatCurrency(retreat.budget)} total budget
                </div>
              </div>
              {retreat.concept && (
                <div className="pt-3 mt-3 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 mb-1.5">
                    <FileText size={11} /> Concept
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">{retreat.concept}</p>
                </div>
              )}
              {/* chips summary */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
                  <CalendarDays size={11} /> {formatDate(retreat.start_date)} – {formatDate(retreat.end_date)}
                </span>
                {!retreat.concept && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ring-1 bg-amber-50 text-amber-700 ring-amber-200">
                    <Lightbulb size={11} /> Add a concept for smarter suggestions
                  </span>
                )}
              </div>
              {retreat.start_date && retreat.end_date && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <AddToCalendarButton retreat={retreat} />
                </div>
              )}
            </>
          )}
        </div>

        {/* budget breakdown */}
        <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-5 fade-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="size-7 shrink-0 grid place-items-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100 text-emerald-700">
                <Wallet size={14} />
              </span>
              <h2 className="text-sm font-semibold text-stone-800">Budget breakdown</h2>
            </div>
            <span className="text-xs text-stone-400">{totalBudget > 0 ? formatCurrency(totalBudget) + ' total' : 'Set a budget'}</span>
          </div>

          {totalBudget === 0 ? (
            <p className="text-sm text-stone-400">Set a total budget above to see the spending split.</p>
          ) : (
            <>
              {/* multi-color bar */}
              <div className="flex h-3 w-full rounded-full overflow-hidden ring-1 ring-stone-200 mb-4">
                {budgetRows.map(b => (
                  <div key={b.key} className={b.bar} style={{ width: `${b.pct}%` }}
                    title={`${b.label} · ${formatCurrency(b.amount)}`} />
                ))}
                {/* remaining */}
                {spent < totalBudget && (
                  <div className="bg-stone-100 flex-1" title="Remaining" />
                )}
              </div>

              {budgetRows.length > 0 ? (
                <div className="space-y-2">
                  {budgetRows.map(b => (
                    <div key={b.key} className="flex items-center gap-3">
                      <span className={cn('size-2.5 rounded-full shrink-0', b.bar)} />
                      <span className="text-sm font-medium text-stone-700 w-28 shrink-0">{b.label}</span>
                      <span className="text-xs text-stone-400 w-8 tabular-nums">{b.pct}%</span>
                      <span className="text-sm font-semibold text-stone-800 tabular-nums ml-auto">{formatCurrency(b.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2 border-t border-stone-100 mt-2">
                    <span className="size-2.5 rounded-full shrink-0 bg-stone-100" />
                    <span className="text-sm font-medium text-stone-500 w-28 shrink-0">Remaining</span>
                    <span className="text-sm font-semibold ml-auto">{formatCurrency(totalBudget - spent)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-stone-400">Add vendors with costs to see the breakdown.</p>
              )}
            </>
          )}
        </div>

        {/* quick stats */}
        <div className="grid grid-cols-3 gap-3 fade-up">
          <StatCard icon={<Handshake size={15} />} label="Vendors" value={vendors.length}
            sub={spent > 0 ? formatCurrency(spent) + ' committed' : 'None yet'} />
          <StatCard icon={<Users size={15} />} label="Guests" value={participants.length}
            sub={paidPct > 0 ? `${paidPct}% paid` : 'None registered'} />
          <StatCard icon={<CalendarDays size={15} />} label="Sessions" value={schedule.length}
            sub={schedule.length > 0 ? 'scheduled' : 'None yet'} />
        </div>

        {/* AI tip */}
        {!retreat.concept && (
          <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-4 flex items-start gap-3 fade-up">
            <Sparkles size={15} className="text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-800">
              Add a concept or theme (like "yoga", "offsite", "wedding") — the AI agent uses it for smarter advice.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT RAIL */}
      <div className="space-y-4">
        {/* AI agent panel */}
        <AgentPanel retreat={retreat} vendors={vendors} participants={participants} schedule={schedule} />

        {/* open decisions checklist */}
        <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
              <CheckCircle2 size={14} className="text-stone-400" /> Open decisions
            </h2>
            <span className="text-xs font-semibold text-stone-400 tabular-nums">{doneCount}/{decisions.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden mb-3">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${decisionPct}%` }} />
          </div>
          <div className="space-y-0.5">
            {decisions.map(d => (
              <div key={d.id} className={cn('flex items-start gap-2 rounded-lg px-2 py-1.5', !d.done && 'hover:bg-stone-50')}>
                {d.done
                  ? <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                  : <Circle size={15} className="shrink-0 mt-0.5 text-stone-300" />
                }
                <span className="min-w-0">
                  <span className={cn('text-sm', d.done ? 'text-stone-400 line-through' : 'text-stone-700 font-medium')}>
                    {d.label}
                  </span>
                  {!d.done && <span className="block text-xs text-stone-400">{d.hint}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{label}</div>
        <span className="text-stone-400">{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-stone-800">{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
    </div>
  )
}

// ── Add to Calendar ────────────────────────────────────────────────────────

function toCalDate(dateStr: string) {
  return dateStr.replace(/-/g, '')
}

// iCal DTEND is exclusive — add 1 day to the end date
function iCalEndDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function AddToCalendarButton({ retreat }: { retreat: Retreat }) {
  const [open, setOpen] = useState(false)

  const title    = encodeURIComponent(retreat.name)
  const location = encodeURIComponent(retreat.destination)
  const details  = encodeURIComponent(
    [retreat.concept, retreat.destination].filter(Boolean).join(' · ')
  )
  const start = toCalDate(retreat.start_date)
  const end   = toCalDate(retreat.end_date)

  const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${title}&dates=${start}%2F${end}&details=${details}&location=${location}`

  function downloadIcs() {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RetReach//EN',
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${iCalEndDate(retreat.end_date)}`,
      `SUMMARY:${retreat.name}`,
      `DESCRIPTION:${[retreat.concept, retreat.destination].filter(Boolean).join(' - ')}`,
      `LOCATION:${retreat.destination}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${retreat.name.replace(/\s+/g, '-')}.ics`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 ring-1 ring-stone-200 hover:ring-emerald-200 rounded-lg px-3 py-1.5 transition"
      >
        <CalendarPlus size={13} />
        Add to calendar
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white ring-1 ring-stone-200 rounded-xl shadow-lg py-1 w-44 fade-up">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition"
            >
              <span className="text-base">📅</span> Google Calendar
            </a>
            <button
              onClick={downloadIcs}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition"
            >
              <span className="text-base">📥</span> Download .ics
            </button>
          </div>
        </>
      )}
    </div>
  )
}
