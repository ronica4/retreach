'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Participant } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  retreat: Retreat
  participants: Participant[]
}

export default function ParticipantSection({ retreat, participants }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', food_preferences: '', notes: '',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('participants').insert({
      retreat_id: retreat.id,
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      food_preferences: form.food_preferences || null,
      notes: form.notes || null,
    })
    setShowForm(false)
    setForm({ name: '', email: '', phone: '', food_preferences: '', notes: '' })
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('participants').delete().eq('id', id)
    router.refresh()
  }

  async function updatePayment(id: string, status: Participant['payment_status']) {
    const supabase = createClient()
    await supabase.from('participants').update({ payment_status: status }).eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{participants.length} participants</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={12} /> Add participant
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-0.5 block">Name *</label>
              <input required value={form.name} onChange={e => update('name', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-0.5 block">Email *</label>
              <input required type="email" value={form.email} onChange={e => update('email', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-0.5 block">Phone</label>
              <input value={form.phone} onChange={e => update('phone', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-0.5 block">Food preferences</label>
              <input value={form.food_preferences} onChange={e => update('food_preferences', e.target.value)}
                placeholder="e.g. vegetarian, no nuts"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-0.5 block">Notes</label>
              <input value={form.notes} onChange={e => update('notes', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Adding...' : 'Add'}</button>
          </div>
        </form>
      )}

      <div className="space-y-1.5">
        {participants.map(p => (
          <div key={p.id} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg group hover:border-gray-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-gray-900">{p.name}</p>
              <p className="text-xs text-gray-400">{p.email}{p.food_preferences ? ` · ${p.food_preferences}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={p.payment_status}
                onChange={e => updatePayment(p.id, e.target.value as Participant['payment_status'])}
                className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer focus:outline-none ${
                  p.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                  p.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}
              >
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
              <button onClick={() => handleDelete(p.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        {participants.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No participants yet.</p>
        )}
      </div>
    </div>
  )
}
