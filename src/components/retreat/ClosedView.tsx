'use client'

import { useState } from 'react'
import { type Retreat, type Vendor, type Participant } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Star } from 'lucide-react'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
}

export default function ClosedView({ retreat, vendors, participants }: Props) {
  const [localVendors, setLocalVendors] = useState(vendors)
  const [saving, setSaving] = useState<string | null>(null)

  const paid       = participants.filter(p => p.payment_status === 'paid').length
  const totalSpend = localVendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const ratedVendors = localVendors.filter(v => v.rating !== null)

  async function saveRating(vendorId: string, rating: number, notes: string) {
    setSaving(vendorId)
    const supabase = createClient()
    await supabase.from('vendors').update({ rating, rating_notes: notes }).eq('id', vendorId)
    setLocalVendors(prev => prev.map(v => v.id === vendorId ? { ...v, rating, rating_notes: notes } : v))
    setSaving(null)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
          <p className="text-2xl font-bold text-stone-900">{participants.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Participants</p>
        </div>
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
          <p className="text-2xl font-bold text-stone-900">{paid}/{participants.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Payments collected</p>
        </div>
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
          <p className="text-2xl font-bold text-stone-900">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-stone-400 mt-0.5">Total spent</p>
          <p className="text-xs text-emerald-600 mt-0.5">{formatCurrency(retreat.budget - totalSpend)} under budget</p>
        </div>
      </div>

      <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-900">Vendor ratings</h2>
          <p className="text-xs text-stone-400 mt-0.5">{ratedVendors.length}/{vendors.length} rated · Used to improve future suggestions</p>
        </div>
        <div className="divide-y divide-stone-100">
          {localVendors.map(vendor => (
            <VendorRatingRow
              key={vendor.id}
              vendor={vendor}
              saving={saving === vendor.id}
              onSave={(rating, notes) => saveRating(vendor.id, rating, notes)}
            />
          ))}
          {vendors.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-8">No vendors to rate.</p>
          )}
        </div>
      </div>

      <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-900">Participant payments</h2>
        </div>
        <div className="divide-y divide-stone-100">
          {participants.map(p => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900">{p.name}</p>
                <p className="text-xs text-stone-400">{p.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                p.payment_status === 'paid'    ? 'bg-emerald-100 text-emerald-700' :
                p.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                'bg-stone-100 text-stone-500'
              }`}>
                {p.payment_status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VendorRatingRow({
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

  function handleStarClick(val: number) {
    setRating(val)
    setEditing(true)
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-stone-900">{vendor.name}</p>
          <p className="text-xs text-stone-400 capitalize">{vendor.category}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => handleStarClick(star)}
              className="text-stone-300 hover:scale-110 transition-transform"
            >
              <Star
                size={18}
                className={star <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : ''}
              />
            </button>
          ))}
        </div>
      </div>

      {(editing || rating > 0) && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={notes}
            onChange={e => { setNotes(e.target.value); setEditing(true) }}
            placeholder="Notes (optional)…"
            className="flex-1 px-2 py-1 text-xs bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition"
          />
          {editing && (
            <button
              onClick={() => { onSave(rating, notes); setEditing(false) }}
              disabled={saving}
              className="px-2 py-1 text-xs bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
