'use client'

import { DESTINATIONS } from '@/lib/destinations'

interface DestinationSelectorProps {
  value: string
  onChange: (value: string) => void
}

export default function DestinationSelector({ value, onChange }: DestinationSelectorProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      required
      className="w-full text-sm bg-white rounded-lg px-3 py-2.5 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition"
    >
      <option value="">Select a destination *</option>
      {DESTINATIONS.map(dest => (
        <option key={dest.value} value={dest.value}>
          {dest.label}
        </option>
      ))}
    </select>
  )
}
