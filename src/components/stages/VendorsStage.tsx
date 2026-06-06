'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Upload, Phone, Mail, Clock, MessageSquare, Copy, Check } from 'lucide-react'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
}

const CATEGORIES = ['hotel', 'food', 'transport', 'flights', 'merch', 'attraction', 'other'] as const
const STATUS_COLORS = {
  pending:   'bg-stone-100 text-stone-500',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-600',
}
const inputCls = 'w-full px-2.5 py-2 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-0.5 block'

export default function VendorsStage({ retreat, vendors }: Props) {
  const [tab, setTab] = useState<'manage' | 'reminders'>('manage')

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Vendors</h1>
          <p className="text-sm text-stone-400 mt-0.5">{vendors.length} supplier{vendors.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-stone-100 p-1 rounded-xl w-fit">
        {(['manage', 'reminders'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors',
              tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'manage' && <ManageTab retreat={retreat} vendors={vendors} />}
      {tab === 'reminders' && <RemindersTab retreat={retreat} vendors={vendors} />}
    </div>
  )
}

function ManageTab({ retreat, vendors }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'hotel' as Vendor['category'],
    contact_name: '', contact_email: '', contact_phone: '',
    deliverables: '', deadline: '', cost: '',
  })

  function update(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const supabase = createClient()
    await supabase.from('vendors').insert({
      retreat_id: retreat.id, name: form.name, category: form.category,
      contact_name: form.contact_name || null, contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null, deliverables: form.deliverables || null,
      deadline: form.deadline || null, cost: form.cost ? parseFloat(form.cost) : null,
    })
    setShowForm(false)
    setForm({ name: '', category: 'hotel', contact_name: '', contact_email: '', contact_phone: '', deliverables: '', deadline: '', cost: '' })
    setLoading(false); router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('vendors').delete().eq('id', id)
    router.refresh()
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const text = await file.text()
    const rows = text.split('\n').slice(1).filter(Boolean)
    const supabase = createClient()
    const inserts = rows.map(row => {
      const [name, category, contact_name, contact_email, contact_phone, deliverables, deadline, cost] =
        row.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
      return {
        retreat_id: retreat.id, name: name || 'Unnamed',
        category: (CATEGORIES.includes(category as any) ? category : 'other') as Vendor['category'],
        contact_name: contact_name || null, contact_email: contact_email || null,
        contact_phone: contact_phone || null, deliverables: deliverables || null,
        deadline: deadline || null, cost: cost ? parseFloat(cost) : null,
      }
    })
    await supabase.from('vendors').insert(inserts); router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="cursor-pointer flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 ring-1 ring-stone-200 rounded-lg px-3 py-1.5 transition-colors">
          <Upload size={12} /> Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </label>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-sm"
        >
          <Plus size={14} /> Add vendor
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Vendor name *</label>
              <input required value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Category</label>
              <select value={form.category} onChange={e => update('category', e.target.value)} className={inputCls + ' capitalize'}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className={labelCls}>Contact name</label>
              <input value={form.contact_name} onChange={e => update('contact_name', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Contact email</label>
              <input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Phone</label>
              <input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Cost (USD)</label>
              <input type="number" value={form.cost} onChange={e => update('cost', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Deliverables</label>
              <input value={form.deliverables} onChange={e => update('deliverables', e.target.value)}
                placeholder="e.g. Catering for 50 pax" className={inputCls} /></div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200 rounded-lg hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50">
              {loading ? 'Adding…' : 'Add vendor'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {vendors.map(v => (
          <div key={v.id} className="bg-white ring-1 ring-stone-200 rounded-2xl p-4 flex items-start justify-between group hover:ring-stone-300 transition-all card">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-stone-900">{v.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">{v.category}</span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full capitalize', STATUS_COLORS[v.status])}>{v.status}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-4 text-xs text-stone-400 flex-wrap">
                {v.contact_name && <span>{v.contact_name}</span>}
                {v.contact_email && (
                  <a href={`mailto:${v.contact_email}`} className="flex items-center gap-1 hover:text-emerald-600">
                    <Mail size={11} />{v.contact_email}
                  </a>
                )}
                {v.contact_phone && (
                  <a href={`tel:${v.contact_phone}`} className="flex items-center gap-1 hover:text-emerald-600">
                    <Phone size={11} />{v.contact_phone}
                  </a>
                )}
                {v.cost != null && <span className="font-medium text-stone-600">{formatCurrency(v.cost)}</span>}
                {v.deadline && <span className="flex items-center gap-1"><Clock size={10} />Due {formatDate(v.deadline)}</span>}
              </div>
              {v.deliverables && <p className="mt-1 text-xs text-stone-500 truncate">{v.deliverables}</p>}
            </div>
            <button onClick={() => handleDelete(v.id)} className="ml-3 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {vendors.length === 0 && (
          <div className="text-center py-14 text-stone-400">
            <p className="text-sm">No vendors yet — add your first supplier above.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function RemindersTab({ retreat, vendors }: Props) {
  const [selectedId, setSelectedId] = useState<string>(vendors[0]?.id ?? '')
  const [msgType, setMsgType] = useState<'pre-event' | 'payment' | 'thankyou'>('pre-event')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const vendor = vendors.find(v => v.id === selectedId)

  async function generateDraft() {
    if (!vendor) return
    setLoading(true)
    const messages: Record<string, string> = {
      'pre-event': `Draft a short, professional pre-event reminder message to ${vendor.contact_name || vendor.name} from ${vendor.name}. The retreat "${retreat.name}" is at ${retreat.destination} from ${formatDate(retreat.start_date)} to ${formatDate(retreat.end_date)}. Their deliverables: ${vendor.deliverables || 'as agreed'}. Deadline: ${vendor.deadline ? formatDate(vendor.deadline) : 'TBD'}. Keep it warm and concise.`,
      'payment': `Draft a polite payment reminder to ${vendor.contact_name || vendor.name} from ${vendor.name} regarding the invoice for "${retreat.name}". Amount: ${vendor.cost ? formatCurrency(vendor.cost) : 'as agreed'}. Keep it professional and brief.`,
      'thankyou': `Draft a warm thank-you message to ${vendor.contact_name || vendor.name} from ${vendor.name} for their work at "${retreat.name}" in ${retreat.destination}. Make it genuine and specific to their category: ${vendor.category}.`,
    }

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messages[msgType],
          retreat, vendors: [], participants: [], schedule: [], history: [],
        }),
      })
      const data = await res.json()
      setDraft(data.response ?? 'Could not generate draft.')
    } catch {
      setDraft('Could not generate draft. Please try again.')
    }
    setLoading(false)
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (vendors.length === 0) {
    return (
      <div className="text-center py-14 text-stone-400">
        <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Add vendors first, then draft reminders here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5 space-y-4">
        <div>
          <label className={labelCls}>Vendor</label>
          <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setDraft('') }} className={inputCls}>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}{v.contact_name ? ` — ${v.contact_name}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Message type</label>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: 'pre-event', label: 'Pre-event reminder' },
              { id: 'payment',   label: 'Payment reminder' },
              { id: 'thankyou',  label: 'Thank you' },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setMsgType(id); setDraft('') }}
                className={cn('px-3 py-1.5 text-sm rounded-lg ring-1 transition-colors',
                  msgType === id
                    ? 'bg-emerald-700 text-white ring-emerald-700'
                    : 'bg-white text-stone-600 ring-stone-200 hover:ring-emerald-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={generateDraft}
          disabled={loading || !selectedId}
          className="w-full py-2.5 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? 'Drafting…' : '✦ Draft with AI'}
        </button>
      </div>

      {draft && (
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5 fade-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Draft</span>
            <button onClick={copyDraft} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-emerald-700 transition-colors">
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={8}
            className="w-full text-sm text-stone-700 leading-relaxed resize-none outline-none bg-transparent"
          />
          <div className="mt-3 pt-3 border-t border-stone-100 flex gap-2">
            {vendor?.contact_phone && (
              <a
                href={`https://wa.me/${vendor.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(draft)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
              >
                WhatsApp
              </a>
            )}
            {vendor?.contact_email && (
              <a
                href={`mailto:${vendor.contact_email}?subject=Retreat reminder&body=${encodeURIComponent(draft)}`}
                className="flex-1 text-center py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Email
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
