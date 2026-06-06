'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor } from '@/types'
import { type HotelResult } from '@/types/booking'
import HotelResults from '@/components/booking/HotelResults'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Building2, RefreshCw, Trash2, CheckCircle2, Calendar, MapPin, AlertCircle } from 'lucide-react'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
}

const STATUS_CYCLE: Vendor['status'][] = ['pending', 'confirmed', 'completed']
const STATUS_CHIP: Record<Vendor['status'], string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-stone-100 text-stone-500',
  cancelled: 'bg-rose-100 text-rose-600',
}

function nightsBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 1
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export default function HotelsStage({ retreat, vendors }: Props) {
  const router = useRouter()
  const [results, setResults]   = useState<HotelResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [toast, setToast]       = useState('')

  const hotelBudget = retreat.hotel_budget ?? Math.round((retreat.budget ?? 0) * 0.6)
  const committed   = vendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const nights      = nightsBetween(retreat.start_date, retreat.end_date)
  const canSearch   = !!(retreat.start_date && retreat.end_date && retreat.destination)

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  async function search() {
    if (!canSearch) { setError('Set the retreat dates and destination first.'); return }
    setSearching(true); setError(null)
    try {
      const res = await fetch('/api/search/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retreatId: retreat.id,
          destination: retreat.destination,
          checkInDate: retreat.start_date,
          checkOutDate: retreat.end_date,
          numberOfAdult: retreat.number_of_participants || 2,
        }),
      })
      if (res.ok) {
        const { hotels } = await res.json()
        setResults(hotels || [])
      } else {
        const { error: msg } = await res.json()
        setError(msg || 'Hotel search failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hotel search failed')
    } finally {
      setSearching(false)
    }
  }

  // Search once on first open, using the retreat's dates.
  useEffect(() => {
    if (canSearch) search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addHotel(h: HotelResult) {
    const ratePerNight = h.rate_per_night?.extracted_lowest ?? 0
    const totalCost = ratePerNight * nights
    const supabase = createClient()
    await supabase.from('vendors').insert({
      retreat_id: retreat.id,
      name: h.name,
      category: 'hotel',
      cost: totalCost,
      status: 'pending',
      deliverables: `${formatCurrency(ratePerNight)}/night × ${nights} night${nights > 1 ? 's' : ''}`,
    })
    flash('Hotel added'); router.refresh()
  }

  async function cycleStatus(v: Vendor) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(v.status) + 1) % STATUS_CYCLE.length]
    const supabase = createClient()
    await supabase.from('vendors').update({ status: next }).eq('id', v.id)
    router.refresh()
  }

  async function remove(id: string) {
    const supabase = createClient()
    await supabase.from('vendors').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5 fade-up">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-stone-800">Hotels</h1>
            <p className="text-sm text-stone-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {retreat.destination || 'No destination'}</span>
              <span className="inline-flex items-center gap-1"><Calendar size={12} /> {retreat.start_date ? `${formatDate(retreat.start_date)} – ${formatDate(retreat.end_date)} · ${nights} night${nights > 1 ? 's' : ''}` : 'No dates set'}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-400">Committed / budget</p>
          <p className="text-sm font-bold text-stone-800">
            {formatCurrency(committed)} <span className="text-stone-300">/</span> {formatCurrency(hotelBudget)}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-5">
        {/* search */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700">Search hotels for your dates</h2>
            <button onClick={search} disabled={searching || !canSearch}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-50 rounded-lg px-3 py-1.5 transition">
              <RefreshCw size={12} className={searching ? 'animate-spin' : ''} /> {searching ? 'Searching…' : 'Search again'}
            </button>
          </div>

          {error && (
            <div className="mb-3 flex items-start gap-2 bg-amber-50 ring-1 ring-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <HotelResults hotels={results} loading={searching} budget={hotelBudget} onSelect={addHotel} />
        </div>

        {/* selected hotel vendors */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700">Your hotels</h2>
            <span className="text-xs text-stone-400">{vendors.length}</span>
          </div>

          {toast && (
            <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
              <CheckCircle2 size={12} /> {toast}
            </div>
          )}

          {vendors.length === 0 ? (
            <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-6 text-center text-sm text-stone-400">
              No hotels added yet — pick one from the search results.
            </div>
          ) : (
            <div className="space-y-2">
              {vendors.map(v => (
                <div key={v.id} className="bg-white ring-1 ring-stone-200 rounded-xl p-3 flex items-start gap-2 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">{v.name}</p>
                    <p className="text-xs text-stone-400">{v.cost != null ? formatCurrency(v.cost) : 'No cost'}{v.deliverables ? ` · ${v.deliverables}` : ''}</p>
                  </div>
                  <button onClick={() => cycleStatus(v)}
                    className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 transition hover:opacity-80', STATUS_CHIP[v.status])}>
                    {v.status}
                  </button>
                  <button onClick={() => remove(v.id)}
                    className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
