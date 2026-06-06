'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Retreat } from '@/types'
import { HotelResult, FlightResult } from '@/types/booking'
import BudgetAllocator from '@/components/booking/BudgetAllocator'
import HotelResults from '@/components/booking/HotelResults'
import FlightResults from '@/components/booking/FlightResults'
import { ArrowLeft, Loader, AlertCircle, Pencil, Trash2, Check, X, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface ShortlistHotel {
  id: string; name: string; ratePerNight: number; nights: number; totalCost: number; notes: string; property_token?: string
}
interface ShortlistFlight {
  id: string; airline: string; flight_number: string; price: number; total_duration: number; stops: number
  departure_airport: { id: string; time: string }; arrival_airport: { id: string; time: string }; notes: string
}

export default function BookingAssistantPage() {
  const router = useRouter()
  const params = useParams()
  const retreatId = params.id as string

  const [retreat, setRetreat] = useState<Retreat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [hotelBudgetPercent, setHotelBudgetPercent] = useState(60)
  const [flightBudgetPercent, setFlightBudgetPercent] = useState(40)

  const [hotelResults, setHotelResults] = useState<HotelResult[]>([])
  const [flightResults, setFlightResults] = useState<FlightResult[]>([])
  const [searchingHotels, setSearchingHotels] = useState(false)
  const [searchingFlights, setSearchingFlights] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [shortlistHotels, setShortlistHotels] = useState<ShortlistHotel[]>([])
  const [shortlistFlights, setShortlistFlights] = useState<ShortlistFlight[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', rate: '', notes: '' })
  const [chosenHotelId, setChosenHotelId] = useState<string | null>(null)
  const [chosenFlightId, setChosenFlightId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const [searchStep, setSearchStep] = useState<'idle' | 'flights' | 'hotels'>('idle')
  const [budgetTouched, setBudgetTouched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load retreat data
  useEffect(() => {
    async function loadRetreat() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error: err } = await supabase
        .from('retreats')
        .select('*')
        .eq('id', retreatId)
        .eq('manager_id', user.id)
        .single()

      if (err || !data) {
        setError('Retreat not found')
        setLoading(false)
        return
      }

      setRetreat(data)
      setLoading(false)
    }

    loadRetreat()
  }, [retreatId, router])

  async function performFlightSearch(r: Retreat, hotelPct: number, flightPct: number) {
    if (!r.start_date || !r.end_date || !r.destination) {
      setSearchError('Missing retreat details')
      return
    }

    setSearchingFlights(true)
    setSearchError(null)

    try {
      const flightRes = await fetch('/api/search/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retreatId: r.id,
          destination: r.destination,
          outboundDate: r.start_date,
          returnDate: r.end_date,
        }),
      })

      if (flightRes.ok) {
        const data = await flightRes.json()
        const allOptions = [...(data.best_flights ?? []), ...(data.other_flights ?? [])]
        const mapped: FlightResult[] = allOptions.map((opt: any) => ({
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
        setFlightResults(mapped)
      } else {
        const { error: msg } = await flightRes.json()
        setSearchError(msg || 'Flight search failed')
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Flight search failed')
    } finally {
      setSearchingFlights(false)
    }
  }

  async function performHotelSearch(r: Retreat, hotelPct: number, flightPct: number) {
    if (!r.start_date || !r.end_date || !r.destination || !r.budget) {
      setSearchError('Missing retreat details')
      return
    }

    setSearchingHotels(true)
    setSearchError(null)

    try {
      const checkIn = new Date(r.start_date)
      const checkOut = new Date(r.end_date)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

      const hotelBudget = (r.budget * hotelPct) / 100
      const maxDailyRate = hotelBudget / nights

      const hotelRes = await fetch('/api/search/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retreatId: r.id,
          destination: r.destination,
          checkInDate: r.start_date,
          checkOutDate: r.end_date,
          numberOfAdult: Math.min(r.number_of_participants || 2, 6),
          maxDailyRate,
        }),
      })

      if (hotelRes.ok) {
        const { hotels } = await hotelRes.json()
        setHotelResults(hotels || [])
      } else {
        const { error: msg } = await hotelRes.json()
        setSearchError(msg || 'Hotel search failed')
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Hotel search failed')
    } finally {
      setSearchingHotels(false)
    }
  }

  async function handleSearchFlights() {
    if (!retreat) return
    setSearchStep('flights')
    await performFlightSearch(retreat, hotelBudgetPercent, flightBudgetPercent)
  }

  async function handleSearchHotels() {
    if (!retreat) return
    setSearchStep('hotels')
    await performHotelSearch(retreat, hotelBudgetPercent, flightBudgetPercent)
  }

  function handleBudgetChange(hotelPct: number) {
    setHotelBudgetPercent(hotelPct)
    setFlightBudgetPercent(100 - hotelPct)
    setBudgetTouched(true)

    if (!retreat || searchStep === 'idle') return

    // Debounce so slider drags don't flood the API
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchStep === 'hotels') {
        performHotelSearch(retreat, hotelPct, 100 - hotelPct)
      } else if (searchStep === 'flights') {
        performFlightSearch(retreat, hotelPct, 100 - hotelPct)
      }
    }, 700)
  }

  function addHotelToShortlist(hotel: HotelResult) {
    if (!retreat?.start_date || !retreat?.end_date) return
    const nights = Math.ceil((new Date(retreat.end_date).getTime() - new Date(retreat.start_date).getTime()) / 86400000)
    const rate = hotel.rate_per_night?.extracted_lowest ?? 0
    const id = Math.random().toString(36).slice(2)
    setShortlistHotels(prev => [...prev, { id, name: hotel.name, ratePerNight: rate, nights, totalCost: rate * nights, notes: '', property_token: hotel.property_token }])
  }

  function addFlightToShortlist(flight: FlightResult) {
    const id = Math.random().toString(36).slice(2)
    setShortlistFlights(prev => [...prev, { id, airline: flight.airline, flight_number: flight.flight_number, price: flight.price, total_duration: flight.total_duration, stops: flight.stops, departure_airport: flight.departure_airport, arrival_airport: flight.arrival_airport, notes: '' }])
  }

  function startEdit(id: string, type: 'hotel' | 'flight') {
    if (type === 'hotel') {
      const h = shortlistHotels.find(x => x.id === id)!
      setEditForm({ name: h.name, rate: String(h.ratePerNight), notes: h.notes })
    } else {
      const f = shortlistFlights.find(x => x.id === id)!
      setEditForm({ name: f.airline, rate: String(f.price), notes: f.notes })
    }
    setEditingId(id)
  }

  function saveEdit(id: string, type: 'hotel' | 'flight') {
    if (type === 'hotel') {
      setShortlistHotels(prev => prev.map(h => h.id !== id ? h : {
        ...h, name: editForm.name, ratePerNight: parseFloat(editForm.rate) || h.ratePerNight,
        totalCost: (parseFloat(editForm.rate) || h.ratePerNight) * h.nights, notes: editForm.notes,
      }))
    } else {
      setShortlistFlights(prev => prev.map(f => f.id !== id ? f : {
        ...f, airline: editForm.name, price: parseFloat(editForm.rate) || f.price, notes: editForm.notes,
      }))
    }
    setEditingId(null)
  }

  async function chooseHotel(h: ShortlistHotel) {
    if (!retreat) return
    setSaving(h.id)
    const supabase = createClient()
    const { error: err } = await supabase.from('vendors').insert({
      retreat_id: retreat.id, name: h.name, category: 'hotel',
      cost: h.totalCost, status: 'pending',
    })
    setSaving(null)
    if (err) { setError(err.message); return }
    setChosenHotelId(h.id)
  }

  async function chooseFlight(f: ShortlistFlight) {
    if (!retreat) return
    setSaving(f.id)
    const supabase = createClient()
    const { error: err } = await supabase.from('vendors').insert({
      retreat_id: retreat.id, name: `${f.airline} – ${f.flight_number}`, category: 'flights',
      cost: f.price, status: 'pending',
    })
    setSaving(null)
    if (err) { setError(err.message); return }
    setChosenFlightId(f.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm text-stone-600">Loading retreat...</p>
        </div>
      </div>
    )
  }

  if (!retreat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-stone-900 mb-2">Retreat not found</p>
          <Link href="/dashboard" className="text-emerald-600 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const hotelBudget = (retreat.budget * hotelBudgetPercent) / 100
  const flightBudget = (retreat.budget * flightBudgetPercent) / 100

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/retreat/${retreat.id}/planning`}
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 mb-4">
            <ArrowLeft size={14} /> Back
          </Link>
          <h1 className="text-3xl font-bold text-stone-900">{retreat.name}</h1>
          <p className="text-stone-600 mt-1">
            {retreat.destination} • {retreat.number_of_participants || '?'} participants • ${retreat.budget?.toLocaleString()}
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-800">{error}</p>
          </div>
        )}

        {searchError && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{searchError}</p>
          </div>
        )}

        {/* Budget allocator */}
        <BudgetAllocator
          totalBudget={retreat.budget}
          hotelPercent={hotelBudgetPercent}
          flightPercent={flightBudgetPercent}
          onHotelPercentChange={handleBudgetChange}
          hotelBudget={hotelBudget}
          flightBudget={flightBudget}
        />

        {/* Budget prompt */}
        {!budgetTouched && searchStep === 'idle' && (
          <div className="mt-6 bg-amber-50 ring-1 ring-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            Set your hotel and flight budget split above, then search.
          </div>
        )}

        {/* Search buttons */}
        <div className="flex gap-2 mt-6 mb-6">
          <button
            onClick={handleSearchFlights}
            disabled={searchingFlights}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
              searchStep === 'flights'
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            {searchingFlights ? 'Searching flights…' : 'Search Flights'}
          </button>
          <button
            onClick={handleSearchHotels}
            disabled={searchingHotels}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
              searchStep === 'hotels'
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            {searchingHotels ? 'Searching hotels…' : 'Search Hotels'}
          </button>
        </div>

        {/* Search results + shortlist */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Search results */}
          <div>
            {searchStep === 'hotels' ? (
              <HotelResults hotels={hotelResults} loading={searchingHotels} budget={hotelBudget} onSelect={addHotelToShortlist} />
            ) : searchStep === 'flights' ? (
              <FlightResults flights={flightResults} loading={searchingFlights} budget={flightBudget} onSelect={addFlightToShortlist} />
            ) : (
              <div className="bg-white rounded-xl ring-1 ring-stone-200 p-6 text-center text-sm text-stone-400">
                Set your budget split and click Search Flights or Search Hotels.
              </div>
            )}
          </div>

          {/* Right: Shortlist / comparing */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl ring-1 ring-stone-200 p-5">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Hotels I'm considering</p>

              {shortlistHotels.length === 0 ? (
                <p className="text-sm text-stone-400 py-4 text-center">Add hotels from search results to compare</p>
              ) : (
                <div className="space-y-3">
                  {shortlistHotels.map(h => (
                    <div key={h.id} className={`rounded-xl ring-1 p-3 transition ${chosenHotelId === h.id ? 'ring-emerald-400 bg-emerald-50' : 'ring-stone-200 bg-stone-50'}`}>
                      {editingId === h.id ? (
                        <div className="space-y-2">
                          <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full text-sm px-2 py-1.5 rounded-lg ring-1 ring-stone-200 outline-none focus:ring-emerald-400 bg-white" placeholder="Hotel name" />
                          <input value={editForm.rate} onChange={e => setEditForm(f => ({ ...f, rate: e.target.value }))}
                            type="number" className="w-full text-sm px-2 py-1.5 rounded-lg ring-1 ring-stone-200 outline-none focus:ring-emerald-400 bg-white" placeholder="Rate per night ($)" />
                          <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full text-sm px-2 py-1.5 rounded-lg ring-1 ring-stone-200 outline-none focus:ring-emerald-400 bg-white" placeholder="Notes (optional)" />
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(h.id, 'hotel')} className="flex items-center gap-1 text-xs font-semibold bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg"><Check size={11} /> Save</button>
                            <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-xs font-semibold bg-stone-200 text-stone-700 px-2.5 py-1.5 rounded-lg"><X size={11} /> Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-semibold text-stone-900 leading-snug">{h.name}</p>
                            {chosenHotelId === h.id && <CheckCircle2 size={16} className="text-emerald-600 shrink-0 ml-1" />}
                          </div>
                          <p className="text-xs text-stone-500">${h.ratePerNight}/night × {h.nights} nights = <strong>${h.totalCost.toLocaleString()}</strong></p>
                          {h.notes && <p className="text-xs text-stone-400 mt-1 italic">{h.notes}</p>}
                          <div className="flex gap-1.5 mt-2">
                            {chosenHotelId !== h.id && (
                              <button onClick={() => chooseHotel(h)} disabled={saving === h.id}
                                className="flex items-center gap-1 text-xs font-semibold bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition">
                                {saving === h.id ? '…' : <><Check size={11} /> Choose</>}
                              </button>
                            )}
                            <button onClick={() => startEdit(h.id, 'hotel')} className="flex items-center gap-1 text-xs font-semibold bg-white text-stone-600 ring-1 ring-stone-200 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 transition"><Pencil size={11} /> Edit</button>
                            <button onClick={() => setShortlistHotels(prev => prev.filter(x => x.id !== h.id))} className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 px-2 py-1.5 transition"><Trash2 size={11} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl ring-1 ring-stone-200 p-5">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Flights I'm considering</p>

              {shortlistFlights.length === 0 ? (
                <p className="text-sm text-stone-400 py-4 text-center">Add flights from search results to compare</p>
              ) : (
                <div className="space-y-3">
                  {shortlistFlights.map(f => (
                    <div key={f.id} className={`rounded-xl ring-1 p-3 transition ${chosenFlightId === f.id ? 'ring-emerald-400 bg-emerald-50' : 'ring-stone-200 bg-stone-50'}`}>
                      {editingId === f.id ? (
                        <div className="space-y-2">
                          <input value={editForm.notes} onChange={e => setEditForm(fm => ({ ...fm, notes: e.target.value }))}
                            className="w-full text-sm px-2 py-1.5 rounded-lg ring-1 ring-stone-200 outline-none focus:ring-emerald-400 bg-white" placeholder="Notes (optional)" />
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(f.id, 'flight')} className="flex items-center gap-1 text-xs font-semibold bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg"><Check size={11} /> Save</button>
                            <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-xs font-semibold bg-stone-200 text-stone-700 px-2.5 py-1.5 rounded-lg"><X size={11} /> Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-semibold text-stone-900">{f.airline} · {f.flight_number}</p>
                            {chosenFlightId === f.id && <CheckCircle2 size={16} className="text-emerald-600 shrink-0 ml-1" />}
                          </div>
                          <p className="text-xs text-stone-500">${f.price} · {f.stops === 0 ? 'Direct' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`} · {Math.floor(f.total_duration / 60)}h {f.total_duration % 60}m</p>
                          <p className="text-xs text-stone-400">{f.departure_airport.id} → {f.arrival_airport.id}</p>
                          {f.notes && <p className="text-xs text-stone-400 mt-1 italic">{f.notes}</p>}
                          <div className="flex gap-1.5 mt-2">
                            {chosenFlightId !== f.id && (
                              <button onClick={() => chooseFlight(f)} disabled={saving === f.id}
                                className="flex items-center gap-1 text-xs font-semibold bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition">
                                {saving === f.id ? '…' : <><Check size={11} /> Choose</>}
                              </button>
                            )}
                            <button onClick={() => startEdit(f.id, 'flight')} className="flex items-center gap-1 text-xs font-semibold bg-white text-stone-600 ring-1 ring-stone-200 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 transition"><Pencil size={11} /> Edit</button>
                            <button onClick={() => setShortlistFlights(prev => prev.filter(x => x.id !== f.id))} className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 px-2 py-1.5 transition"><Trash2 size={11} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(chosenHotelId || chosenFlightId) && (
              <Link href={`/retreat/${retreat.id}/vendors`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-xl hover:bg-emerald-800 transition">
                <CheckCircle2 size={14} /> Go to Vendors
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
