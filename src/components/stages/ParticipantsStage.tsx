'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Participant } from '@/types'
import { Plus, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  retreat: Retreat
  participants: Participant[]
}

const inputCls = 'w-full px-2.5 py-2 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-0.5 block'

const PAY_CONFIG = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700',     Icon: Clock },
  unpaid:  { label: 'Unpaid',  cls: 'bg-stone-100 text-stone-500',     Icon: XCircle },
}

export default function ParticipantsStage({ retreat, participants }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', food_preferences: '', notes: '' })

  function update(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const supabase = createClient()
    await supabase.from('participants').insert({
      retreat_id: retreat.id, name: form.name, email: form.email,
      phone: form.phone || null, food_preferences: form.food_preferences || null, notes: form.notes || null,
    })
    setShowForm(false); setForm({ name: '', email: '', phone: '', food_preferences: '', notes: '' })
    setLoading(false); router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('participants').delete().eq('id', id)
    router.refresh()
  }

  async function cyclePayment(p: Participant) {
    const next: Participant['payment_status'] = p.payment_status === 'unpaid' ? 'partial' : p.payment_status === 'partial' ? 'paid' : 'unpaid'
    const supabase = createClient()
    await supabase.from('participants').update({ payment_status: next }).eq('id', p.id)
    router.refresh()
  }

  const paid    = participants.filter(p => p.payment_status === 'paid').length
  const partial = participants.filter(p => p.payment_status === 'partial').length
  const unpaid  = participants.filter(p => p.payment_status === 'unpaid').length

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Participants</h1>
          <p className="text-sm text-stone-400 mt-0.5">{participants.length} registered</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-sm"
        >
          <Plus size={14} /> Add guest
        </button>
      </div>

      {/* Payment summary */}
      {participants.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{paid}</p>
            <p className="text-xs text-stone-400 mt-0.5">Paid</p>
          </div>
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{partial}</p>
            <p className="text-xs text-stone-400 mt-0.5">Partial</p>
          </div>
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-stone-500">{unpaid}</p>
            <p className="text-xs text-stone-400 mt-0.5">Unpaid</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-5 space-y-3 mb-4">
          <h3 className="text-sm font-semibold text-stone-900">Register guest</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Full name *</label>
              <input required value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Email *</label>
              <input required type="email" value={form.email} onChange={e => update('email', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={e => update('phone', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Dietary needs</label>
              <input value={form.food_preferences} onChange={e => update('food_preferences', e.target.value)}
                placeholder="vegetarian, no nuts…" className={inputCls} /></div>
            <div className="col-span-2"><label className={labelCls}>Notes</label>
              <input value={form.notes} onChange={e => update('notes', e.target.value)} className={inputCls} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200 rounded-lg hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50">
              {loading ? 'Adding…' : 'Register'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {participants.map(p => {
          const { label, cls, Icon } = PAY_CONFIG[p.payment_status]
          return (
            <div key={p.id} className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 flex items-center justify-between group hover:ring-stone-300 transition-all">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900">{p.name}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {p.email}
                  {p.food_preferences && <span className="ml-2 text-amber-600">· {p.food_preferences}</span>}
                  {p.notes && <span className="ml-2 text-stone-300">· {p.notes}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => cyclePayment(p)}
                  className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors hover:opacity-80', cls)}
                  title="Click to cycle payment status"
                >
                  <Icon size={11} /> {label}
                </button>
                <button onClick={() => handleDelete(p.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
        {participants.length === 0 && (
          <div className="text-center py-14 text-stone-400">
            <p className="text-sm">No guests registered yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
