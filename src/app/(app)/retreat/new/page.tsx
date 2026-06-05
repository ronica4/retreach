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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">New retreat</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Retreat name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            required
            placeholder="e.g. Q3 Leadership Offsite 2026"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
          <input
            type="text"
            value={form.destination}
            onChange={e => update('destination', e.target.value)}
            required
            placeholder="e.g. Sedona, Arizona"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Concept / theme</label>
          <textarea
            value={form.concept}
            onChange={e => update('concept', e.target.value)}
            rows={2}
            placeholder="e.g. Team bonding focused on outdoor adventure and strategic planning"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start date *</label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => update('start_date', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End date *</label>
            <input
              type="date"
              value={form.end_date}
              onChange={e => update('end_date', e.target.value)}
              required
              min={form.start_date}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total budget (USD) *</label>
          <input
            type="number"
            value={form.budget}
            onChange={e => update('budget', e.target.value)}
            required
            min="0"
            step="100"
            placeholder="50000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create retreat'}
          </button>
        </div>
      </form>
    </div>
  )
}
