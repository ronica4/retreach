'use client'

import { HotelResult } from '@/types/booking'
import { Loader, ExternalLink, Star, Wifi } from 'lucide-react'

interface HotelResultsProps {
  hotels: HotelResult[]
  loading: boolean
  budget: number
  onSelect: (hotel: HotelResult) => void
}

export default function HotelResults({
  hotels,
  loading,
  budget,
  onSelect,
}: HotelResultsProps) {
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
          {hotels.map(hotel => (
            <div
              key={hotel.hotelId}
              className="border border-stone-200 rounded-lg p-3 hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer"
              onClick={() => onSelect(hotel)}
            >
              <div className="flex gap-3 mb-2">
                {hotel.imageURL && (
                  <img
                    src={hotel.imageURL}
                    alt={hotel.hotelName}
                    className="w-16 h-16 rounded object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-stone-900 truncate">{hotel.hotelName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.floor(hotel.starRating) }).map((_, i) => (
                        <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-stone-500">{hotel.reviewScore}/10</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-2 text-xs">
                {hotel.freeWifi && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[11px] font-medium">
                    <Wifi size={10} /> WiFi
                  </span>
                )}
                {hotel.includeBreakfast && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[11px] font-medium">
                    Breakfast
                  </span>
                )}
                {hotel.discountPercentage > 0 && (
                  <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded text-[11px] font-medium">
                    {hotel.discountPercentage}% off
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-emerald-600">${hotel.dailyRate.toFixed(2)}</p>
                  <p className="text-xs text-stone-500">per night</p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onSelect(hotel)
                  }}
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-semibold rounded transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
