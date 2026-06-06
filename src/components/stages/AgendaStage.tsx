'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor, type ScheduleItem } from '@/types'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, Clock, MapPin, ChevronDown } from 'lucide-react'

interface Props {
  retreat: Retreat
  schedule: ScheduleItem[]
  vendors: Vendor[]
}

const ITEM_TYPES = ['session', 'meal', 'transport', 'activity', 'other'] as const
const TYPE_COLORS: Record<string, string> = {
  session:   'bg-emerald-100 text-emerald-700',
  meal:      'bg-amber-100 text-amber-700',
  transport: 'bg-stone-100 text-stone-600',
  activity:  'bg-emerald-50 text-emerald-600',
  other:     'bg-stone-50 text-stone-500',
}
const inputCls = 'w-full px-2.5 py-2 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-0.5 block'

export default function AgendaStage({ retreat, schedule, vendors }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', date: retreat.start_date, start_time: '09:00',
    end_time: '', location: '', item_type: 'session' as ScheduleItem['item_type'],
    vendor_id: '', description: '',
  })

  function update(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const supabase = createClient()
    await supabase.from('schedule_items').insert({
      retreat_id: retreat.id, title: form.title, date: form.date,
      start_time: form.start_time, end_time: form.end_time || null,
      location: form.location || null, item_type: form.item_type,
      vendor_id: form.vendor_id || null, description: form.description || null,
    })
    setShowForm(false); setLoading(false); router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('schedule_items').delete().eq('id', id)
    router.refresh()
  }

  const grouped = schedule.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item)
    return acc
  }, {} as Record<string, ScheduleItem[]>)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Agenda</h1>
          <p className="text-sm text-stone-400 mt-0.5">{schedule.length} item{schedule.length !== 1 ? 's' : ''} scheduled</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-sm"
        >
          <Plus size={14} /> Add item
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-5 space-y-3 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={labelCls}>Title *</label>
              <input required value={form.title} onChange={e => update('title', e.target.value)}
                placeholder="e.g. Morning yoga session" className={inputCls} /></div>
            <div><label className={labelCls}>Date *</label>
              <input type="date" required value={form.date}
                min={retreat.start_date} max={retreat.end_date}
                onChange={e => update('date', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Type</label>
              <select value={form.item_type} onChange={e => update('item_type', e.target.value)} className={inputCls + ' capitalize'}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className={labelCls}>Start time *</label>
              <input type="time" required value={form.start_time} onChange={e => update('start_time', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>End time</label>
              <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Location</label>
              <input value={form.location} onChange={e => update('location', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Linked vendor</label>
              <select value={form.vendor_id} onChange={e => update('vendor_id', e.target.value)} className={inputCls}>
                <option value="">None</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200 rounded-lg hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50">
              {loading ? 'Adding…' : 'Add item'}
            </button>
          </div>
        </form>
      )}

      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <DayBlock key={date} date={date} items={items} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="text-center py-14 text-stone-400">
          <p className="text-sm">No agenda items yet. Start building your schedule.</p>
        </div>
      )}
    </div>
  )
}

function DayBlock({ date, items, onDelete }: { date: string; items: ScheduleItem[]; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(true)
  const today = new Date().toISOString().split('T')[0]
  const isToday = date === today

  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-900">{formatDate(date)}</span>
          {isToday && <span className="text-xs font-semibold text-white bg-emerald-600 rounded-full px-2 py-0.5">Today</span>}
          <span className="text-xs text-stone-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
        <ChevronDown size={15} className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="divide-y divide-stone-100 border-t border-stone-100">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 group hover:bg-stone-50 transition-colors">
              <div className="text-xs text-stone-400 font-mono w-14 shrink-0 pt-0.5 flex items-center gap-1">
                <Clock size={10} />{item.start_time}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-900">{item.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${TYPE_COLORS[item.item_type]}`}>
                    {item.item_type}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {item.location && (
                    <span className="text-xs text-stone-400 flex items-center gap-0.5">
                      <MapPin size={10} />{item.location}
                    </span>
                  )}
                  {item.end_time && (
                    <span className="text-xs text-stone-400">→ {item.end_time}</span>
                  )}
                  {item.vendor && <span className="text-xs text-emerald-600">{item.vendor.name}</span>}
                </div>
              </div>
              <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all mt-0.5">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
