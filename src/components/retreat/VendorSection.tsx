'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, Upload } from 'lucide-react'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
}

const categories = ['hotel', 'food', 'transport', 'flights', 'merch', 'attraction', 'other'] as const
const statusColors = {
  pending:   'bg-stone-100 text-stone-500',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-600',
}

const inputCls = 'w-full px-2 py-1.5 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-0.5 block'

export default function VendorSection({ retreat, vendors }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'hotel' as Vendor['category'],
    contact_name: '', contact_email: '', contact_phone: '',
    deliverables: '', deadline: '', cost: '',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('vendors').insert({
      retreat_id: retreat.id,
      name: form.name,
      category: form.category,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      deliverables: form.deliverables || null,
      deadline: form.deadline || null,
      cost: form.cost ? parseFloat(form.cost) : null,
    })
    setShowForm(false)
    setForm({ name: '', category: 'hotel', contact_name: '', contact_email: '', contact_phone: '', deliverables: '', deadline: '', cost: '' })
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('vendors').delete().eq('id', id)
    router.refresh()
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const rows = text.split('\n').slice(1).filter(Boolean)
    const supabase = createClient()
    const inserts = rows.map(row => {
      const [name, category, contact_name, contact_email, contact_phone, deliverables, deadline, cost] = row.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
      return {
        retreat_id: retreat.id,
        name: name || 'Unnamed',
        category: (categories.includes(category as any) ? category : 'other') as Vendor['category'],
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        deliverables: deliverables || null,
        deadline: deadline || null,
        cost: cost ? parseFloat(cost) : null,
      }
    })
    await supabase.from('vendors').insert(inserts)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-400">{vendors.length} vendors</span>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 ring-1 ring-stone-200 rounded-lg px-2 py-1">
            <Upload size={12} /> CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs bg-emerald-700 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <Plus size={12} /> Add vendor
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="ring-1 ring-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Vendor name *</label>
              <input required value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Category *</label>
              <select value={form.category} onChange={e => update('category', e.target.value)} className={inputCls + ' capitalize'}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Contact name</label>
              <input value={form.contact_name} onChange={e => update('contact_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact email</label>
              <input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cost (USD)</label>
              <input type="number" value={form.cost} onChange={e => update('cost', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Deliverables</label>
              <input value={form.deliverables} onChange={e => update('deliverables', e.target.value)}
                placeholder="e.g. Catering for 50, setup + cleanup" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-stone-600 ring-1 ring-stone-200 rounded-lg hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 text-xs bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50">{loading ? 'Adding…' : 'Add vendor'}</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {vendors.map(v => (
          <div key={v.id} className="ring-1 ring-stone-200 rounded-xl p-3 flex items-start justify-between group hover:ring-stone-300 transition-all">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-stone-900">{v.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">{v.category}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${statusColors[v.status]}`}>{v.status}</span>
              </div>
              <div className="mt-1 text-xs text-stone-400 space-x-3">
                {v.contact_name && <span>{v.contact_name}</span>}
                {v.contact_email && <span>{v.contact_email}</span>}
                {v.cost && <span className="text-stone-600 font-medium">{formatCurrency(v.cost)}</span>}
                {v.deadline && <span>Due {formatDate(v.deadline)}</span>}
              </div>
              {v.deliverables && <p className="mt-1 text-xs text-stone-500 truncate">{v.deliverables}</p>}
            </div>
            <button
              onClick={() => handleDelete(v.id)}
              className="ml-2 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {vendors.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-6">No vendors yet. Add one above or import a CSV.</p>
        )}
      </div>
    </div>
  )
}
