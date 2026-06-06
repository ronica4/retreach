'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CityOption {
  city_name: string
}

interface DestinationSelectorProps {
  value: string
  onChange: (value: string) => void
}

export default function DestinationSelector({ value, onChange }: DestinationSelectorProps) {
  const [cities, setCities] = useState<CityOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCities() {
      const supabase = createClient()
      const { data } = await supabase
        .from('agoda_city_ids')
        .select('city_name')
        .order('city_name')

      setCities(data || [])
      setLoading(false)
    }

    loadCities()
  }, [])

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={loading}
      required
      className="w-full text-sm bg-white rounded-lg px-3 py-2.5 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition"
    >
      <option value="">
        {loading ? 'Loading destinations...' : 'Select a destination *'}
      </option>
      {cities.map(city => (
        <option key={city.city_name} value={city.city_name}>
          {city.city_name}
        </option>
      ))}
    </select>
  )
}
