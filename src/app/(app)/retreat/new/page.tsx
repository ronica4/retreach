'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getRetreatStage } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewRetreatPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    destination: '',
    concept: '',
    start_date: '',
    end_date: '',
    budget: '',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error } = await supabase
      .from('retreats')
      .insert({
        manager_id: user.id,
        name: form.name,
        destination: form.destination,
        concept: form.concept || null,
        start_date: form.start_date,
        end_date: form.end_date,
        budget: parseFloat(form.budget) || 0,
      })
      .select()
      .single()

    if (error || !data) {
      setError(error?.message ?? 'Failed to create retreat')
      setLoading(false)
      return
    }

    const stage = getRetreatStage(data)
    router.push(`/retreat/${data.id}/${stage}`)
  }

  const inputCls = 'w-full text-sm bg-white rounded-lg px-3 py-2.5 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
  const labelCls = 'block text-xs font-semibold text-stone-400 mb-1'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 transition-colors">
          <ArrowLeft size={15} />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 mt-3">New retreat</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl ring-1 ring-stone-200 card p-6 space-y-5">
        <div>
          <label className={labelCls}>Retreat name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            required
            placeholder="e.g. Q3 Leadership Offsite 2026"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Destination *</label>
          <input
            type="text"
            value={form.destination}
            onChange={e => update('destination', e.target.value)}
            required
            placeholder="e.g. Sedona, Arizona"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Concept / theme</label>
          <textarea
            value={form.concept}
            onChange={e => update('concept', e.target.value)}
            rows={2}
            placeholder="e.g. Team bonding focused on outdoor adventure and strategic planning"
            className={inputCls + ' resize-none'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Start date *</label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => update('start_date', e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End date *</label>
            <input
              type="date"
              value={form.end_date}
              onChange={e => update('end_date', e.target.value)}
              required
              min={form.start_date}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Total budget (USD) *</label>
          <input
            type="number"
            value={form.budget}
            onChange={e => update('budget', e.target.value)}
            required
            min="0"
            step="100"
            placeholder="50000"
            className={inputCls}
          />
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg ring-1 ring-rose-200">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-stone-600 bg-white ring-1 ring-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Creating…' : 'Create retreat'}
          </button>
        </div>
      </form>
    </div>
  )
}
