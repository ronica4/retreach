'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Response {
  id: string
  name: string
  nps: number
  loved: string
  improve: string
  date: string
}

interface Props {
  retreatId: string
}

const LS_KEY = (id: string) => `retreach_feedback_${id}`

const NPS_LABEL = (n: number) => n >= 9 ? 'Promoter' : n >= 7 ? 'Passive' : 'Detractor'
const NPS_COLOR = (n: number) => n >= 9 ? 'text-emerald-700 bg-emerald-100' : n >= 7 ? 'text-amber-700 bg-amber-100' : 'text-rose-600 bg-rose-100'

export default function FeedbackStage({ retreatId }: Props) {
  const [responses, setResponses] = useState<Response[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', nps: 8, loved: '', improve: '' })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY(retreatId))
      if (saved) setResponses(JSON.parse(saved))
    } catch { /* */ }
  }, [retreatId])

  function save(updated: Response[]) {
    setResponses(updated)
    localStorage.setItem(LS_KEY(retreatId), JSON.stringify(updated))
  }

  function addResponse(e: React.FormEvent) {
    e.preventDefault()
    const r: Response = {
      id: Date.now().toString(), name: form.name,
      nps: form.nps, loved: form.loved, improve: form.improve,
      date: new Date().toISOString().split('T')[0],
    }
    save([...responses, r])
    setForm({ name: '', nps: 8, loved: '', improve: '' })
    setShowForm(false)
  }

  function deleteResponse(id: string) { save(responses.filter(r => r.id !== id)) }

  const avg = responses.length > 0 ? Math.round(responses.reduce((s, r) => s + r.nps, 0) / responses.length * 10) / 10 : null
  const promoters  = responses.filter(r => r.nps >= 9).length
  const passives   = responses.filter(r => r.nps >= 7 && r.nps < 9).length
  const detractors = responses.filter(r => r.nps < 7).length
  const npsScore   = responses.length > 0 ? Math.round(((promoters - detractors) / responses.length) * 100) : null

  const inputCls = 'w-full px-2.5 py-2 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
  const labelCls = 'text-xs font-semibold text-stone-400 mb-0.5 block'

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Guest Feedback</h1>
          <p className="text-sm text-stone-400 mt-0.5">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors shadow-sm"
        >
          <Plus size={14} /> Log response
        </button>
      </div>

      {/* NPS summary */}
      {responses.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-stone-900">{npsScore !== null ? (npsScore > 0 ? '+' : '') + npsScore : '—'}</p>
            <p className="text-xs text-stone-400 mt-0.5">NPS Score</p>
          </div>
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-stone-900">{avg ?? '—'}</p>
            <p className="text-xs text-stone-400 mt-0.5">Avg score</p>
          </div>
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{promoters}</p>
            <p className="text-xs text-stone-400 mt-0.5">Promoters</p>
          </div>
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-rose-600">{detractors}</p>
            <p className="text-xs text-stone-400 mt-0.5">Detractors</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={addResponse} className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-5 space-y-4 mb-5 fade-up">
          <div><label className={labelCls}>Guest name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
          <div>
            <label className={labelCls}>NPS — How likely to recommend? (0–10)</label>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} type="button" onClick={() => setForm(f => ({ ...f, nps: i }))}
                  className={cn('w-9 h-9 text-sm font-semibold rounded-lg ring-1 transition-colors',
                    form.nps === i
                      ? (i >= 9 ? 'bg-emerald-700 text-white ring-emerald-700' : i >= 7 ? 'bg-amber-500 text-white ring-amber-500' : 'bg-rose-500 text-white ring-rose-500')
                      : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300'
                  )}>
                  {i}
                </button>
              ))}
            </div>
            <p className={cn('text-xs font-semibold mt-1.5', form.nps >= 9 ? 'text-emerald-700' : form.nps >= 7 ? 'text-amber-600' : 'text-rose-600')}>
              {NPS_LABEL(form.nps)}
            </p>
          </div>
          <div><label className={labelCls}>What they loved</label>
            <textarea value={form.loved} onChange={e => setForm(f => ({ ...f, loved: e.target.value }))} rows={2} className={inputCls + ' resize-none'} /></div>
          <div><label className={labelCls}>What to improve</label>
            <textarea value={form.improve} onChange={e => setForm(f => ({ ...f, improve: e.target.value }))} rows={2} className={inputCls + ' resize-none'} /></div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200 rounded-lg hover:bg-stone-50">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800">Save</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {responses.map(r => (
          <div key={r.id} className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5 group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-stone-900">{r.name}</p>
                <p className="text-xs text-stone-400">{r.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold rounded-full px-2.5 py-1', NPS_COLOR(r.nps))}>{r.nps}/10</span>
                <button onClick={() => deleteResponse(r.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {r.loved && <div className="mb-2"><p className="text-xs font-semibold text-stone-400 mb-0.5">Loved</p><p className="text-sm text-stone-700">{r.loved}</p></div>}
            {r.improve && <div><p className="text-xs font-semibold text-stone-400 mb-0.5">Improve</p><p className="text-sm text-stone-700">{r.improve}</p></div>}
          </div>
        ))}
        {responses.length === 0 && !showForm && (
          <div className="text-center py-14 text-stone-400">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No feedback logged yet. Start collecting responses.</p>
          </div>
        )}
      </div>
    </div>
  )
}
