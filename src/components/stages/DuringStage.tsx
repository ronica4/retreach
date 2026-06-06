'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Phone, Mail, Clock, MapPin, Check, AlertCircle, Plus, X,
  DoorOpen, Zap, CalendarDays, Wrench, Salad,
} from 'lucide-react'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
}

const QUICK_ISSUES = ['Room not ready', 'Food / dietary issue', 'Transport delay', 'AV glitch in session', 'Late arrival']

export default function DuringStage({ retreat, vendors, participants, schedule }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const todayItems = schedule.filter(s => s.date === today)

  // ── local state: arrived + issues (persisted to localStorage per retreat) ──
  const LS_ARR = `retreach_arrived_${retreat.id}`
  const LS_ISS = `retreach_issues_${retreat.id}`

  const [arrived, setArrived] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_ARR) ?? '{}') } catch { return {} }
  })
  const [issues, setIssues] = useState<{ id: string; text: string; done: boolean }[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_ISS) ?? '[]') } catch { return [] }
  })
  const [issueText, setIssueText] = useState('')

  function saveArrived(next: Record<string, boolean>) {
    setArrived(next); localStorage.setItem(LS_ARR, JSON.stringify(next))
  }
  function saveIssues(next: typeof issues) {
    setIssues(next); localStorage.setItem(LS_ISS, JSON.stringify(next))
  }

  function toggleArrived(id: string) {
    saveArrived({ ...arrived, [id]: !arrived[id] })
  }
  function addIssue(text?: string) {
    const t = (text ?? issueText).trim(); if (!t) return
    saveIssues([{ id: Date.now().toString(), text: t, done: false }, ...issues])
    setIssueText('')
  }
  function toggleIssue(id: string) {
    saveIssues(issues.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  const arrivedCount = participants.filter(p => arrived[p.id]).length
  const openIssues = issues.filter(i => !i.done).length

  return (
    <div>
      {/* page header */}
      <div className="flex items-end justify-between gap-4 mb-6 fade-up">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">During the retreat</h1>
          <p className="text-sm text-stone-400 mt-0.5">Check guests in, handle issues, and keep the team aligned.</p>
        </div>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat icon={<Check size={14} />} label="Arrived" tone="emerald"
          value={`${arrivedCount}/${participants.length}`}
          progress={participants.length ? Math.round(arrivedCount / participants.length * 100) : null} />
        <Stat icon={<Wrench size={14} />} label="Open issues" tone={openIssues ? 'rose' : 'stone'}
          value={String(openIssues)} />
        <Stat icon={<CalendarDays size={14} />} label="Program days"
          value={String(new Set(schedule.map(s => s.date)).size)} />
      </div>

      {/* today briefing */}
      {todayItems.length > 0 && (
        <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-4 mb-5 fade-up card">
          <p className="text-sm font-semibold text-emerald-800 mb-2.5">Today — {formatDate(today)}</p>
          <div className="space-y-1.5">
            {todayItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-emerald-700">
                <Clock size={13} className="shrink-0" />
                <span className="font-medium w-14 shrink-0">{item.start_time}</span>
                <span>{item.title}</span>
                {item.location && (
                  <span className="text-emerald-500 flex items-center gap-0.5 text-xs ml-auto">
                    <MapPin size={10} />{item.location}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* check-in list */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden fade-up">
          <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-stone-100">
            <DoorOpen size={14} className="text-stone-400" />
            <h2 className="font-semibold text-stone-800">Check-in</h2>
            <span className="text-xs text-stone-400 ml-auto">tap to mark arrival</span>
          </div>
          <div className="max-h-[58vh] overflow-y-auto nice-scroll divide-y divide-stone-100">
            {participants.length === 0 && (
              <p className="text-center text-stone-400 text-sm py-10">No participants added.</p>
            )}
            {participants.map(p => (
              <button key={p.id} onClick={() => toggleArrived(p.id)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-stone-50/60 transition">
                <span className={cn('size-6 shrink-0 rounded-full grid place-items-center ring-1',
                  arrived[p.id] ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white ring-stone-300'
                )}>
                  {arrived[p.id] && <Check size={12} strokeWidth={3} className="pop-check" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-semibold text-sm', arrived[p.id] ? 'text-stone-400' : 'text-stone-800')}>
                    {p.name}
                  </div>
                  {p.food_preferences && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                      <Salad size={10} /> {p.food_preferences}
                    </div>
                  )}
                  {!p.food_preferences && p.phone && (
                    <div className="text-xs text-stone-400">{p.phone}</div>
                  )}
                </div>
                {arrived[p.id] && (
                  <span className="text-xs font-semibold text-emerald-600">Arrived</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* issues tracker */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5 fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={14} className="text-stone-400" />
            <h2 className="font-semibold text-stone-800">Issues & team tasks</h2>
          </div>

          <div className="flex gap-2 mb-2">
            <input value={issueText} onChange={e => setIssueText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIssue()}
              placeholder="Describe an issue / urgent task…"
              className="flex-1 text-sm px-3 py-2.5 ring-1 ring-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition" />
            <button onClick={() => addIssue()}
              className="px-3 bg-emerald-700 text-white rounded-lg grid place-items-center transition active:scale-[0.98] hover:bg-emerald-800">
              <Plus size={14} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_ISSUES.map(q => (
              <button key={q} onClick={() => addIssue(q)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-stone-200 text-stone-600 hover:ring-emerald-300 hover:text-emerald-700 transition">
                {q}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto nice-scroll">
            {issues.length === 0 && (
              <p className="text-center text-sm text-stone-400 py-4">No open issues — all calm</p>
            )}
            {issues.map(i => (
              <div key={i.id} className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2.5 ring-1',
                i.done ? 'bg-stone-50 ring-stone-200' : 'bg-rose-50 ring-rose-200'
              )}>
                <button onClick={() => toggleIssue(i.id)}
                  className={cn('size-5 shrink-0 rounded-md grid place-items-center ring-1',
                    i.done ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white ring-rose-300'
                  )}>
                  {i.done && <Check size={11} strokeWidth={3} className="pop-check" />}
                </button>
                <span className={cn('flex-1 text-sm font-medium',
                  i.done ? 'line-through text-stone-400' : 'text-rose-800'
                )}>{i.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* schedule / vendors / participants tabs */}
      <div className="mt-6">
        <ScheduleVendorsParticipants vendors={vendors} participants={participants} schedule={schedule} today={today} />
      </div>
    </div>
  )
}

function Stat({ icon, label, value, tone = 'stone', progress }: {
  icon: React.ReactNode; label: string; value: string; tone?: string; progress?: number | null
}) {
  const tones: Record<string, string> = {
    stone: 'text-stone-800', emerald: 'text-emerald-700', rose: 'text-rose-600', amber: 'text-amber-600',
  }
  const barTones: Record<string, string> = {
    stone: 'bg-stone-400', emerald: 'bg-emerald-500', rose: 'bg-rose-400', amber: 'bg-amber-400',
  }
  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{label}</div>
        <span className="text-stone-400">{icon}</span>
      </div>
      <div className={cn('text-2xl font-semibold tabular-nums', tones[tone] ?? tones.stone)}>{value}</div>
      {progress != null && (
        <div className="mt-2 h-1 rounded-full bg-stone-100 overflow-hidden">
          <div className={cn('h-full rounded-full transition-[width] duration-500', barTones[tone] ?? barTones.stone)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  )
}

function ScheduleVendorsParticipants({ vendors, participants, schedule, today }: {
  vendors: Vendor[]; participants: Participant[]; schedule: ScheduleItem[]; today: string
}) {
  const [view, setView] = useState<'schedule' | 'vendors' | 'participants'>('schedule')
  const grouped = schedule.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item); return acc
  }, {} as Record<string, ScheduleItem[]>)

  return (
    <div>
      <div className="flex gap-1 border-b border-stone-200 mb-4">
        {(['schedule', 'vendors', 'participants'] as const).map(tab => (
          <button key={tab} onClick={() => setView(tab)}
            className={cn('px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors',
              view === tab ? 'text-emerald-700 border-emerald-700' : 'text-stone-500 border-transparent hover:text-stone-700'
            )}>
            {tab}
          </button>
        ))}
      </div>

      {view === 'schedule' && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                {formatDate(date)}{date === today && ' · Today'}
              </h3>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="bg-white ring-1 ring-stone-200 rounded-xl p-3 flex items-start gap-3 card">
                    <div className="text-sm text-stone-400 w-14 shrink-0 font-mono">{item.start_time}</div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{item.title}</p>
                      {item.location && <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-0.5"><MapPin size={10} />{item.location}</p>}
                      {item.vendor && <p className="text-xs text-emerald-600 mt-0.5">{item.vendor.name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && <p className="text-sm text-stone-400 text-center py-8">No schedule items.</p>}
        </div>
      )}

      {view === 'vendors' && (
        <div className="space-y-2">
          {vendors.map(v => (
            <div key={v.id} className="bg-white ring-1 ring-stone-200 card rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-900">{v.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">{v.category}</span>
                </div>
                {v.contact_name && <p className="text-xs text-stone-400 mt-0.5">{v.contact_name}</p>}
              </div>
              <div className="flex items-center gap-2">
                {v.contact_phone && <a href={`tel:${v.contact_phone}`} className="text-stone-400 hover:text-emerald-700"><Phone size={15} /></a>}
                {v.contact_email && <a href={`mailto:${v.contact_email}`} className="text-stone-400 hover:text-emerald-700"><Mail size={15} /></a>}
              </div>
            </div>
          ))}
          {vendors.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No vendors added.</p>}
        </div>
      )}

      {view === 'participants' && (
        <div className="space-y-2">
          {participants.map(p => (
            <div key={p.id} className="bg-white ring-1 ring-stone-200 card rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900">{p.name}</p>
                <p className="text-xs text-stone-400">{p.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  p.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                  p.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                  'bg-stone-100 text-stone-500'
                )}>{p.payment_status}</span>
                {p.phone && <a href={`tel:${p.phone}`} className="text-stone-400 hover:text-emerald-700"><Phone size={15} /></a>}
              </div>
            </div>
          ))}
          {participants.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No participants.</p>}
        </div>
      )}
    </div>
  )
}
