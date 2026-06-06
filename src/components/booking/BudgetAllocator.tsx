'use client'

interface BudgetAllocatorProps {
  totalBudget: number
  hotelPercent: number
  flightPercent: number
  onHotelPercentChange: (percent: number) => void
  hotelBudget: number
  flightBudget: number
}

export default function BudgetAllocator({
  totalBudget,
  hotelPercent,
  flightPercent,
  onHotelPercentChange,
  hotelBudget,
  flightBudget,
}: BudgetAllocatorProps) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-stone-200 p-6">
      <h2 className="text-lg font-semibold text-stone-900 mb-6">Budget Allocation</h2>

      <div className="space-y-6">
        {/* Total budget display */}
        <div className="flex justify-between items-center pb-4 border-b border-stone-200">
          <span className="text-sm font-medium text-stone-600">Total Budget</span>
          <span className="text-2xl font-bold text-emerald-600">${totalBudget.toLocaleString()}</span>
        </div>

        {/* Hotel slider */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-stone-700">Hotels</label>
            <div className="text-right">
              <div className="text-lg font-bold text-stone-900">${hotelBudget.toLocaleString()}</div>
              <div className="text-xs text-stone-500">{hotelPercent}% of total</div>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={hotelPercent}
            onChange={e => onHotelPercentChange(parseInt(e.target.value))}
            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        {/* Flight slider */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-stone-700">Flights</label>
            <div className="text-right">
              <div className="text-lg font-bold text-stone-900">${flightBudget.toLocaleString()}</div>
              <div className="text-xs text-stone-500">{flightPercent}% of total</div>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={flightPercent}
            onChange={e => {
              const percent = parseInt(e.target.value)
              onHotelPercentChange(100 - percent)
            }}
            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>
    </div>
  )
}
