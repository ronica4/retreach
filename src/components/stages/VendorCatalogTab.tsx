'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor, type VendorCatalogItem } from '@/types'
import { cn } from '@/lib/utils'
import {
  Search, MapPin, ExternalLink, Plus, Loader2, Building2,
  HeartHandshake, X, LibraryBig, CheckCircle2,
} from 'lucide-react'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
}

// ── source-category → display label ─────────────────────────────────────────
const CAT_LABEL: Record<string, string> = {
  hostel_general: 'Lodging',
  general: 'General',
  nature: 'Nature',
  workshop: 'Workshop',
  extreme: 'Adventure',
  food: 'Food',
  transportation: 'Transport',
  culture: 'Culture',
  wellness: 'Wellness',
}
const catLabel = (c: string | null) => (c ? CAT_LABEL[c] ?? c : 'Other')

// source-category → retreat vendor category (when pulling into a retreat)
function toVendorCategory(item: VendorCatalogItem): Vendor['category'] {
  if (item.entity_type === 'hostel') return 'hotel'
  switch (item.category) {
    case 'hostel_general': return 'hotel'
    case 'food': return 'food'
    case 'transportation': return 'transport'
    case 'nature':
    case 'workshop':
    case 'extreme':
    case 'culture':
    case 'wellness':
    case 'general': return 'attraction'
    default: return 'other'
  }
}

// Hebrew → English country labels (data is Hebrew; UI is English).
const COUNTRY_LABEL: Record<string, string> = {
  'הודו': 'India',
  'תאילנד': 'Thailand',
  'וייטנאם': 'Vietnam',
  'סרי לנקה': 'Sri Lanka',
  'נפאל': 'Nepal',
  'פיליפינים': 'Philippines',
  'קמבודיה': 'Cambodia',
  'לאוס': 'Laos',
  'יפן': 'Japan',
}
const countryLabel = (c: string | null) => (c ? COUNTRY_LABEL[c] ?? c : '')

const inputCls = 'w-full text-sm bg-white rounded-lg px-3 py-2.5 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-1 block'

const PAGE = 60

export default function VendorCatalogTab({ retreat, vendors }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<VendorCatalogItem[] | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [country, setCountry] = useState('all')
  const [category, setCategory] = useState('all')
  const [type, setType] = useState<'all' | 'attraction' | 'hostel'>('all')
  const [limit, setLimit] = useState(PAGE)
  const [added, setAdded] = useState<Record<string, true>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [contributing, setContributing] = useState(false)

  // names already on this retreat → mark as "added"
  const haveNames = useMemo(
    () => new Set(vendors.map(v => v.name.trim().toLowerCase())),
    [vendors]
  )

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    supabase
      .from('vendor_catalog')
      .select('id,source_id,entity_type,name,country,city,category,description,url,created_by,created_at')
      .order('created_at', { ascending: true })
      .limit(5000)
      .then(({ data }) => setItems((data as VendorCatalogItem[]) ?? []))
  }, [])

  const countries = useMemo(() => {
    if (!items) return []
    const counts = new Map<string, number>()
    for (const it of items) if (it.country) counts.set(it.country, (counts.get(it.country) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [items])

  const categories = useMemo(() => {
    if (!items) return []
    const counts = new Map<string, number>()
    for (const it of items) if (it.category) counts.set(it.category, (counts.get(it.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [items])

  const filtered = useMemo(() => {
    if (!items) return []
    const needle = q.trim().toLowerCase()
    return items.filter(it => {
      if (type !== 'all' && it.entity_type !== type) return false
      if (country !== 'all' && it.country !== country) return false
      if (category !== 'all' && it.category !== category) return false
      if (needle) {
        const hay = `${it.name} ${it.city ?? ''} ${it.description ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [items, q, country, category, type])

  // reset paging when filters change (adjust-state-during-render pattern)
  const filterSig = `${q}|${country}|${category}|${type}`
  const [prevSig, setPrevSig] = useState(filterSig)
  if (filterSig !== prevSig) { setPrevSig(filterSig); setLimit(PAGE) }

  async function addToRetreat(item: VendorCatalogItem) {
    if (busy || added[item.id]) return
    setBusy(item.id)
    const supabase = createClient()
    await supabase.from('vendors').insert({
      retreat_id: retreat.id,
      name: item.name,
      category: toVendorCategory(item),
      deliverables: item.description ?? null,
      status: 'pending',
    })
    setAdded(a => ({ ...a, [item.id]: true }))
    setBusy(null)
    router.refresh()
  }

  if (items === null) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading vendor catalog…
      </div>
    )
  }

  return (
    <div>
      {/* intro */}
      <div className="bg-gradient-to-r from-emerald-50 to-white ring-1 ring-emerald-200/70 rounded-2xl p-4 mb-4 flex items-start gap-3 fade-up card">
        <span className="size-9 shrink-0 grid place-items-center rounded-lg bg-emerald-700 text-white">
          <LibraryBig size={18} />
        </span>
        <div className="flex-1">
          <div className="font-semibold text-stone-800">Vendor catalog</div>
          <p className="text-sm text-stone-500 mt-0.5">
            {items.length.toLocaleString()} curated suppliers across {countries.length} countries.
            Search and add any of them to <b className="text-stone-700">{retreat.name}</b>.
          </p>
        </div>
        <button onClick={() => setContributing(c => !c)}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold bg-white text-emerald-800 hover:bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-3 py-2 transition">
          {contributing ? <><X size={13} /> Close</> : <><Plus size={13} /> Add to catalog</>}
        </button>
      </div>

      {contributing && userId && (
        <ContributeForm userId={userId} onDone={() => {
          setContributing(false)
          // reload catalog so the new entry shows up
          const supabase = createClient()
          supabase.from('vendor_catalog')
            .select('id,source_id,entity_type,name,country,city,category,description,url,created_by,created_at')
            .order('created_at', { ascending: true }).limit(5000)
            .then(({ data }) => setItems((data as VendorCatalogItem[]) ?? []))
        }} />
      )}

      {/* filters */}
      <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, city, description…"
            className={cn(inputCls, 'pl-9')} />
        </div>
        <select value={country} onChange={e => setCountry(e.target.value)} className={cn(inputCls, 'sm:w-44')}>
          <option value="all">All countries</option>
          {countries.map(([c, n]) => <option key={c} value={c}>{countryLabel(c)} ({n})</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className={cn(inputCls, 'sm:w-44')}>
          <option value="all">All categories</option>
          {categories.map(([c, n]) => <option key={c} value={c}>{catLabel(c)} ({n})</option>)}
        </select>
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
          {([['all', 'All'], ['attraction', 'Activities'], ['hostel', 'Lodging']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setType(k)}
              className={cn('text-xs font-semibold rounded-md px-2.5 py-1.5 transition whitespace-nowrap',
                type === k ? 'bg-emerald-700 text-white' : 'text-stone-500 hover:text-stone-800')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-stone-400">
          {filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''}
        </p>
        {(q || country !== 'all' || category !== 'all' || type !== 'all') && (
          <button onClick={() => { setQ(''); setCountry('all'); setCategory('all'); setType('all') }}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">Clear filters</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-10 text-center text-stone-400 text-sm">
          No vendors match these filters.
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.slice(0, limit).map((it, i) => {
              const isAdded = added[it.id] || haveNames.has(it.name.trim().toLowerCase())
              const Icon = it.entity_type === 'hostel' ? Building2 : HeartHandshake
              return (
                <div key={it.id} className="group bg-white ring-1 ring-stone-200 card rounded-2xl p-4 flex flex-col fade-up"
                  style={{ animationDelay: `${(i % PAGE) * 20}ms` }}>
                  <div className="flex items-start gap-3">
                    <div className={cn('size-10 shrink-0 rounded-xl grid place-items-center',
                      it.entity_type === 'hostel' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600')}>
                      <Icon size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-stone-800 leading-snug break-words" dir="auto">{it.name}</div>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-stone-400 mt-0.5">
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin size={10} /> {[it.city, countryLabel(it.country)].filter(Boolean).join(', ') || '—'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">{catLabel(it.category)}</span>
                      </div>
                    </div>
                  </div>

                  {it.description && (
                    <p className="text-sm text-stone-500 mt-2.5 line-clamp-3 leading-relaxed" dir="auto">{it.description}</p>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-stone-100">
                    {it.url ? (
                      <a href={it.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-emerald-700 transition">
                        <ExternalLink size={11} /> Details
                      </a>
                    ) : <span />}
                    {isAdded ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={14} /> In retreat
                      </span>
                    ) : (
                      <button onClick={() => addToRetreat(it)} disabled={busy === it.id}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg px-3 py-1.5 disabled:opacity-60 transition active:scale-[0.97]">
                        {busy === it.id ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {limit < filtered.length && (
            <div className="text-center mt-5">
              <button onClick={() => setLimit(l => l + PAGE)}
                className="inline-flex items-center gap-2 text-sm font-semibold bg-white text-stone-700 hover:bg-stone-50 ring-1 ring-stone-200 rounded-lg px-5 py-2.5 transition">
                Show more ({(filtered.length - limit).toLocaleString()} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── contribute a new vendor to the shared catalog ───────────────────────────
function ContributeForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [form, setForm] = useState({
    name: '', entity_type: 'attraction' as 'attraction' | 'hostel',
    country: '', city: '', category: 'general', description: '', url: '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('vendor_catalog').insert({
      source_id: null,
      entity_type: form.entity_type,
      name: form.name.trim(),
      country: form.country.trim() || null,
      city: form.city.trim() || null,
      category: form.entity_type === 'hostel' ? 'hostel_general' : form.category,
      description: form.description.trim() || null,
      url: form.url.trim() || null,
      created_by: userId,
    })
    setLoading(false)
    onDone()
  }

  return (
    <form onSubmit={submit} className="bg-stone-50 ring-1 ring-stone-200 rounded-2xl p-5 mb-4 grid grid-cols-2 gap-3 fade-up card">
      <div className="col-span-2">
        <label className={labelCls}>Vendor name *</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} autoFocus />
      </div>
      <div>
        <label className={labelCls}>Type</label>
        <div className="flex gap-1.5">
          {(['attraction', 'hostel'] as const).map(t => (
            <button type="button" key={t} onClick={() => set('entity_type', t)}
              className={cn('flex-1 text-xs font-semibold rounded-lg px-2.5 py-2 ring-1 transition capitalize',
                form.entity_type === t ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-stone-500 ring-stone-200')}>
              {t === 'attraction' ? 'Activity' : 'Lodging'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Category</label>
        <select value={form.category} onChange={e => set('category', e.target.value)}
          disabled={form.entity_type === 'hostel'} className={cn(inputCls, 'disabled:opacity-50')}>
          {['general', 'nature', 'workshop', 'extreme', 'food', 'transportation', 'culture', 'wellness']
            .map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
        </select>
      </div>
      <div><label className={labelCls}>Country</label>
        <input value={form.country} onChange={e => set('country', e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>City</label>
        <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} /></div>
      <div className="col-span-2"><label className={labelCls}>Description</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} className={inputCls} /></div>
      <div className="col-span-2"><label className={labelCls}>Link (URL)</label>
        <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" className={inputCls} /></div>
      <div className="col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onDone}
          className="text-sm font-semibold text-stone-600 hover:bg-stone-100 ring-1 ring-stone-200 rounded-lg px-4 py-2.5 transition">Cancel</button>
        <button type="submit" disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg px-4 py-2.5 disabled:opacity-60 transition">
          {loading && <Loader2 size={13} className="animate-spin" />} Add to catalog
        </button>
      </div>
    </form>
  )
}
