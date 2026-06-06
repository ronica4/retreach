'use client'

import { useState } from 'react'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'
import { formatDate, formatCurrency, daysUntil } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Calendar, MapPin, Handshake, CheckCircle2, AlarmClock, Bell, TrendingDown, Check } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
}

const BUCKETS = [
  { min: 60,      label: 'Early',         sub: '60+ days out',  dot: 'bg-stone-300' },
  { min: 30,      label: 'A month out',   sub: '30–59 days',    dot: 'bg-emerald-300' },
  { min: 14,      label: 'Two weeks out', sub: '14–29 days',    dot: 'bg-emerald-400' },
  { min: 7,       label: 'A week out',    sub: '7–13 days',     dot: 'bg-emerald-500' },
  { min: 1,       label: 'Final days',    sub: '1–6 days',      dot: 'bg-amber-400' },
  { min: -Infinity, label: 'Event day / past', sub: '0 or overdue', dot: 'bg-rose-400' },
]
function bucketOf(daysLeft: number) {
  return BUCKETS.findIndex(b => daysLeft >= b.min)
}

// Derive to-do tasks from vendors + staples
function deriveTasks(vendors: Vendor[], startDate: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const vendorTasks = vendors.map(v => ({
    id: 'task-' + v.id,
    title: `${v.deliverables || 'Coordinate'} — ${v.name}`,
    deadline: v.deadline,
    done: v.status === 'completed',
  }))
  const staples = startDate ? [
    { id: 'tk-rooming', title: 'Assign rooming list', deadline: offsetDate(startDate, -7), done: false },
    { id: 'tk-remind',  title: 'Send reminder + packing list to guests', deadline: offsetDate(startDate, -5), done: false },
    { id: 'tk-kits',    title: 'Prepare welcome kits', deadline: offsetDate(startDate, -3), done: false },
    { id: 'tk-brief',   title: 'Brief the team on the day', deadline: offsetDate(startDate, -1), done: false },
  ] : []
  return [...vendorTasks, ...staples].sort((a, b) => {
    if (!a.deadline) return 1; if (!b.deadline) return -1
    return a.deadline.localeCompare(b.deadline)
  })
}

function offsetDate(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function PreStage({ retreat, vendors, participants, schedule }: Props) {
  const { id } = useParams<{ id: string }>()
  const days = daysUntil(retreat.start_date)
  const today = new Date().toISOString().split('T')[0]

  const budget = vendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const pending = vendors.filter(v => v.status === 'pending').length
  const tasks = deriveTasks(vendors, retreat.start_date)
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({})
  const doneCount = tasks.filter(t => t.done || doneTasks[t.id]).length
  const openCount = tasks.length - doneCount
  const taskPct = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0

  // alerts
  const alerts: { icon: React.ReactNode; tone: 'rose' | 'amber'; text: string }[] = []
  vendors.forEach(v => {
    if (v.status === 'pending' && v.deadline && v.deadline < today)
      alerts.push({ icon: <AlarmClock size={14} />, tone: 'rose', text: `Overdue: "${v.deliverables || v.name}" — ${v.name}` })
    else if (v.status === 'pending' && v.deadline) {
      const d = Math.round((new Date(v.deadline).getTime() - new Date(today).getTime()) / 86400000)
      if (d <= 5) alerts.push({ icon: <Bell size={14} />, tone: 'amber', text: `Coming up (${d === 0 ? 'today' : `in ${d}d`}): ${v.name}` })
    }
  })
  if (retreat.budget > 0 && budget > retreat.budget)
    alerts.push({ icon: <TrendingDown size={14} />, tone: 'rose', text: `Over budget: ${formatCurrency(budget)} of ${formatCurrency(retreat.budget)}` })

  // timeline groups
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0)
  const vendorsWithDL = vendors.filter(v => v.deadline)
  const groups = BUCKETS.map((b, i) => ({
    ...b,
    items: vendorsWithDL.filter(v => {
      const d = Math.round((new Date(v.deadline!).getTime() - todayD.getTime()) / 86400000)
      return bucketOf(d) === i
    }),
  })).filter(g => g.items.length > 0)

  if (!retreat.start_date && vendors.length === 0) {
    return (
      <div>
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-stone-800">Overview</h1>
          <p className="text-sm text-stone-400 mt-0.5">Timeline, tasks and alerts — auto-built from your data.</p>
        </div>
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-8 text-center text-stone-400">
          <p className="text-sm font-semibold text-stone-700 mb-1">Nothing to show yet</p>
          <p className="text-sm">Set dates and add vendors — the timeline and tasks build themselves.</p>
          <div className="flex justify-center gap-2 mt-4">
            <Link href={`/retreat/${id}/planning`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg px-4 py-2.5 transition">
              Go to Planning
            </Link>
            <Link href={`/retreat/${id}/vendors`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-200 rounded-lg px-4 py-2.5 transition">
              Go to Vendors
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* header */}
      <div className="flex items-end justify-between gap-4 mb-6 fade-up">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Overview</h1>
          <p className="text-sm text-stone-400 mt-0.5">Timeline, tasks and alerts — all updated automatically.</p>
        </div>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatTile icon={<Calendar size={13} />} label="To retreat"
          value={days == null ? '—' : days >= 0 ? `${days} days` : 'Past'}
          sub={retreat.start_date ? `${formatDate(retreat.start_date)} – ${formatDate(retreat.end_date)}` : ''}
          tone="emerald" />
        <StatTile icon={<span className="text-xs font-bold">$</span>} label="Vendor spend"
          value={formatCurrency(budget)}
          sub={`Budget: ${formatCurrency(retreat.budget)}`}
          tone={retreat.budget > 0 && budget > retreat.budget ? 'rose' : 'stone'} />
        <StatTile icon={<Handshake size={13} />} label="Pending vendors"
          value={String(pending)} sub={`of ${vendors.length}`}
          tone={pending ? 'amber' : 'stone'} />
        <StatTile icon={<CheckCircle2 size={13} />} label="Tasks done"
          value={`${doneCount}/${tasks.length}`} sub={`${openCount} open`}
          tone={openCount ? 'amber' : 'emerald'} progress={taskPct} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* timeline */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5 fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-stone-400" />
              <h2 className="text-sm font-semibold text-stone-800">Timeline</h2>
            </div>
            <span className="text-xs text-stone-400">Updates with the date</span>
          </div>

          <div className="relative pl-5 max-h-[58vh] overflow-y-auto nice-scroll">
            <div className="absolute top-2 bottom-2 left-[7px] w-0.5 bg-stone-200" />
            {groups.length === 0 && (
              <p className="text-sm text-stone-400">Add vendors with deadlines to see the timeline.</p>
            )}
            {groups.map(g => (
              <div key={g.label} className="mb-5 last:mb-0">
                <div className="flex items-center gap-3 mb-2 -ml-[3px]">
                  <span className={cn('size-4 rounded-full ring-4 ring-white z-10', g.dot)} />
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-semibold text-stone-800 text-sm leading-none">{g.label}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{g.sub}</div>
                    </div>
                    <span className="inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 ring-1 bg-stone-100 text-stone-600 ring-stone-200">
                      {g.items.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {g.items.map(v => {
                    const dLeft = Math.round((new Date(v.deadline!).getTime() - todayD.getTime()) / 86400000)
                    const overdue = dLeft < 0 && v.status === 'pending'
                    return (
                      <div key={v.id} className={cn('ml-1 rounded-lg bg-white ring-1 px-3 py-1.5',
                        overdue ? 'ring-rose-200 bg-rose-50/40' : 'ring-stone-200'
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-800 text-sm truncate flex-1">{v.name}</span>
                          <span className={cn('size-2 rounded-full',
                            v.status === 'completed' ? 'bg-stone-400' :
                            v.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-400'
                          )} />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-stone-500 truncate max-w-[60%]">{v.deliverables}</span>
                          <span className={cn('text-xs font-semibold', overdue ? 'text-rose-600' : 'text-stone-400')}>
                            {formatDate(v.deadline!)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {/* retreat marker */}
            {retreat.start_date && (
              <div className="flex items-center gap-3 -ml-[3px] mt-1">
                <span className="size-4 rounded-full bg-emerald-600 ring-4 ring-white z-10" />
                <div className="flex-1 rounded-lg bg-gradient-to-r from-emerald-50 to-amber-50 ring-1 ring-emerald-200 px-3 py-2">
                  <div className="font-semibold text-emerald-800 text-sm">{retreat.name}</div>
                  <div className="text-xs text-emerald-600 font-medium">
                    {formatDate(retreat.start_date)} – {formatDate(retreat.end_date)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* alerts */}
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5 fade-up">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-stone-400" />
              <h2 className="text-sm font-semibold text-stone-800">Alerts ({alerts.length})</h2>
            </div>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                <CheckCircle2 size={14} /> All under control — no open alerts
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2.5 ring-1 text-sm font-medium',
                    a.tone === 'rose' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
                  )}>
                    {a.icon} {a.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* to-do list */}
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden fade-up">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-stone-400" />
                <h2 className="text-sm font-semibold text-stone-800">To-do list</h2>
              </div>
              <span className="text-xs text-stone-400">{doneCount}/{tasks.length} done</span>
            </div>
            <div className="max-h-[34vh] overflow-y-auto nice-scroll divide-y divide-stone-100">
              {tasks.map(t => {
                const isDone = t.done || !!doneTasks[t.id]
                const dLeft = t.deadline ? Math.round((new Date(t.deadline).getTime() - todayD.getTime()) / 86400000) : null
                const overdue = dLeft != null && dLeft < 0 && !isDone
                return (
                  <button key={t.id} onClick={() => setDoneTasks(p => ({ ...p, [t.id]: !p[t.id] }))}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-stone-50/60 transition">
                    <span className={cn('size-5 shrink-0 rounded-md grid place-items-center ring-1',
                      isDone ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white ring-stone-300'
                    )}>
                      {isDone && <Check size={11} strokeWidth={3} className="pop-check" />}
                    </span>
                    <span className={cn('flex-1 text-sm', isDone ? 'line-through text-stone-400' : 'text-stone-700 font-medium')}>
                      {t.title}
                    </span>
                    {t.deadline && (
                      <span className={cn('text-xs font-semibold',
                        overdue ? 'text-rose-500' : 'text-stone-400'
                      )}>
                        {formatDate(t.deadline)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatTile({ icon, label, value, sub, tone = 'stone', progress }: {
  icon: React.ReactNode; label: string; value: string; sub: string; tone?: string; progress?: number
}) {
  const vals: Record<string, string> = { stone: 'text-stone-800', emerald: 'text-emerald-700', rose: 'text-rose-600', amber: 'text-amber-600' }
  const bars: Record<string, string> = { stone: 'bg-stone-400', emerald: 'bg-emerald-500', rose: 'bg-rose-500', amber: 'bg-amber-400' }
  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{label}</div>
        <span className="text-stone-400">{icon}</span>
      </div>
      <div className={cn('text-2xl font-semibold tabular-nums', vals[tone] ?? vals.stone)}>{value}</div>
      {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
      {progress != null && (
        <div className="mt-2 h-1 rounded-full bg-stone-100 overflow-hidden">
          <div className={cn('h-full rounded-full transition-[width] duration-500', bars[tone] ?? bars.stone)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  )
}
