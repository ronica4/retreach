'use client'

import { useState } from 'react'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'
import AgentPanel from '@/components/retreat/AgentPanel'
import { formatDate } from '@/lib/utils'
import { Phone, Mail, Clock, MapPin, CheckCircle, Circle, AlertCircle, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
}

const ISSUE_CHIPS = ['Room not ready', 'Food/dietary issue', 'Transport delay', 'AV glitch', 'Late arrival']
const CATEGORY_COLORS: Record<string, string> = {
  hotel: 'bg-emerald-100 text-emerald-700', food: 'bg-amber-100 text-amber-700',
  transport: 'bg-stone-100 text-stone-600', flights: 'bg-emerald-50 text-emerald-600',
  merch: 'bg-rose-100 text-rose-600', attraction: 'bg-emerald-100 text-emerald-700',
  other: 'bg-stone-100 text-stone-500',
}

export default function DuringStage({ retreat, vendors, participants, schedule }: Props) {
  const [view, setView] = useState<'schedule' | 'vendors' | 'participants'>('schedule')

  const today = new Date().toISOString().split('T')[0]
  const todayItems = schedule.filter(s => s.date === today)
  const grouped = schedule.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item)
    return acc
  }, {} as Record<string, ScheduleItem[]>)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">During</h1>
          <p className="text-sm text-stone-400 mt-0.5">Live operations</p>
        </div>

        {/* Today briefing */}
        {todayItems.length > 0 && (
          <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-4 fade-up">
            <p className="text-sm font-semibold text-emerald-800 mb-2.5">Today — {formatDate(today)}</p>
            <div className="space-y-1.5">
              {todayItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-emerald-700">
                  <Clock size={13} className="shrink-0" />
                  <span className="font-medium w-14 shrink-0">{item.start_time}</span>
                  <span>{item.title}</span>
                  {item.location && (
                    <span className="text-emerald-500 flex items-center gap-0.5 text-xs">
                      <MapPin size={10} />{item.location}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues tracker */}
        <IssueTracker retreatId={retreat.id} />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-200">
          {(['schedule', 'vendors', 'participants'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={cn('px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors',
                view === tab ? 'text-emerald-700 border-emerald-700' : 'text-stone-500 border-transparent hover:text-stone-700'
              )}
            >
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
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', CATEGORY_COLORS[v.category])}>{v.category}</span>
                  </div>
                  {v.contact_name && <p className="text-xs text-stone-400 mt-0.5">{v.contact_name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {v.contact_phone && <a href={`tel:${v.contact_phone}`} className="text-stone-400 hover:text-emerald-700 transition-colors"><Phone size={15} /></a>}
                  {v.contact_email && <a href={`mailto:${v.contact_email}`} className="text-stone-400 hover:text-emerald-700 transition-colors"><Mail size={15} /></a>}
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

      <div className="lg:col-span-1">
        <AgentPanel retreat={retreat} vendors={vendors} participants={participants} schedule={schedule} />
      </div>
    </div>
  )
}

function IssueTracker({ retreatId }: { retreatId: string }) {
  const [issues, setIssues] = useState<{ id: string; text: string; resolved: boolean }[]>([])
  const [input, setInput] = useState('')

  function addIssue(text: string) {
    if (!text.trim()) return
    setIssues(prev => [...prev, { id: Date.now().toString(), text: text.trim(), resolved: false }])
    setInput('')
  }

  function toggleResolved(id: string) {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, resolved: !i.resolved } : i))
  }

  function removeIssue(id: string) {
    setIssues(prev => prev.filter(i => i.id !== id))
  }

  const open   = issues.filter(i => !i.resolved)
  const closed = issues.filter(i => i.resolved)

  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={14} className="text-amber-500" />
        <span className="text-sm font-semibold text-stone-900">Issues</span>
        {open.length > 0 && <span className="text-xs font-semibold text-white bg-amber-500 rounded-full px-1.5">{open.length}</span>}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addIssue(input)}
          placeholder="Log an issue…"
          className="flex-1 text-sm px-2.5 py-1.5 ring-1 ring-stone-200 rounded-lg outline-none focus:ring-emerald-500 focus:ring-2 transition"
        />
        <button onClick={() => addIssue(input)} className="p-1.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors">
          <Plus size={14} />
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-3">
        {ISSUE_CHIPS.map(chip => (
          <button key={chip} onClick={() => addIssue(chip)}
            className="text-xs px-2 py-1 rounded-full ring-1 ring-stone-200 text-stone-600 hover:ring-emerald-300 hover:text-emerald-700 transition-colors">
            {chip}
          </button>
        ))}
      </div>

      {issues.length > 0 && (
        <div className="space-y-1.5">
          {[...open, ...closed].map(issue => (
            <div key={issue.id} className={cn('flex items-center gap-2 group', issue.resolved && 'opacity-50')}>
              <button onClick={() => toggleResolved(issue.id)} className="shrink-0 text-stone-400 hover:text-emerald-600 transition-colors">
                {issue.resolved ? <CheckCircle size={15} className="text-emerald-500" /> : <Circle size={15} />}
              </button>
              <span className={cn('text-sm flex-1 text-stone-700', issue.resolved && 'line-through text-stone-400')}>
                {issue.text}
              </span>
              <button onClick={() => removeIssue(issue.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {issues.length === 0 && (
        <p className="text-xs text-stone-400 text-center py-2">No issues logged — all clear!</p>
      )}
    </div>
  )
}
