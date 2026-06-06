'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import AgentPanel from '@/components/retreat/AgentPanel'
import { Edit2, Check, X, MapPin, Calendar, DollarSign, FileText, Users, Handshake, CalendarDays, Sparkles } from 'lucide-react'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
}

const inputCls = 'w-full text-sm bg-white rounded-lg px-3 py-2 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Planning</h1>
            <p className="text-sm text-stone-400 mt-0.5">Retreat concept & details</p>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
            >
              <Edit2 size={14} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancel} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-700">
                <X size={14} /> Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                <Check size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Details card */}
        <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-5 space-y-4">
          {editing ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Retreat name</label>
                <input value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Destination</label>
                <input value={form.destination} onChange={e => update('destination', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Concept / theme</label>
                <textarea value={form.concept} onChange={e => update('concept', e.target.value)} rows={3}
                  placeholder="e.g. Leadership retreat focused on strategy and team cohesion"
                  className={inputCls + ' resize-none'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">Start date</label>
                  <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">End date</label>
                  <input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">Budget (USD)</label>
                <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)} className={inputCls} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-stone-900">{retreat.name}</h2>
                {days > 0 && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-2.5 py-1">
                    {days}d away
                  </span>
                )}
              </div>
              <div className="space-y-2.5 text-sm text-stone-600">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-stone-400 shrink-0" />
                  {retreat.destination}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-stone-400 shrink-0" />
                  {formatDate(retreat.start_date)} – {formatDate(retreat.end_date)}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-stone-400 shrink-0" />
                  {formatCurrency(retreat.budget)} total budget
                </div>
              </div>
              {retreat.concept && (
                <div className="pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 mb-1.5">
                    <FileText size={12} /> Concept
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">{retreat.concept}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Handshake size={15} />} label="Vendors" value={vendors.length} sub={`${formatCurrency(spent)} committed`} />
          <StatCard icon={<Users size={15} />} label="Guests" value={participants.length} sub={`${paidPct}% paid`} />
          <StatCard icon={<CalendarDays size={15} />} label="Sessions" value={schedule.length} sub="scheduled" />
        </div>

        {/* Budget bar */}
        {retreat.budget > 0 && (
          <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-stone-700 flex items-center gap-1"><DollarSign size={13} />Budget</span>
              <span className="text-stone-400">{formatCurrency(spent)} / {formatCurrency(retreat.budget)}</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  spent / retreat.budget > 0.9 ? 'bg-rose-500' :
                  spent / retreat.budget > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min((spent / retreat.budget) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-stone-400 mt-1">{formatCurrency(retreat.budget - spent)} remaining</p>
          </div>
        )}

        {/* AI tip */}
        {!retreat.concept && (
          <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles size={16} className="text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-800">
              Add a concept or theme — the AI agent uses it to give smarter planning advice.
            </p>
          </div>
        )}
      </div>

      {/* Agent */}
      <div className="lg:col-span-1">
        <AgentPanel retreat={retreat} vendors={vendors} participants={participants} schedule={schedule} />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-4">
      <div className="flex items-center gap-2 text-stone-400 mb-2">{icon}<span className="text-xs font-semibold">{label}</span></div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
    </div>
  )
}
