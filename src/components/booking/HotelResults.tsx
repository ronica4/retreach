'use client'

import { HotelResult } from '@/types/booking'
import { Loader, Star } from 'lucide-react'

interface HotelResultsProps {
  hotels: HotelResult[]
  loading: boolean
  budget: number
  onSelect: (hotel: HotelResult) => void
}

export default function HotelResults({ hotels, loading, budget, onSelect }: HotelResultsProps) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-stone-200 p-5 h-full">
      <h3 className="font-semibold text-stone-900 mb-4">Hotels</h3>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-stone-500">Searching hotels...</p>
        </div>
      ) : hotels.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-6">No hotels found</p>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {hotels.map((hotel, i) => {
            const rate = hotel.rate_per_night?.extracted_lowest ?? 0
            const img  = hotel.images?.[0]?.thumbnail
            return (
              <div key={i}
                className="border border-stone-200 rounded-lg p-3 hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer"
                onClick={() => onSelect(hotel)}>
                <div className="flex gap-3 mb-2">
                  {img && <img src={img} alt={hotel.name} className="w-16 h-16 rounded object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-stone-900 leading-snug">{hotel.name}</h4>
                    {hotel.overall_rating > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold text-stone-700">{hotel.overall_rating.toFixed(1)}</span>
                        <span className="text-xs text-stone-400">({hotel.reviews} reviews)</span>
                      </div>
                    )}
                    <p className="text-xs text-stone-400 capitalize mt-0.5">{hotel.type}</p>
                  </div>
                </div>

                {hotel.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {hotel.amenities.slice(0, 4).map(a => (
                      <span key={a} className="text-[11px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">{a}</span>
                    ))}
                    {hotel.amenities.length > 4 && (
                      <span className="text-[11px] text-stone-400">+{hotel.amenities.length - 4} more</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-emerald-600">${rate}</p>
                    <p className="text-xs text-stone-500">per night{rate > budget / 4 ? ' · over budget' : ''}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); onSelect(hotel) }}
                    className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-semibold rounded transition-colors">
                    Add
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
