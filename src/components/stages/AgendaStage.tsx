'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor, type ScheduleItem } from '@/types'
import { formatDate } from '@/lib/utils'
import {
  Plus, Trash2, Clock, MapPin, Sparkles, Pencil, Check, X,
  CalendarDays, RefreshCw, LayoutGrid, List, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  retreat: Retreat
  schedule: ScheduleItem[]
  vendors: Vendor[]
}

type ItemType = 'session' | 'meal' | 'transport' | 'activity' | 'other'
type Track = 'Main' | 'Ops' | 'Reminders'

const ITEM_TYPES = ['session', 'meal', 'transport', 'activity', 'other'] as const

const TRACK_TO_TYPE: Record<Track, ItemType> = {
  Main: 'session', Ops: 'transport', Reminders: 'other',
}
const TYPE_TO_TRACK: Record<ItemType, Track> = {
  session: 'Main', meal: 'Main', activity: 'Main',
  transport: 'Ops', other: 'Ops',
}

const TYPE_COLORS: Record<string, string> = {
  session: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  meal:    'bg-amber-100 text-amber-700 border-amber-200',
  transport: 'bg-stone-100 text-stone-600 border-stone-200',
  activity: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  other:   'bg-stone-50 text-stone-500 border-stone-100',
}

const TRACK_COLORS: Record<Track, string> = {
  Main: 'bg-emerald-500 text-white', Ops: 'bg-stone-400 text-white', Reminders: 'bg-amber-400 text-white',
}

// localStorage helpers
const LS_TITLE  = (rId: string, date: string) => `retreach_daytitle_${rId}_${date}`
const LS_TRACK  = (itemId: string) => `retreach_track_${itemId}`

function getTrack(item: ScheduleItem): Track {
  try {
    const saved = localStorage.getItem(LS_TRACK(item.id)) as Track | null
    if (saved) return saved
  } catch { /* */ }
  return TYPE_TO_TRACK[item.item_type] ?? 'Main'
}

function setTrack(itemId: string, track: Track) {
  try { localStorage.setItem(LS_TRACK(itemId), track) } catch { /* */ }
}

function getDayTitle(retreatId: string, date: string): string {
  try { return localStorage.getItem(LS_TITLE(retreatId, date)) ?? '' } catch { return '' }
}
function saveDayTitle(retreatId: string, date: string, title: string) {
  try { localStorage.setItem(LS_TITLE(retreatId, date), title) } catch { /* */ }
}

// Timeline constants
const GRID_START = 7   // 7am
const GRID_END   = 23  // 11pm
const PX_PER_HR  = 88

function timeToMinutes(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + (m ?? 0) }
function minutesToPx(min: number) { return ((min - GRID_START * 60) / 60) * PX_PER_HR }
function durationPx(start: string, end?: string | null) {
  const s = timeToMinutes(start)
  const e = end ? timeToMinutes(end) : s + 60
  return Math.max(60, ((e - s) / 60) * PX_PER_HR)
}

// Detect concept
function detectConcept(retreat: Retreat) {
  const t = ((retreat.concept ?? '') + ' ' + (retreat.name ?? '')).toLowerCase()
  if (/yoga|wellness|mindful|spa|breath|heal/.test(t)) return 'Wellness'
  if (/team|corporate|strategy|leadership|offsite/.test(t)) return 'Corporate'
  if (/celebrat|birthday|party|gala/.test(t))              return 'Celebration'
  if (/adventure|hike|camp|outdoor|trek/.test(t))          return 'Adventure'
  return 'General retreat'
}

const CONCEPT_TEMPLATE: { t: string; label: string; kind: ItemType }[] = [
  { t: '07:00', label: 'Morning yoga',              kind: 'activity' },
  { t: '08:30', label: 'Breakfast',                 kind: 'meal'     },
  { t: '10:00', label: 'Workshop',                  kind: 'session'  },
  { t: '12:30', label: 'Lunch',                     kind: 'meal'     },
  { t: '14:00', label: 'Team building activity',    kind: 'activity' },
  { t: '17:00', label: 'Free time',                 kind: 'other'    },
  { t: '19:00', label: 'Group dinner',              kind: 'meal'     },
]

function getDaysInRange(start: string, end: string) {
  const days: string[] = []
  if (!start || !end) return days
  const cur = new Date(start + 'T00:00:00')
  const fin = new Date(end + 'T00:00:00')
  while (cur <= fin) { days.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1) }
  return days
}

const inputCls = 'w-full px-2.5 py-2 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-0.5 block'

export default function AgendaStage({ retreat, schedule, vendors }: Props) {
  const router = useRouter()
  const [view, setView]         = useState<'list' | 'timeline'>('list')
  const [showAdd, setShowAdd]   = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [form, setForm] = useState({
    title: '', date: retreat.start_date ?? '', start_time: '09:00',
    end_time: '', location: '', item_type: 'session' as ItemType, vendor_id: '',
  })

  function update(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    await supabase.from('schedule_items').insert({
      retreat_id: retreat.id, title: form.title, date: form.date,
      start_time: form.start_time, end_time: form.end_time || null,
      location: form.location || null, item_type: form.item_type,
      vendor_id: form.vendor_id || null,
    })
    setShowAdd(false); router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('schedule_items').delete().eq('id', id)
    router.refresh()
  }

  async function addBlock(date: string) {
    const supabase = createClient()
    await supabase.from('schedule_items').insert({
      retreat_id: retreat.id, title: 'New block', date,
      start_time: '09:00', item_type: 'session',
    })
    router.refresh()
  }

  async function suggestOrReset() {
    if (schedule.length > 0 && !confirmReset) { setConfirmReset(true); return }
    setConfirmReset(false)
    if (!retreat.start_date || !retreat.end_date) return
    setSuggesting(true)
    const supabase = createClient()
    // delete existing
    if (schedule.length > 0) await supabase.from('schedule_items').delete().eq('retreat_id', retreat.id)
    // insert new
    const days = getDaysInRange(retreat.start_date, retreat.end_date)
    const dayTitles = ['Arrival & opening', 'General core', 'Deep work', 'Closing & debrief']
    days.forEach((date, i) => {
      saveDayTitle(retreat.id, date, dayTitles[i] ?? `Day ${i + 1}`)
    })
    const rows = days.flatMap(date =>
      CONCEPT_TEMPLATE.map(b => ({
        retreat_id: retreat.id, title: b.label, date,
        start_time: b.t, end_time: null, location: null,
        item_type: b.kind, vendor_id: null,
      }))
    )
    await supabase.from('schedule_items').insert(rows)
    setSuggesting(false); router.refresh()
  }

  const grouped: Record<string, ScheduleItem[]> = {}
  for (const item of schedule) {
    if (!grouped[item.date]) grouped[item.date] = []
    grouped[item.date].push(item)
  }
  const sortedDates = Object.keys(grouped).sort()

  const concept    = detectConcept(retreat)
  const closedVendors = vendors.filter(v => v.status === 'completed').length
  const hasDate    = !!(retreat.start_date && retreat.end_date)

  return (
    <div>
      {/* ── Step header ── */}
      <div className="flex items-start justify-between gap-4 mb-5 fade-up">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
            <CalendarDays size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Step 4 of 5</p>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">Agenda</h1>
            <p className="text-sm text-stone-400 mt-0.5">A daily schedule — sessions, meals, and logistics on one view.</p>
          </div>
        </div>

        {/* view toggle */}
        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 shrink-0">
          <TabPill active={view === 'timeline'} onClick={() => setView('timeline')} icon={<LayoutGrid size={13} />} label="Timeline" />
          <TabPill active={view === 'list'}     onClick={() => setView('list')}     icon={<List size={13} />}       label="List" />
        </div>
      </div>

      {/* ── Draft my schedule banner ── */}
      <div className="bg-white ring-1 ring-stone-200 card rounded-2xl px-5 py-4 flex items-center gap-4 mb-5 fade-up">
        <div className="size-9 rounded-xl bg-emerald-700 grid place-items-center text-white shrink-0">
          <Sparkles size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 mb-1.5">Draft my schedule</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip label={concept} />
            <Chip label={hasDate ? formatDate(retreat.start_date) : 'Set dates'} faded={!hasDate} />
            <Chip label={`${closedVendors} vendor${closedVendors !== 1 ? 's' : ''} closed`} />
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {confirmReset && (
            <span className="text-xs text-rose-600 font-medium">This will replace all items.</span>
          )}
          <button onClick={suggestOrReset} disabled={suggesting || !hasDate}
            className={cn('flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition',
              confirmReset
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50'
            )}>
            <RefreshCw size={13} className={suggesting ? 'animate-spin' : ''} />
            {suggesting ? 'Building…' : confirmReset ? 'Confirm reset' : schedule.length ? 'Re-suggest' : 'Draft schedule'}
          </button>
          {confirmReset && (
            <button onClick={() => setConfirmReset(false)} className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1">Cancel</button>
          )}
        </div>
      </div>

      {!hasDate && (
        <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-4 mb-4 text-sm text-amber-700">
          Set retreat dates in Planning to enable schedule drafting and the timeline view.
        </div>
      )}

      {/* ── Add item button ── */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-stone-400 font-medium">{schedule.length} item{schedule.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-700 text-white px-4 py-2 rounded-xl hover:bg-emerald-800 transition shadow-sm">
          <Plus size={14} /> Add item
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-5 space-y-3 mb-5 fade-up">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={labelCls}>Title *</label>
              <input required value={form.title} onChange={e => update('title', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Date *</label>
              <input type="date" required value={form.date}
                min={retreat.start_date} max={retreat.end_date}
                onChange={e => update('date', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Track / type</label>
              <select value={form.item_type} onChange={e => update('item_type', e.target.value)} className={inputCls + ' capitalize'}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className={labelCls}>Start time *</label>
              <input type="time" required value={form.start_time} onChange={e => update('start_time', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>End time</label>
              <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)} className={inputCls} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200 rounded-lg hover:bg-stone-50">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800">Add</button>
          </div>
        </form>
      )}

      {/* ── Views ── */}
      {schedule.length === 0 ? (
        <div className="text-center py-16 text-stone-400 bg-white ring-1 ring-stone-200 card rounded-2xl">
          <Sparkles size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-stone-600">No schedule yet</p>
          <p className="text-sm mt-0.5">{hasDate ? 'Click "Draft schedule" to generate a concept-aware plan.' : 'Set retreat dates first.'}</p>
        </div>
      ) : view === 'list' ? (
        <ListView sortedDates={sortedDates} grouped={grouped} retreat={retreat} vendors={vendors}
          onDelete={handleDelete} onRefresh={router.refresh} onAddBlock={addBlock} />
      ) : (
        <TimelineView sortedDates={sortedDates} grouped={grouped} retreat={retreat} vendors={vendors}
          onDelete={handleDelete} onRefresh={router.refresh} />
      )}
    </div>
  )
}

// ── List view ──────────────────────────────────────────────────────────────

function ListView({ sortedDates, grouped, retreat, vendors, onDelete, onRefresh, onAddBlock }: {
  sortedDates: string[]; grouped: Record<string, ScheduleItem[]>;
  retreat: Retreat; vendors: Vendor[];
  onDelete: (id: string) => void; onRefresh: () => void; onAddBlock: (date: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-stone-700">Daily schedule</p>
        <p className="text-xs text-stone-400">Click any field to edit</p>
      </div>
      <div className="space-y-4">
        {sortedDates.map((date, dayIdx) => (
          <DayGroup key={date} date={date} dayIdx={dayIdx} items={grouped[date]}
            retreat={retreat} vendors={vendors}
            onDelete={onDelete} onRefresh={onRefresh} onAddBlock={onAddBlock} />
        ))}
      </div>
    </div>
  )
}

function DayGroup({ date, dayIdx, items, retreat, vendors, onDelete, onRefresh, onAddBlock }: {
  date: string; dayIdx: number; items: ScheduleItem[];
  retreat: Retreat; vendors: Vendor[];
  onDelete: (id: string) => void; onRefresh: () => void; onAddBlock: (date: string) => void
}) {
  const [dayTitle, setDayTitle] = useState(() => getDayTitle(retreat.id, date))
  const [editingTitle, setEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editingTitle) titleRef.current?.focus() }, [editingTitle])

  function saveTitle(val: string) {
    setDayTitle(val); saveDayTitle(retreat.id, date, val); setEditingTitle(false)
  }

  const sorted = [...items].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const today = new Date().toISOString().split('T')[0]
  const isToday = date === today

  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-stone-100">
        <span className="size-7 rounded-full bg-emerald-700 text-white text-xs font-bold grid place-items-center shrink-0">
          {dayIdx + 1}
        </span>
        {editingTitle ? (
          <input ref={titleRef} value={dayTitle}
            onChange={e => setDayTitle(e.target.value)}
            onBlur={e => saveTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(dayTitle); if (e.key === 'Escape') setEditingTitle(false) }}
            className="flex-1 text-sm font-semibold text-stone-900 outline-none border-b-2 border-emerald-500 bg-transparent" />
        ) : (
          <button onClick={() => setEditingTitle(true)}
            className="flex items-center gap-1.5 flex-1 text-left hover:opacity-80 transition">
            <span className="text-sm font-semibold text-stone-900">
              {formatDate(date)}{dayTitle ? ` · ${dayTitle}` : ''}
            </span>
            <Pencil size={10} className="text-stone-300 opacity-0 group-hover:opacity-100" />
          </button>
        )}
        {isToday && <span className="text-[10px] font-bold text-white bg-emerald-600 rounded-full px-2 py-0.5">Today</span>}
      </div>

      {/* Items */}
      <div className="divide-y divide-stone-100">
        {sorted.map(item => (
          <ListItem key={item.id} item={item} vendors={vendors} onDelete={onDelete} onRefresh={onRefresh} />
        ))}
      </div>

      {/* Add block */}
      <div className="px-5 py-2.5 border-t border-stone-100">
        <button onClick={() => onAddBlock(date)}
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition">
          <Plus size={12} /> Add block
        </button>
      </div>
    </div>
  )
}

function ListItem({ item, vendors, onDelete, onRefresh }: {
  item: ScheduleItem; vendors: Vendor[];
  onDelete: (id: string) => void; onRefresh: () => void
}) {
  const [editField, setEditField] = useState<'time' | 'title' | null>(null)
  const [draftTime, setDraftTime]   = useState(item.start_time)
  const [draftTitle, setDraftTitle] = useState(item.title)
  const [track, setTrack]           = useState<Track>(() => getTrack(item))
  const [saving, setSaving]         = useState(false)
  const timeRef  = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editField === 'time') timeRef.current?.focus() }, [editField])
  useEffect(() => { if (editField === 'title') titleRef.current?.focus() }, [editField])

  async function saveItem(patch: { start_time?: string; title?: string; item_type?: ItemType }) {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('schedule_items').update(patch).eq('id', item.id)
    setSaving(false); setEditField(null); onRefresh()
  }

  async function changeTrack(t: Track) {
    setTrack(t); setTrack(t); setTrack(t)
    setTrack(t); setTrackStore(item.id, t)
    // map track to item_type for persistence
    const mapped = TRACK_TO_TYPE[t]
    const supabase = createClient()
    await supabase.from('schedule_items').update({ item_type: mapped }).eq('id', item.id)
    onRefresh()
  }

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 group hover:bg-stone-50 transition">
      <Clock size={13} className="text-stone-300 shrink-0" />

      {/* Time */}
      {editField === 'time' ? (
        <input ref={timeRef} type="time" value={draftTime}
          onChange={e => setDraftTime(e.target.value)}
          onBlur={() => saveItem({ start_time: draftTime })}
          onKeyDown={e => { if (e.key === 'Enter') saveItem({ start_time: draftTime }) }}
          className="w-24 text-sm font-mono bg-white ring-1 ring-emerald-400 rounded-md px-1.5 py-0.5 outline-none" />
      ) : (
        <button onClick={() => { setEditField('time'); setDraftTime(item.start_time) }}
          className="w-12 text-sm font-mono text-stone-500 hover:text-emerald-700 text-left shrink-0">
          {item.start_time}
        </button>
      )}

      {/* Title */}
      {editField === 'title' ? (
        <input ref={titleRef} value={draftTitle}
          onChange={e => setDraftTitle(e.target.value)}
          onBlur={() => saveItem({ title: draftTitle })}
          onKeyDown={e => { if (e.key === 'Enter') saveItem({ title: draftTitle }) }}
          className="flex-1 text-sm bg-white ring-1 ring-emerald-400 rounded-md px-2 py-0.5 outline-none" />
      ) : (
        <button onClick={() => { setEditField('title'); setDraftTitle(item.title) }}
          className="flex-1 text-sm font-medium text-stone-800 hover:text-emerald-700 text-left truncate">
          {item.title}
        </button>
      )}

      {/* Track dropdown */}
      <div className="relative shrink-0">
        <select value={track} onChange={e => changeTrack(e.target.value as Track)}
          className="appearance-none text-xs font-semibold bg-stone-100 text-stone-600 rounded-lg pl-2.5 pr-6 py-1 outline-none cursor-pointer hover:bg-stone-200 transition">
          <option value="Main">Main</option>
          <option value="Ops">Ops</option>
          <option value="Reminders">Reminders</option>
        </select>
        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
      </div>

      <button onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Timeline view ──────────────────────────────────────────────────────────

const TRACKS: Track[] = ['Main', 'Ops', 'Reminders']

function TimelineView({ sortedDates, grouped, retreat, vendors, onDelete, onRefresh }: {
  sortedDates: string[]; grouped: Record<string, ScheduleItem[]>;
  retreat: Retreat; vendors: Vendor[];
  onDelete: (id: string) => void; onRefresh: () => void
}) {
  const [activeDay, setActiveDay] = useState(sortedDates[0] ?? '')
  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i)
  const totalWidth = (GRID_END - GRID_START) * PX_PER_HR

  const dayItems = grouped[activeDay] ?? []
  const byTrack: Record<Track, ScheduleItem[]> = { Main: [], Ops: [], Reminders: [] }
  dayItems.forEach(item => { const t = getTrack(item); byTrack[t].push(item) })

  return (
    <div>
      {/* Day tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {sortedDates.map((date, i) => {
          const title = getDayTitle(retreat.id, date)
          return (
            <button key={date} onClick={() => setActiveDay(date)}
              className={cn('flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold shrink-0 transition',
                activeDay === date ? 'bg-emerald-700 text-white' : 'bg-white ring-1 ring-stone-200 text-stone-600 hover:bg-stone-50'
              )}>
              <span className={cn('size-5 rounded-full text-xs font-bold grid place-items-center',
                activeDay === date ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              )}>{i + 1}</span>
              {title || formatDate(date)}
            </button>
          )
        })}
      </div>

      {/* Timeline grid */}
      <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex border-b border-stone-200">
          <div className="w-24 shrink-0 px-3 py-2 border-r border-stone-200">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Track</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <div className="flex" style={{ width: totalWidth }}>
              {hours.map(h => (
                <div key={h} className="text-[10px] text-stone-400 font-mono py-2 border-r border-stone-100 text-center shrink-0" style={{ width: PX_PER_HR }}>
                  {h}:00
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Track rows */}
        {TRACKS.map(track => (
          <div key={track} className="flex border-b border-stone-100 last:border-0 min-h-[56px]">
            {/* Track label */}
            <div className="w-24 shrink-0 px-3 py-3 border-r border-stone-100 flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', TRACK_COLORS[track].split(' ')[0])} />
              <span className="text-xs font-semibold text-stone-600">{track}</span>
            </div>

            {/* Items area */}
            <div className="relative overflow-x-auto flex-1">
              <div className="relative" style={{ width: totalWidth, height: '100%', minHeight: 56 }}>
                {/* Hour grid lines */}
                {hours.map(h => (
                  <div key={h} className="absolute top-0 bottom-0 border-r border-stone-100"
                    style={{ left: (h - GRID_START) * PX_PER_HR }} />
                ))}

                {/* Items */}
                {byTrack[track].map(item => {
                  const startMin = timeToMinutes(item.start_time)
                  const left = minutesToPx(startMin)
                  const width = durationPx(item.start_time, item.end_time)
                  // clamp to grid
                  if (startMin < GRID_START * 60 || startMin >= GRID_END * 60) return null
                  return (
                    <TimelineChip key={item.id} item={item} left={left} width={width}
                      onDelete={onDelete} onRefresh={onRefresh} />
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-stone-400 mt-2 text-center">
        Click a block to edit · Switch to List view for inline text editing
      </p>
    </div>
  )
}

function TimelineChip({ item, left, width, onDelete, onRefresh }: {
  item: ScheduleItem; left: number; width: number;
  onDelete: (id: string) => void; onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState(item.title)
  const [draftTime, setDraftTime]   = useState(item.start_time)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('schedule_items').update({ title: draftTitle, start_time: draftTime }).eq('id', item.id)
    setSaving(false); setOpen(false); onRefresh()
  }

  const colorCls = TYPE_COLORS[item.item_type]

  return (
    <div className="absolute top-1.5" style={{ left: left + 2, width: width - 4, minWidth: 48 }}>
      <button onClick={() => setOpen(o => !o)}
        className={cn('w-full h-8 rounded-lg border text-xs font-semibold truncate px-2 text-left transition hover:opacity-90', colorCls)}>
        {item.start_time} {item.title}
      </button>

      {open && (
        <div className="absolute z-20 top-10 left-0 bg-white ring-1 ring-stone-200 rounded-xl shadow-lg p-3 w-56 fade-up">
          <div className="space-y-2 mb-2">
            <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
              className="w-full text-xs px-2 py-1.5 ring-1 ring-stone-200 rounded-lg outline-none focus:ring-emerald-400" />
            <input type="time" value={draftTime} onChange={e => setDraftTime(e.target.value)}
              className="w-full text-xs px-2 py-1.5 ring-1 ring-stone-200 rounded-lg outline-none focus:ring-emerald-400" />
          </div>
          <div className="flex items-center gap-2 justify-between">
            <button onClick={() => { onDelete(item.id); setOpen(false) }}
              className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1">
              <Trash2 size={11} /> Delete
            </button>
            <div className="flex gap-1">
              <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded-md ring-1 ring-stone-200 text-stone-500 hover:bg-stone-50">
                <X size={11} />
              </button>
              <button onClick={save} disabled={saving}
                className="text-xs px-2.5 py-1 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60 flex items-center gap-1">
                <Check size={11} /> {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function setTrackStore(itemId: string, track: Track) {
  try { localStorage.setItem(LS_TRACK(itemId), track) } catch { /* */ }
}

function TabPill({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
        active ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
      )}>
      {icon} {label}
    </button>
  )
}

function Chip({ label, faded }: { label: string; faded?: boolean }) {
  return (
    <span className={cn('inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ring-1',
      faded ? 'bg-stone-100 text-stone-400 ring-stone-200' : 'bg-stone-100 text-stone-600 ring-stone-200'
    )}>
      {label}
    </span>
  )
}
