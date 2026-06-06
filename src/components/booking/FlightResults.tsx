'use client'

import { FlightResult } from '@/types/booking'
import { Loader, Clock, PlaneTakeoff, SearchX } from 'lucide-react'

interface FlightResultsProps {
  flights: FlightResult[]
  loading: boolean
  budget: number
  onSelect: (flight: FlightResult) => void
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export default function FlightResults({ flights, loading, budget, onSelect }: FlightResultsProps) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-stone-200 p-5 h-full">
      <h3 className="font-semibold text-stone-900 mb-4">Flights</h3>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-stone-500">Searching flights...</p>
        </div>
      ) : flights.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <SearchX size={28} className="text-stone-300" />
          <p className="text-sm font-semibold text-stone-600">No flights found</p>
          <p className="text-xs text-stone-400 max-w-[180px]">Try adjusting your travel dates or searching a nearby airport.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {flights.map((flight, i) => (
            <div
              key={i}
              className="border border-stone-200 rounded-lg p-3 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
              onClick={() => onSelect(flight)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {flight.airline_logo && (
                    <img src={flight.airline_logo} alt={flight.airline} className="w-6 h-6 object-contain" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{flight.airline}</p>
                    <p className="text-xs text-stone-500">{flight.flight_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">${flight.price}</p>
                  {flight.price > budget && (
                    <p className="text-xs text-rose-500">Over budget</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-stone-700 mb-1">
                <span>{flight.departure_airport.id}</span>
                <span className="text-stone-400">{flight.departure_airport.time.slice(11)}</span>
                <PlaneTakeoff size={11} className="text-stone-400 mx-0.5" />
                <span>{flight.arrival_airport.id}</span>
                <span className="text-stone-400">{flight.arrival_airport.time.slice(11)}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {formatDuration(flight.total_duration)}
                </span>
                <span>{flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
              </div>

              <button
                onClick={e => { e.stopPropagation(); onSelect(flight) }}
                className="mt-2 w-full px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold rounded transition-colors"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
