'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getRetreatStage } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import DestinationSelector from '@/components/booking/DestinationSelector'
import {
  ArrowLeft, Sprout, MapPin, Calendar, Compass, Handshake,
  Users, CalendarDays, LayoutDashboard, Zap, Star, MessageSquare,
  FolderOpen, CheckCircle2, Bot, Sparkles, Circle,
} from 'lucide-react'

const PHASES = [
  {
    group: 'BEFORE',
    stages: [
      { id: 'planning',     label: 'Planning',      Icon: Compass,         desc: 'Define the retreat' },
      { id: 'vendors',      label: 'Vendors',        Icon: Handshake,       desc: 'Coordination & AI reminders' },
      { id: 'participants', label: 'Participants',   Icon: Users,           desc: 'Registration & payments' },
      { id: 'agenda',       label: 'Agenda',         Icon: CalendarDays,    desc: 'Build the daily schedule' },
      { id: 'pre',          label: 'Overview',       Icon: LayoutDashboard, desc: 'Timeline, tasks & alerts' },
    ],
  },
  {
    group: 'DURING',
    stages: [
      { id: 'during', label: 'During', Icon: Zap, desc: 'Check-in & issue handling' },
    ],
  },
  {
    group: 'AFTER',
    stages: [
      { id: 'reviews',  label: 'Vendor reviews', Icon: Star,          desc: 'Rate your vendors' },
      { id: 'feedback', label: 'Feedback',        Icon: MessageSquare, desc: 'Guest NPS & themes' },
      { id: 'content',  label: 'Content',         Icon: FolderOpen,    desc: 'Photos, decks & media' },
      { id: 'closing',  label: 'Closing',         Icon: CheckCircle2,  desc: 'Wrap-up & export' },
    ],
  },
]

const inputCls = 'w-full text-sm bg-white rounded-lg px-3 py-2.5 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition placeholder:text-stone-300'
const labelCls = 'block text-xs font-semibold text-stone-500 mb-1'

export default function NewRetreatPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    destination: '',
    concept: '',
    start_date: '',
    end_date: '',
    budget: '',
    number_of_participants: '',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error } = await supabase
      .from('retreats')
      .insert({
        manager_id: user.id,
        name: form.name,
        destination: form.destination,
        concept: form.concept || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: parseFloat(form.budget) || 0,
        number_of_participants: form.number_of_participants ? parseInt(form.number_of_participants) : null,
      })
      .select()
      .single()

    if (error || !data) {
      setError(error?.message ?? 'Failed to create retreat')
      setLoading(false)
      return
    }

    router.push(`/retreat/${data.id}/booking-assistant`)
  }

  // open decisions derived from form state
  const decisions = [
    { label: 'Set retreat dates',    hint: 'Dates drive every deadline.', done: !!(form.start_date && form.end_date) },
    { label: 'Set a total budget',   hint: 'Unlocks the budget breakdown.', done: !!form.budget },
    { label: 'Define the concept',   hint: "Helps tailor vendor suggestions.", done: !!form.concept.trim() },
    { label: 'Choose a destination', hint: 'Location shapes logistics.', done: !!form.destination.trim() },
    { label: 'Name your retreat',    hint: 'Sets the tone for everything.', done: !!form.name.trim() },
    { label: 'Add participants',     hint: 'Needed for occupancy & flights.', done: !!form.number_of_participants },
    { label: 'Search hotels & flights', hint: 'Book accommodations and travel.', done: false },
  ]
  const doneCount = decisions.filter(d => d.done).length

  // maya tips based on form state
  const tips: string[] = []
  if (!form.concept.trim()) tips.push('Add a concept (e.g. "yoga", "offsite", "leadership") and I\'ll tailor the whole plan.')
  if (!form.start_date)     tips.push('Set dates first — they drive all your deadlines and timeline.')
  if (!form.budget)         tips.push('A budget unlocks the spend breakdown and per-vendor tracking.')
  if (tips.length === 0)    tips.push('Looking good! Create the retreat and I\'ll be ready to assist on every stage.')

  const hasDate = !!(form.start_date && form.end_date)

  return (
    <div className="h-screen flex overflow-hidden bg-stone-50">

      {/* ── Left sidebar (static preview) ── */}
      <aside className="w-64 shrink-0 bg-emerald-950 flex flex-col h-full overflow-y-auto">
        <div className="px-4 pt-5 pb-3">
          <Link href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-white transition-colors">
            <ArrowLeft size={13} /> All retreats
          </Link>
          <div className="flex items-center gap-2 mt-4 mb-0.5">
            <div className="size-7 rounded-lg bg-emerald-700 grid place-items-center text-white shrink-0">
              <Sprout size={13} />
            </div>
            <span className="text-sm font-semibold text-white">Retreat OS</span>
          </div>
        </div>

        {/* retreat info card — shows live form values */}
        <div className="mx-3 mb-4 bg-emerald-900/60 rounded-xl p-3 ring-1 ring-emerald-800/50">
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
            {form.name || 'Untitled retreat'}
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-300">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{form.destination || 'No location set'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-300">
              <Calendar size={11} className="shrink-0" />
              <span>{hasDate ? `${form.start_date} – ${form.end_date}` : 'No date set'}</span>
            </div>
          </div>
        </div>

        {/* nav — all items non-linked (grayed) since retreat doesn't exist yet */}
        <nav className="flex-1 px-2 pb-6">
          {PHASES.map(({ group, stages }) => (
            <div key={group} className="mb-5">
              <p className="px-2 mb-1.5 text-[10px] font-bold tracking-widest text-emerald-500 uppercase">{group}</p>
              <div className="space-y-0.5">
                {stages.map(({ id, label, Icon, desc }) => (
                  <div key={id}
                    className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
                      id === 'planning'
                        ? 'bg-emerald-700 text-white font-medium'
                        : 'text-emerald-600 cursor-not-allowed opacity-60'
                    )}>
                    <Icon size={15} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="leading-none truncate">{label}</div>
                      <div className="text-[10px] mt-0.5 text-emerald-400 truncate leading-none">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main form ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">

          {/* header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">Step 1 of 5</p>
              <h1 className="text-2xl font-bold text-stone-900">Planning</h1>
              <p className="text-sm text-stone-400 mt-0.5">Set the compass — concept, dates, budget — and let the manager draft the plan.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                <Compass size={14} className="text-stone-400" /> Retreat info
              </h2>

              <div>
                <label className={labelCls}>Retreat name *</label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                  required placeholder="Mountain Reset"
                  className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Start date</label>
                  <input type="date" value={form.start_date}
                    onChange={e => update('start_date', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End date</label>
                  <input type="date" value={form.end_date} min={form.start_date}
                    onChange={e => update('end_date', e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Location *</label>
                <DestinationSelector value={form.destination} onChange={e => update('destination', e)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Concept / theme</label>
                  <input type="text" value={form.concept} onChange={e => update('concept', e.target.value)}
                    placeholder="Yoga & nature reset"
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Participants *</label>
                  <input type="number" value={form.number_of_participants} onChange={e => update('number_of_participants', e.target.value)}
                    min="1" placeholder="15"
                    required className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Total budget (USD)</label>
                <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)}
                  min="0" step="100" placeholder="50000"
                  className={inputCls} />
              </div>
            </div>

            {/* status chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1',
                hasDate ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-stone-100 text-stone-500 ring-stone-200'
              )}>
                <Calendar size={11} /> {hasDate ? `${form.start_date} → ${form.end_date}` : 'No date set'}
              </span>
              {!hasDate && (
                <span className="text-xs text-stone-400 italic">Changing dates auto-updates the timeline &amp; deadlines</span>
              )}
            </div>

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg ring-1 ring-rose-200">{error}</p>
            )}

            <div className="flex justify-between items-center gap-3 pt-1">
              <Link href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors">
                Cancel
              </Link>
              <button type="submit" disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm">
                {loading ? 'Creating…' : 'Create retreat →'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* ── Right: Maya panel ── */}
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-stone-200 bg-white px-4 py-6 space-y-4">
        {/* Maya card */}
        <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-4 card">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="size-8 rounded-full bg-emerald-700 grid place-items-center text-white shrink-0">
              <Bot size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Maya</p>
              <p className="text-xs text-stone-400">Your retreat manager</p>
            </div>
          </div>

          <button disabled
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-emerald-800 text-white rounded-xl py-2.5 mb-4 opacity-60 cursor-not-allowed">
            <Sparkles size={14} /> Plan it for me
          </button>
          <p className="text-xs text-stone-400 text-center -mt-2 mb-3">Available after creating your retreat</p>

          <div className="space-y-2.5">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-stone-600">
                <Sparkles size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Open decisions */}
        <div className="bg-white ring-1 ring-stone-200 rounded-2xl overflow-hidden card">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-stone-100">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-stone-400" />
              <p className="text-sm font-semibold text-stone-800">Open decisions</p>
            </div>
            <span className="text-xs font-semibold text-stone-400">{doneCount}/{decisions.length}</span>
          </div>
          <div className="divide-y divide-stone-100">
            {decisions.map((d, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                {d.done
                  ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  : <Circle size={14} className="text-stone-300 shrink-0 mt-0.5" />
                }
                <div>
                  <p className={cn('text-xs font-semibold', d.done ? 'text-stone-400 line-through' : 'text-stone-800')}>{d.label}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">{d.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

    </div>
  )
}
