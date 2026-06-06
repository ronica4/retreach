'use client'

import { useState } from 'react'
import { type Vendor } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Star } from 'lucide-react'

interface Props {
  vendors: Vendor[]
}

export default function ReviewsStage({ vendors }: Props) {
  const [local, setLocal] = useState(vendors)
  const [saving, setSaving] = useState<string | null>(null)

  const rated = local.filter(v => v.rating !== null).length

  async function saveRating(id: string, rating: number, notes: string) {
    setSaving(id)
    const supabase = createClient()
    await supabase.from('vendors').update({ rating, rating_notes: notes }).eq('id', id)
    setLocal(prev => prev.map(v => v.id === id ? { ...v, rating, rating_notes: notes } : v))
    setSaving(null)
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-stone-900">Vendor reviews</h1>
        <p className="text-sm text-stone-400 mt-0.5">{rated}/{vendors.length} rated</p>
      </div>

      {vendors.length === 0 ? (
        <div className="text-center py-14 text-stone-400">
          <Star size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No vendors to review yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {local.map(vendor => (
            <VendorRatingCard
              key={vendor.id}
              vendor={vendor}
              saving={saving === vendor.id}
              onSave={(r, n) => saveRating(vendor.id, r, n)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function VendorRatingCard({
  vendor, saving, onSave,
}: {
  vendor: Vendor
  saving: boolean
  onSave: (rating: number, notes: string) => void
}) {
  const [rating,  setRating]  = useState(vendor.rating ?? 0)
  const [hovered, setHovered] = useState(0)
  const [notes,   setNotes]   = useState(vendor.rating_notes ?? '')
  const [editing, setEditing] = useState(false)

  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">{vendor.name}</p>
          <p className="text-xs text-stone-400 capitalize mt-0.5">{vendor.category}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => { setRating(star); setEditing(true) }}
              className="hover:scale-110 transition-transform"
            >
              <Star
                size={20}
                className={star <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}
              />
            </button>
          ))}
        </div>
      </div>

      {(editing || rating > 0) && (
        <div className="flex gap-2">
          <input
            type="text"
            value={notes}
            onChange={e => { setNotes(e.target.value); setEditing(true) }}
            placeholder="Notes (optional)…"
            className="flex-1 text-sm px-2.5 py-2 bg-stone-50 ring-1 ring-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
          />
          {editing && (
            <button
              onClick={() => { onSave(rating, notes); setEditing(false) }}
              disabled={saving}
              className="px-3 py-2 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors"
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      )}

      {!editing && rating === 0 && (
        <p className="text-xs text-stone-400">Click stars to rate</p>
      )}
    </div>
  )
}
