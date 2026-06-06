'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor, type ScheduleItem } from '@/types'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, Clock, MapPin } from 'lucide-react'

interface Props {
  retreat: Retreat
  schedule: ScheduleItem[]
  vendors: Vendor[]
}

const itemTypes = ['session', 'meal', 'transport', 'activity', 'other'] as const

const inputCls = 'w-full px-2 py-1.5 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-0.5 block'

export default function ScheduleSection({ retreat, schedule, vendors }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', date: retreat.start_date, start_time: '09:00',
    end_time: '', location: '', item_type: 'session' as ScheduleItem['item_type'],
    vendor_id: '', description: '',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('schedule_items').insert({
      retreat_id: retreat.id,
      title: form.title,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || null,
      location: form.location || null,
      item_type: form.item_type,
      vendor_id: form.vendor_id || null,
      description: form.description || null,
    })
    setShowForm(false)
    setLoading(false)
    router.refresh()
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-400">{schedule.length} items</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs bg-emerald-700 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-800 transition-colors"
        >
          <Plus size={12} /> Add item
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="ring-1 ring-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Title *</label>
              <input required value={form.title} onChange={e => update('title', e.target.value)}
                placeholder="e.g. Welcome dinner" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Date *</label>
              <input type="date" required value={form.date}
                min={retreat.start_date} max={retreat.end_date}
                onChange={e => update('date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.item_type} onChange={e => update('item_type', e.target.value)} className={inputCls + ' capitalize'}>
                {itemTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Start time *</label>
              <input type="time" required value={form.start_time} onChange={e => update('start_time', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End time</label>
              <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input value={form.location} onChange={e => update('location', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Linked vendor</label>
              <select value={form.vendor_id} onChange={e => update('vendor_id', e.target.value)} className={inputCls}>
                <option value="">None</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-stone-600 ring-1 ring-stone-200 rounded-lg hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 text-xs bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50">{loading ? 'Adding…' : 'Add item'}</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{formatDate(date)}</h4>
            <div className="space-y-1.5">
              {items.map(item => (
                <div key={item.id} className="flex items-start gap-2 p-2.5 ring-1 ring-stone-100 rounded-lg group hover:ring-stone-200 transition-colors">
                  <div className="flex items-center gap-1 text-xs text-stone-400 font-mono w-16 shrink-0 pt-0.5">
                    <Clock size={10} />{item.start_time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.location && <span className="text-xs text-stone-400 flex items-center gap-0.5"><MapPin size={10} />{item.location}</span>}
                      {item.vendor && <span className="text-xs text-emerald-600">{item.vendor.name}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {schedule.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-6">No schedule items. Add your first one.</p>
        )}
      </div>
    </div>
  )
}
