'use client'

import { FlightResult } from '@/types/booking'
import { Loader, Clock, MapPin } from 'lucide-react'

interface FlightResultsProps {
  flights: FlightResult[]
  loading: boolean
  budget: number
  onSelect: (flight: FlightResult) => void
}

export default function FlightResults({
  flights,
  loading,
  budget,
  onSelect,
}: FlightResultsProps) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-stone-200 p-5 h-full">
      <h3 className="font-semibold text-stone-900 mb-4">Flights</h3>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-stone-500">Searching flights...</p>
        </div>
      ) : flights.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-6">No flights found</p>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {flights.map((flight, i) => (
            <div
              key={i}
              className="border border-stone-200 rounded-lg p-3 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
              onClick={() => onSelect(flight)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-stone-900">{flight.airline}</h4>
                  <p className="text-xs text-stone-500">{flight.flight_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">${flight.price}</p>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs">
                  <MapPin size={12} className="text-stone-400 shrink-0" />
                  <span className="text-stone-700">{flight.departure_airport.name}</span>
                  <span className="text-stone-400">→</span>
                  <span className="text-stone-700">{flight.arrival_airport.name}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-stone-600">Depart: {flight.departure_airport.time}</span>
                  <span className="text-stone-600">Arrive: {flight.arrival_airport.time}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <Clock size={12} />
                  <span>{Math.floor(flight.duration / 60)}h {flight.duration % 60}m</span>
                </div>
              </div>

              <button
                onClick={e => {
                  e.stopPropagation()
                  onSelect(flight)
                }}
                className="w-full px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold rounded transition-colors"
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
