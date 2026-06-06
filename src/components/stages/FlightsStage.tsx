'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Vendor } from '@/types'
import { type FlightResult } from '@/types/booking'
import FlightResults from '@/components/booking/FlightResults'
import BudgetAllocator from '@/components/booking/BudgetAllocator'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Plane, RefreshCw, Trash2, CheckCircle2, Calendar, MapPin, AlertCircle } from 'lucide-react'

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

export default function FlightsStage({ retreat, vendors }: Props) {
  const router = useRouter()
  const [results, setResults]   = useState<FlightResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [toast, setToast]       = useState('')

  const total = retreat.budget ?? 0
  // Hotel/flight split lives on the retreat so the Hotels stage reads the same numbers.
  const [hotelPct, setHotelPct] = useState(() =>
    retreat.hotel_budget != null && total > 0 ? Math.round((retreat.hotel_budget / total) * 100) : 60)
  const flightPct    = 100 - hotelPct
  const flightBudget = Math.round(total * flightPct / 100)
  const hotelBudget  = total - flightBudget
  const committed    = vendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const canSearch    = !!(retreat.start_date && retreat.end_date && retreat.destination)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function changeSplit(hp: number) {
    setHotelPct(hp)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const supabase = createClient()
      await supabase.from('retreats').update({
        hotel_budget: Math.round(total * hp / 100),
        flight_budget: Math.round(total * (100 - hp) / 100),
      }).eq('id', retreat.id)
      router.refresh()
    }, 500)
  }

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  async function search() {
    if (!canSearch) { setError('Set the retreat dates and destination first.'); return }
    setSearching(true); setError(null)
    try {
      const res = await fetch('/api/search/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retreatId: retreat.id,
          destination: retreat.destination,
          outboundDate: retreat.start_date,
          returnDate: retreat.end_date,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const all = [...(data.best_flights ?? []), ...(data.other_flights ?? [])]
        const mapped: FlightResult[] = all.map((opt: any) => ({
          price: opt.price,
          total_duration: opt.total_duration,
          airline: opt.flights[0].airline,
          airline_logo: opt.airline_logo,
          flight_number: opt.flights[0].flight_number,
          departure_airport: opt.flights[0].departure_airport,
          arrival_airport: opt.flights[opt.flights.length - 1].arrival_airport,
          stops: (opt.layovers ?? []).length,
          departure_token: opt.departure_token,
        }))
        setResults(mapped)
      } else {
        const { error: msg } = await res.json()
        setError(msg || 'Flight search failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Flight search failed')
    } finally {
      setSearching(false)
    }
  }

  // Search once on first open, using the retreat's dates.
  useEffect(() => {
    if (canSearch) search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addFlight(f: FlightResult) {
    const supabase = createClient()
    await supabase.from('vendors').insert({
      retreat_id: retreat.id,
      name: `${f.airline} — ${f.departure_airport.id}→${f.arrival_airport.id}`,
      category: 'flights',
      cost: f.price,
      status: 'pending',
      deliverables: `Round trip · Flight ${f.flight_number} · ${f.stops === 0 ? 'Direct' : `${f.stops} stop(s)`}`,
    })
    flash('Flight added'); router.refresh()
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
          <div className="size-10 rounded-xl bg-sky-100 text-sky-700 grid place-items-center shrink-0">
            <Plane size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-stone-800">Flights</h1>
            <p className="text-sm text-stone-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {retreat.destination || 'No destination'}</span>
              <span className="inline-flex items-center gap-1"><Calendar size={12} /> {retreat.start_date ? `${formatDate(retreat.start_date)} – ${formatDate(retreat.end_date)}` : 'No dates set'}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-400">Committed / budget</p>
          <p className="text-sm font-bold text-stone-800">
            {formatCurrency(committed)} <span className="text-stone-300">/</span> {formatCurrency(flightBudget)}
          </p>
        </div>
      </div>

      {/* budget split — shared with the Hotels stage */}
      {total > 0 && (
        <div className="mb-5">
          <BudgetAllocator
            totalBudget={total}
            hotelPercent={hotelPct}
            flightPercent={flightPct}
            onHotelPercentChange={changeSplit}
            hotelBudget={hotelBudget}
            flightBudget={flightBudget}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_22rem] gap-5">
        {/* search */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700">Search flights for your dates</h2>
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

          <FlightResults flights={results} loading={searching} budget={flightBudget} onSelect={addFlight} />
        </div>

        {/* selected flight vendors */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700">Your flights</h2>
            <span className="text-xs text-stone-400">{vendors.length}</span>
          </div>

          {toast && (
            <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
              <CheckCircle2 size={12} /> {toast}
            </div>
          )}

          {vendors.length === 0 ? (
            <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-6 text-center text-sm text-stone-400">
              No flights added yet — pick one from the search results.
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
