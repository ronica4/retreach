'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Retreat } from '@/types'
import { ProvisionalHotel, ProvisionalFlight, HotelResult, FlightResult } from '@/types/booking'
import BudgetAllocator from '@/components/booking/BudgetAllocator'
import HotelResults from '@/components/booking/HotelResults'
import FlightResults from '@/components/booking/FlightResults'
import { ArrowLeft, Loader, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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

  const [provisionalSelections, setProvisionalSelections] = useState<{
    hotels: ProvisionalHotel[]
    flights: ProvisionalFlight[]
  }>({
    hotels: [],
    flights: [],
  })

  const [confirmingSelections, setConfirmingSelections] = useState(false)

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

      // Auto-search if data available
      if (data.start_date && data.end_date) {
        await performSearch(data, 60, 40)
      }
    }

    loadRetreat()
  }, [retreatId, router])

  async function performSearch(r: Retreat, hotelPct: number, flightPct: number) {
    if (!r.start_date || !r.end_date || !r.destination || !r.budget) {
      setSearchError('Missing retreat details')
      return
    }

    setSearchingHotels(true)
    setSearchingFlights(true)
    setSearchError(null)

    try {
      // Calculate nights
      const checkIn = new Date(r.start_date)
      const checkOut = new Date(r.end_date)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

      const hotelBudget = (r.budget * hotelPct) / 100
      const maxDailyRate = hotelBudget / nights

      // Search hotels
      const hotelRes = await fetch('/api/search/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retreatId: r.id,
          destination: r.destination,
          checkInDate: r.start_date,
          checkOutDate: r.end_date,
          numberOfAdult: r.number_of_participants || 2,
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
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearchingHotels(false)
    }

    try {
      // Search flights
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
        const { flights } = await flightRes.json()
        setFlightResults(flights || [])
      } else {
        const { error: msg } = await flightRes.json()
        setSearchError(msg || 'Flight search failed')
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearchingFlights(false)
    }
  }

  function handleBudgetChange(hotelPct: number) {
    setHotelBudgetPercent(hotelPct)
    setFlightBudgetPercent(100 - hotelPct)
    if (retreat) performSearch(retreat, hotelPct, 100 - hotelPct)
  }

  function addProvisionalHotel(hotel: HotelResult) {
    if (!retreat || !retreat.start_date || !retreat.end_date) return

    const checkIn = new Date(retreat.start_date)
    const checkOut = new Date(retreat.end_date)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

    const provisional: ProvisionalHotel = {
      ...hotel,
      nights,
      totalCost: hotel.dailyRate * nights,
    }

    setProvisionalSelections(prev => ({
      ...prev,
      hotels: [...prev.hotels, provisional],
    }))
  }

  function addProvisionalFlight(flight: FlightResult) {
    const provisional: ProvisionalFlight = {
      ...flight,
      id: Math.random().toString(36),
    }

    setProvisionalSelections(prev => ({
      ...prev,
      flights: [...prev.flights, provisional],
    }))
  }

  function removeProvisionalHotel(hotelId: number) {
    setProvisionalSelections(prev => ({
      ...prev,
      hotels: prev.hotels.filter(h => h.hotelId !== hotelId),
    }))
  }

  function removeProvisionalFlight(flightId: string) {
    setProvisionalSelections(prev => ({
      ...prev,
      flights: prev.flights.filter(f => f.id !== flightId),
    }))
  }

  async function confirmSelections() {
    if (!retreat) return

    setConfirmingSelections(true)
    try {
      const supabase = createClient()

      // Create vendor records for hotels
      for (const hotel of provisionalSelections.hotels) {
        await supabase.from('vendors').insert({
          retreat_id: retreat.id,
          name: hotel.hotelName,
          category: 'hotel',
          cost: hotel.totalCost,
          contact_email: null,
          contact_phone: null,
          status: 'pending',
        })
      }

      // Create vendor records for flights
      for (const flight of provisionalSelections.flights) {
        await supabase.from('vendors').insert({
          retreat_id: retreat.id,
          name: `${flight.airline} Flight`,
          category: 'flights',
          cost: flight.price,
          contact_email: null,
          contact_phone: null,
          status: 'pending',
        })
      }

      // Redirect to vendors stage
      router.push(`/retreat/${retreat.id}/vendors`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm selections')
    } finally {
      setConfirmingSelections(false)
    }
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
  const totalProvisionalCost =
    provisionalSelections.hotels.reduce((sum, h) => sum + h.totalCost, 0) +
    provisionalSelections.flights.reduce((sum, f) => sum + f.price, 0)

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

        {/* Search results and selections */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          {/* Left: Hotel Results */}
          <div className="col-span-1">
            <HotelResults
              hotels={hotelResults}
              loading={searchingHotels}
              budget={hotelBudget}
              onSelect={addProvisionalHotel}
            />
          </div>

          {/* Center: Provisional selections */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl ring-1 ring-stone-200 p-5">
              <h3 className="font-semibold text-stone-900 mb-4">Selected</h3>

              {provisionalSelections.hotels.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Hotels</p>
                  {provisionalSelections.hotels.map(h => (
                    <div key={h.hotelId} className="flex justify-between items-start mb-2 pb-2 border-b border-stone-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900 truncate">{h.hotelName}</p>
                        <p className="text-xs text-stone-500">${h.dailyRate}/night × {h.nights} nights</p>
                      </div>
                      <button
                        onClick={() => removeProvisionalHotel(h.hotelId)}
                        className="text-xs text-rose-600 hover:text-rose-700 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {provisionalSelections.flights.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Flights</p>
                  {provisionalSelections.flights.map(f => (
                    <div key={f.id} className="flex justify-between items-start mb-2 pb-2 border-b border-stone-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900 truncate">{f.airline}</p>
                        <p className="text-xs text-stone-500">${f.price}</p>
                      </div>
                      <button
                        onClick={() => removeProvisionalFlight(f.id)}
                        className="text-xs text-rose-600 hover:text-rose-700 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {provisionalSelections.hotels.length === 0 && provisionalSelections.flights.length === 0 && (
                <p className="text-sm text-stone-500 text-center py-6">No selections yet</p>
              )}

              {(provisionalSelections.hotels.length > 0 || provisionalSelections.flights.length > 0) && (
                <div className="mt-4 pt-4 border-t border-stone-200">
                  <div className="flex justify-between mb-4">
                    <span className="text-sm font-semibold text-stone-900">Total:</span>
                    <span className="text-sm font-bold text-emerald-600">${totalProvisionalCost.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={confirmSelections}
                    disabled={confirmingSelections}
                    className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {confirmingSelections ? 'Confirming...' : 'Confirm & Continue'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Flight Results */}
          <div className="col-span-1">
            <FlightResults
              flights={flightResults}
              loading={searchingFlights}
              budget={flightBudget}
              onSelect={addProvisionalFlight}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
