'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Plus, Upload, Download, Phone, Mail, Clock, MessageSquare, Copy, Check,
  PenLine, X, ThumbsUp, ThumbsDown, Sparkles, ClipboardList, Bell,
  Building2, Plane, Bus, HeartHandshake, UtensilsCrossed, Camera,
  Lightbulb, Palette, Package, Loader2, CheckCircle2, LibraryBig,
} from 'lucide-react'
import VendorCatalogTab from './VendorCatalogTab'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
}

// ── category meta ──────────────────────────────────────────────────────────
const CATS = [
  { key: 'hotel',      label: 'Lodging',      Icon: Building2,     tile: 'bg-emerald-50 text-emerald-700' },
  { key: 'flights',    label: 'Flights',      Icon: Plane,         tile: 'bg-emerald-50 text-emerald-600' },
  { key: 'transport',  label: 'Transfers',    Icon: Bus,           tile: 'bg-emerald-50 text-emerald-600' },
  { key: 'food',       label: 'Catering',     Icon: UtensilsCrossed, tile: 'bg-amber-50 text-amber-700' },
  { key: 'attraction', label: 'Activities',   Icon: HeartHandshake, tile: 'bg-rose-50 text-rose-600' },
  { key: 'merch',      label: 'Photo/Design', Icon: Camera,        tile: 'bg-rose-50 text-rose-600' },
  { key: 'other',      label: 'Other',        Icon: Package,       tile: 'bg-stone-100 text-stone-600' },
] as const

type CatKey = (typeof CATS)[number]['key']
const catByKey = (k: string) => CATS.find(c => c.key === k) ?? CATS[CATS.length - 1]

// vendor status cycle
const STATUS_CYCLE: Vendor['status'][] = ['pending', 'confirmed', 'completed']
const STATUS_CHIP: Record<Vendor['status'], string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-stone-100 text-stone-500',
  cancelled: 'bg-rose-100 text-rose-600',
}
const STATUS_DOT: Record<Vendor['status'], string> = {
  pending: 'bg-amber-400', confirmed: 'bg-emerald-500', completed: 'bg-stone-400', cancelled: 'bg-rose-500',
}

const EMPTY_FORM = {
  name: '', category: 'hotel' as CatKey,
  contact_name: '', contact_email: '', contact_phone: '',
  deliverables: '', deadline: '', cost: '',
}

const inputCls = 'w-full text-sm bg-white rounded-lg px-3 py-2.5 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-1 block'

// ── concept detection for "Find for me" ──────────────────────────────────
const CONCEPTS: Record<string, { label: string; missing: { key: CatKey; reason: string; deliverable: string }[] }> = {
  wellness: {
    label: 'Wellness retreat',
    missing: [
      { key: 'hotel', reason: 'A calm nature venue books out months ahead — lock dates first.', deliverable: 'Sign contract & pay deposit' },
      { key: 'attraction', reason: 'Yoga / breathwork leads anchor the whole agenda.', deliverable: 'Confirm sessions & schedule' },
      { key: 'transport', reason: 'Remote venues need a group shuttle so guests arrive together.', deliverable: 'Arrange shuttle from the city' },
    ],
  },
  corporate: {
    label: 'Corporate offsite',
    missing: [
      { key: 'hotel', reason: 'You need reliable rooms with proper space for working sessions.', deliverable: 'Book venue + meeting rooms' },
      { key: 'merch', reason: 'Presentations and hybrid dial-ins fall apart without solid A/V.', deliverable: 'Set up screens, mics & wifi' },
      { key: 'attraction', reason: 'A neutral facilitator keeps strategy sessions on track.', deliverable: 'Brief facilitator on agenda' },
    ],
  },
  celebration: {
    label: 'Celebration',
    missing: [
      { key: 'hotel', reason: 'Celebration venues book a season ahead — secure the date early.', deliverable: 'Reserve venue & sign contract' },
      { key: 'merch', reason: 'Great photographers get booked fast for celebrations.', deliverable: 'Book photographer & shot list' },
      { key: 'other', reason: 'Décor and flowers set the mood — approve the look in advance.', deliverable: 'Approve décor & flowers' },
    ],
  },
  adventure: {
    label: 'Adventure trip',
    missing: [
      { key: 'hotel', reason: 'Base camps near the action sell out in peak season.', deliverable: 'Book lodging near the trails' },
      { key: 'transport', reason: 'Reaching trailheads and remote sites needs reliable transport.', deliverable: 'Arrange 4×4 / shuttle logistics' },
      { key: 'attraction', reason: 'Safety on active routes depends on licensed guides.', deliverable: 'Confirm certified guides' },
    ],
  },
}

function detectConcept(retreat: Retreat) {
  const hay = `${retreat.concept ?? ''} ${retreat.name}`.toLowerCase()
  const KEYWORDS: Record<string, string[]> = {
    wellness:    ['yoga', 'wellness', 'meditation', 'mindful', 'nature', 'healing', 'spa', 'breath', 'reset', 'detox'],
    corporate:   ['corporate', 'offsite', 'founders', 'startup', 'team', 'leadership', 'strategy', 'kickoff', 'sprint'],
    celebration: ['wedding', 'anniversary', 'birthday', 'family', 'celebration', 'party', 'gala', 'reunion'],
    adventure:   ['hiking', 'adventure', 'outdoor', 'trek', 'sport', 'ski', 'surf', 'camping', 'climb', 'desert'],
  }
  for (const [key, kws] of Object.entries(KEYWORDS)) {
    if (kws.some(k => hay.includes(k))) return { key, ...CONCEPTS[key] }
  }
  return { key: 'general', label: 'General retreat', missing: CONCEPTS.wellness.missing }
}

// ── root component ─────────────────────────────────────────────────────────
export default function VendorsStage({ retreat, vendors }: Props) {
  const [tab, setTab] = useState<'manage' | 'catalog' | 'find' | 'reminders'>('manage')
  const otherCount = vendors.filter(v => v.category !== 'hotel' && v.category !== 'flights').length
  const tabs = [
    { id: 'manage' as const,    label: 'Manage',       Icon: ClipboardList },
    { id: 'catalog' as const,   label: 'Catalog',      Icon: LibraryBig },
    { id: 'find' as const,      label: 'Find for me',  Icon: Sparkles },
    { id: 'reminders' as const, label: 'Reminders',    Icon: Bell },
  ]
  return (
    <div>
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 fade-up">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Vendors</h1>
          <p className="text-sm text-stone-400 mt-0.5">{otherCount} supplier{otherCount !== 1 ? 's' : ''} · flights &amp; hotels have their own tabs</p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-lg ring-1 ring-stone-200 p-1">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('flex items-center gap-1.5 text-sm font-semibold rounded-md px-3 py-1.5 transition',
                tab === id ? 'bg-emerald-700 text-white' : 'text-stone-500 hover:text-stone-800'
              )}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'manage'    && <ManageTab retreat={retreat} vendors={vendors} />}
      {tab === 'catalog'   && <VendorCatalogTab retreat={retreat} vendors={vendors} />}
      {tab === 'find'      && <FindTab retreat={retreat} vendors={vendors} />}
      {tab === 'reminders' && <RemindersTab retreat={retreat} vendors={vendors} />}
    </div>
  )
}

// ── MANAGE tab ─────────────────────────────────────────────────────────────
function ManageTab({ retreat, vendors }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  // Flights & hotels have their own dedicated stages — this tab is "everything else".
  const manageable = vendors.filter(v => v.category !== 'hotel' && v.category !== 'flights')
  const otherCats  = CATS.filter(c => c.key !== 'hotel' && c.key !== 'flights')

  const counts = manageable.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] ?? 0) + 1; return acc
  }, {} as Record<string, number>)

  const shown = filter === 'all' ? manageable : manageable.filter(v => v.category === filter)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return; setLoading(true)
    const supabase = createClient()
    await supabase.from('vendors').insert({
      retreat_id: retreat.id, name: form.name, category: form.category,
      contact_name: form.contact_name || null, contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null, deliverables: form.deliverables || null,
      deadline: form.deadline || null, cost: form.cost ? parseFloat(form.cost) : null,
    })
    setForm(EMPTY_FORM); setAdding(false); setLoading(false)
    flash('Vendor added'); router.refresh()
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
        category: (CATS.some(c => c.key === category) ? category : 'other') as CatKey,
        contact_name: contact_name || null, contact_email: contact_email || null,
        contact_phone: contact_phone || null, deliverables: deliverables || null,
        deadline: deadline || null, cost: cost ? parseFloat(cost) : null,
      }
    })
    await supabase.from('vendors').insert(inserts)
    flash(`Imported ${inserts.length} vendors`); router.refresh()
    e.target.value = ''
  }

  function dlTemplate() {
    const csv = 'name,category,contact_name,contact_email,contact_phone,deliverables,deadline,cost\nMountain Estate,hotel,Rina,rina@estate.com,03-7654321,Sign contract & deposit,2025-12-01,72000'
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'vendors-template.csv',
    }); a.click()
  }

  return (
    <div>
      {/* category chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto nice-scroll pb-2 mb-4">
        <CatChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={manageable.length} />
        {otherCats.map(c => (
          <CatChip key={c.key} active={filter === c.key} onClick={() => setFilter(c.key)}
            label={c.label} count={counts[c.key] ?? 0} />
        ))}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setAdding(a => !a)}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg px-4 py-2.5 shadow-sm transition active:scale-[0.98]">
          <Plus size={14} /> {adding ? 'Close' : 'New vendor'}
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-200 rounded-lg px-4 py-2.5 transition">
          <Upload size={14} /> Import CSV
        </button>
        <button onClick={dlTemplate}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
          <Download size={12} /> Template
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        {toast && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200 fade-in">
            <CheckCircle2 size={12} /> {toast}
          </span>
        )}
      </div>

      {/* add form */}
      {adding && (
        <div className="bg-stone-50 ring-1 ring-stone-200 rounded-2xl p-5 mb-4 fade-up card">
          <VendorForm form={form} set={set} onSubmit={handleAdd} loading={loading} submitLabel="Add vendor"
            onCancel={() => { setForm(EMPTY_FORM); setAdding(false) }} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {shown.length === 0 && (
          <div className="sm:col-span-2 bg-white ring-1 ring-stone-200 card rounded-2xl p-8 text-center text-stone-400 text-sm">
            {filter === 'all' ? 'No vendors yet — add one or import a CSV.' : `No ${catByKey(filter).label.toLowerCase()} vendors yet.`}
          </div>
        )}
        {shown.map((v, i) => (
          <VendorCard key={v.id} v={v} i={i} />
        ))}
      </div>
    </div>
  )
}

function CatChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick}
      className={cn('shrink-0 flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 ring-1 transition',
        active ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300'
      )}>
      {label}
      <span className={active ? 'text-emerald-200' : 'text-stone-400'}>{count}</span>
    </button>
  )
}

function VendorForm({ form, set, onSubmit, loading, submitLabel, onCancel }: {
  form: typeof EMPTY_FORM; set: (k: string, v: string) => void
  onSubmit: (e: React.FormEvent) => void; loading?: boolean; submitLabel: string; onCancel?: () => void
}) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className={labelCls}>Vendor name *</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} autoFocus />
      </div>
      <div className="col-span-2">
        <label className={labelCls}>Category</label>
        <div className="flex flex-wrap gap-1.5">
          {CATS.map(c => (
            <button type="button" key={c.key} onClick={() => set('category', c.key)}
              className={cn('flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 ring-1 transition',
                form.category === c.key ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-stone-500 ring-stone-200'
              )}>
              <c.Icon size={12} /> {c.label}
            </button>
          ))}
        </div>
      </div>
      <div><label className={labelCls}>Contact name</label>
        <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Phone</label>
        <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={inputCls} /></div>
      <div className="col-span-2"><label className={labelCls}>Email</label>
        <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} className={inputCls} /></div>
      <div className="col-span-2"><label className={labelCls}>Deliverables</label>
        <input value={form.deliverables} onChange={e => set('deliverables', e.target.value)} placeholder="Sign contract & deposit" className={inputCls} /></div>
      <div><label className={labelCls}>Deadline</label>
        <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Cost (USD)</label>
        <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)} className={inputCls} /></div>
      <div className="col-span-2 flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel}
          className="text-sm font-semibold text-stone-600 hover:bg-stone-100 ring-1 ring-stone-200 rounded-lg px-4 py-2.5 transition">Cancel</button>}
        <button type="submit" disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg px-4 py-2.5 disabled:opacity-60 transition">
          {loading && <Loader2 size={13} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function VendorCard({ v, i }: { v: Vendor; i: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: v.name, category: v.category as CatKey,
    contact_name: v.contact_name ?? '', contact_email: v.contact_email ?? '',
    contact_phone: v.contact_phone ?? '', deliverables: v.deliverables ?? '',
    deadline: v.deadline ?? '', cost: v.cost != null ? String(v.cost) : '',
  })
  const set = (k: string, val: string) => setForm(f => ({ ...f, [k]: val }))

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return
    const supabase = createClient()
    await supabase.from('vendors').update({
      name: form.name, category: form.category,
      contact_name: form.contact_name || null, contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null, deliverables: form.deliverables || null,
      deadline: form.deadline || null, cost: form.cost ? parseFloat(form.cost) : null,
    }).eq('id', v.id)
    setEditing(false); router.refresh()
  }

  async function cycleStatus() {
    const cur = v.status as Vendor['status']
    const i = STATUS_CYCLE.indexOf(cur)
    const next = STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]
    const supabase = createClient()
    await supabase.from('vendors').update({ status: next }).eq('id', v.id)
    router.refresh()
  }

  async function remove() {
    const supabase = createClient()
    await supabase.from('vendors').delete().eq('id', v.id)
    router.refresh()
  }

  const cat = catByKey(v.category)
  const today = new Date().toISOString().split('T')[0]
  const overdue = v.deadline && v.deadline < today && v.status === 'pending'

  if (editing) {
    return (
      <div className="bg-stone-50 ring-1 ring-stone-200 rounded-2xl p-5 fade-up card">
        <VendorForm form={form} set={set} onSubmit={save} submitLabel="Save changes" onCancel={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div className="group bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden fade-up"
      style={{ animationDelay: `${i * 40}ms` }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('size-11 shrink-0 rounded-xl grid place-items-center', cat.tile)}>
            <cat.Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-stone-800 truncate">{v.name}</div>
            <div className="text-xs text-stone-400">{cat.label}</div>
            {v.deliverables && (
              <div className="flex items-center gap-1.5 text-sm text-stone-500 truncate mt-1">
                <ClipboardList size={11} className="shrink-0 text-stone-400" /> {v.deliverables}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button onClick={() => setEditing(true)} title="Edit" className="text-stone-300 hover:text-emerald-600 transition"><PenLine size={14} /></button>
            <button onClick={remove} title="Remove" className="text-stone-300 hover:text-rose-500 transition"><X size={14} /></button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2.5 text-xs text-stone-400">
          {v.contact_name && <span className="flex items-center gap-1"><span>{v.contact_name}</span></span>}
          {v.cost != null && v.cost > 0 && <span className="font-semibold text-stone-500">{formatCurrency(v.cost)}</span>}
          {v.contact_phone && (
            <a href={`tel:${v.contact_phone}`} className="flex items-center gap-0.5 hover:text-emerald-600"><Phone size={10} /></a>
          )}
          {v.contact_email && (
            <a href={`mailto:${v.contact_email}`} className="flex items-center gap-0.5 hover:text-emerald-600"><Mail size={10} /></a>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 gap-2">
          <button onClick={cycleStatus}
            className={cn('inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ring-1 transition active:scale-[0.97]',
              STATUS_CHIP[v.status], 'ring-current/30'
            )}>
            <span className={cn('size-2 rounded-full', STATUS_DOT[v.status])} />
            {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
          </button>
          {v.deadline && (
            <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1',
              overdue ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-500'
            )}>
              {overdue ? 'Overdue · ' : ''}{formatDate(v.deadline)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── FIND FOR ME tab ────────────────────────────────────────────────────────
function FindTab({ retreat, vendors }: Props) {
  const router = useRouter()
  const [added, setAdded] = useState<Record<string, true | 'dismissed'>>({})
  const concept = detectConcept(retreat)
  const have = new Set(vendors.map(v => v.category))
  const suggestions = concept.missing.filter(s =>
    s.key !== 'hotel' && s.key !== 'flights' && !have.has(s.key) && added[s.key] !== 'dismissed')

  async function add(s: typeof concept.missing[0]) {
    if (added[s.key] === true) return
    const supabase = createClient()
    await supabase.from('vendors').insert({
      retreat_id: retreat.id, name: catByKey(s.key).label, category: s.key,
      deliverables: s.deliverable, status: 'pending',
    })
    setAdded(a => ({ ...a, [s.key]: true })); router.refresh()
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-emerald-50 to-white ring-1 ring-emerald-200/70 rounded-2xl p-4 mb-4 flex items-start gap-3 fade-up card">
        <span className="size-9 shrink-0 grid place-items-center rounded-lg bg-emerald-700 text-white">
          <Sparkles size={18} />
        </span>
        <div className="flex-1">
          <div className="font-semibold text-stone-800">Find vendors for your retreat</div>
          <p className="text-sm text-stone-500 mt-0.5">
            Based on <b className="text-stone-700">{concept.label}</b>
            {retreat.budget ? `, ${formatCurrency(retreat.budget)} budget` : ''}.
            {' '}The more you accept or skip, the smarter the suggestions get.
          </p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-8 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-3" />
          <div className="font-semibold text-stone-700">You're covered on the essentials</div>
          <p className="text-stone-400 text-sm mt-1">No more category gaps. Add anything else manually in Manage.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {suggestions.map((s, i) => {
            const cat = catByKey(s.key)
            const done = added[s.key] === true
            return (
              <div key={s.key} className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 fade-up"
                style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start gap-3">
                  <div className={cn('size-11 shrink-0 rounded-xl grid place-items-center', cat.tile)}>
                    <cat.Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-stone-800">{cat.label}</div>
                    <div className="text-sm text-stone-500 mt-0.5">{s.deliverable}</div>
                  </div>
                </div>
                <p className="text-xs text-stone-500 mt-2.5 flex items-start gap-1.5">
                  <Lightbulb size={12} className="shrink-0 mt-0.5 text-amber-500" /> {s.reason}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {done ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={13} /> Added to vendors
                    </span>
                  ) : (
                    <>
                      <button onClick={() => add(s)}
                        className="inline-flex items-center gap-2 text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg px-4 py-2 transition">
                        <Plus size={13} /> Add
                      </button>
                      <button onClick={() => setAdded(a => ({ ...a, [s.key]: 'dismissed' }))}
                        className="text-sm font-semibold text-stone-600 hover:bg-stone-100 ring-1 ring-stone-200 rounded-lg px-4 py-2 transition">
                        Skip
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── REMINDERS tab ──────────────────────────────────────────────────────────
function RemindersTab({ retreat, vendors }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [copied, setCopied] = useState(false)
  const [rated, setRated] = useState(false)
  const [senderName, setSenderName] = useState('')

  const open = vendors.filter(v => v.status !== 'completed')
  const current = vendors.find(v => v.id === selected)

  async function run(v: Vendor) {
    setSelected(v.id); setRated(false); setDraft(''); setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const greet = v.contact_name ? v.contact_name.split(' ')[0] : v.name
    const me = senderName || 'the team'
    const ev = retreat.start_date ? `${formatDate(retreat.start_date)}${retreat.end_date ? ' – ' + formatDate(retreat.end_date) : ''}` : retreat.name
    const dl = v.deadline ? formatDate(v.deadline) : 'TBD'
    const deliv = v.deliverables || 'coordinate details'

    const today_d = new Date(); today_d.setHours(0,0,0,0)
    const days_left = v.deadline ? Math.round((new Date(v.deadline).getTime() - today_d.getTime()) / 86400000) : null
    const urgency = days_left == null ? '' : days_left < 0 ? ' (overdue)' : days_left === 0 ? ' (today)' : days_left <= 3 ? ` (in ${days_left} days)` : ` (in ${days_left} days)`

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Draft a short, warm ${channel === 'whatsapp' ? 'WhatsApp message' : 'email'} from ${me} to ${greet} at ${v.name} about the retreat "${retreat.name}" (${ev}). Their deliverable: "${deliv}" is due ${dl}${urgency}. Be concise and friendly.`,
          retreat, vendors: [], participants: [], schedule: [], history: [],
        }),
      })
      const data = await res.json()
      setDraft(data.response ?? 'Could not generate draft.')
    } catch {
      setDraft('Could not generate draft.')
    }
    setLoading(false)
  }

  const copy = () => { navigator.clipboard?.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const wa = () => {
    const p = (current?.contact_phone ?? '').replace(/\D/g, '').replace(/^0/, '972')
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(draft)}`, '_blank')
  }
  const mail = () => window.open(
    `mailto:${current?.contact_email ?? ''}?subject=${encodeURIComponent('Reminder · ' + (current?.deliverables ?? '') + ' — ' + retreat.name)}&body=${encodeURIComponent(draft)}`
  )

  if (vendors.length === 0) {
    return (
      <div className="text-center py-14 text-stone-400">
        <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Add vendors first, then draft reminders here.</p>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* left: open reminders list */}
      <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden fade-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">Open reminders ({open.length})</h2>
          <label className="flex items-center gap-1 text-xs text-stone-500">
            From:
            <input value={senderName} onChange={e => setSenderName(e.target.value)}
              placeholder="you" className="w-16 bg-stone-100 rounded-md px-2 py-1 font-semibold text-stone-700 outline-none text-xs ml-1" />
          </label>
        </div>
        <div className="max-h-[60vh] overflow-y-auto nice-scroll">
          {open.length === 0 && <p className="text-center text-stone-400 text-sm py-10">No open reminders.</p>}
          {open.map(v => {
            const cat = catByKey(v.category)
            const today_d = new Date(); today_d.setHours(0,0,0,0)
            const daysLeft = v.deadline ? Math.round((new Date(v.deadline).getTime() - today_d.getTime()) / 86400000) : null
            const urgent = daysLeft != null && daysLeft <= 3
            return (
              <button key={v.id} onClick={() => run(v)}
                className={cn('w-full text-left rounded-lg ring-1 p-3 mx-2 my-1.5 transition hover:shadow-sm',
                  selected === v.id ? 'ring-emerald-400 bg-emerald-50/50' : 'ring-stone-200 bg-white'
                )} style={{ width: 'calc(100% - 1rem)' }}>
                <div className="flex items-center gap-2">
                  <cat.Icon size={13} className="text-stone-400" />
                  <span className="font-semibold text-stone-800 text-sm truncate flex-1">{v.name}</span>
                  {daysLeft != null && (
                    <span className={cn('text-xs font-semibold rounded-full px-2 py-0.5',
                      urgent ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-500'
                    )}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-stone-500 truncate max-w-[65%]">{v.deliverables}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <Sparkles size={11} /> Draft
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* right: draft panel */}
      <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5 fade-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 font-semibold text-stone-800">
            <Sparkles size={15} className="text-emerald-600" /> Reminder draft
          </h2>
        </div>

        {!loading && !draft && (
          <div className="text-center text-stone-400 text-sm py-12">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
            Pick a reminder on the left to draft a message.
          </div>
        )}
        {loading && (
          <div className="space-y-2 py-4">
            {[5, 6, 4].map((w, i) => (
              <div key={i} className="h-3.5 rounded-lg bg-stone-100 animate-pulse" style={{ width: `${w * 14}%` }} />
            ))}
          </div>
        )}
        {!loading && draft && (
          <>
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              rows={Math.min(9, draft.split('\n').length + 2)}
              className="w-full text-sm text-stone-700 leading-relaxed resize-none outline-none bg-transparent" />

            <div className="flex items-center gap-1 mt-2.5 p-1 bg-stone-100 rounded-lg w-fit">
              {([['whatsapp', 'WhatsApp'], ['email', 'Email']] as const).map(([k, l]) => (
                <button key={k} onClick={() => setChannel(k)}
                  className={cn('text-xs font-semibold rounded-md px-2.5 py-1 transition',
                    channel === k ? 'bg-emerald-700 text-white' : 'text-stone-500'
                  )}>{l}</button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2.5">
              <button onClick={channel === 'whatsapp' ? wa : mail}
                className="col-span-2 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg py-2.5 transition">
                {channel === 'whatsapp' ? <MessageSquare size={13} /> : <Mail size={13} />}
                {channel === 'whatsapp' ? 'Send on WhatsApp' : 'Send email'}
              </button>
              <button onClick={copy}
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 ring-1 ring-stone-200 rounded-lg py-2.5 transition">
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
              <span className="text-xs text-stone-400">{rated ? 'Thanks! Will adapt next time.' : "How's the tone?"}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setRated(true)} disabled={rated}
                  className="size-8 grid place-items-center rounded-lg ring-1 ring-stone-200 hover:bg-emerald-50 text-stone-500 disabled:opacity-40">
                  <ThumbsUp size={14} />
                </button>
                <button onClick={() => setRated(true)} disabled={rated}
                  className="size-8 grid place-items-center rounded-lg ring-1 ring-stone-200 hover:bg-rose-50 text-stone-500 disabled:opacity-40">
                  <ThumbsDown size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
