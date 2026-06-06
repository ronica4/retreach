'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, MessageSquare, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react'
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

// Simple theme extraction — top recurring phrases in loved/improve text
function extractThemes(texts: string[], stopwords = new Set(['the','a','and','to','in','of','was','it','for','this','that','with','we','i','very','so','our'])) {
  const freq: Record<string, number> = {}
  texts.join(' ').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
    if (w.length > 3 && !stopwords.has(w)) freq[w] = (freq[w] ?? 0) + 1
  })
  return Object.entries(freq).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w)
}

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

  const promoters  = responses.filter(r => r.nps >= 9).length
  const passives   = responses.filter(r => r.nps >= 7 && r.nps < 9).length
  const detractors = responses.filter(r => r.nps < 7).length
  const npsScore   = responses.length > 0 ? Math.round(((promoters - detractors) / responses.length) * 100) : null
  const avg        = responses.length > 0 ? Math.round(responses.reduce((s, r) => s + r.nps, 0) / responses.length * 10) / 10 : null

  const lovedThemes   = useMemo(() => extractThemes(responses.map(r => r.loved).filter(Boolean)), [responses])
  const improveThemes = useMemo(() => extractThemes(responses.map(r => r.improve).filter(Boolean)), [responses])

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

      {/* NPS summary stats */}
      {responses.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mb-5">
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 text-center col-span-2">
            <p className={cn('text-3xl font-bold tabular-nums', npsScore != null && npsScore > 30 ? 'text-emerald-700' : npsScore != null && npsScore < 0 ? 'text-rose-600' : 'text-stone-900')}>
              {npsScore !== null ? (npsScore > 0 ? '+' : '') + npsScore : '—'}
            </p>
            <p className="text-xs text-stone-400 mt-0.5 font-medium">NPS Score</p>
          </div>
          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-stone-900">{avg ?? '—'}</p>
            <p className="text-xs text-stone-400 mt-0.5">Avg</p>
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

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* responses list */}
        <div className="space-y-3">
          {responses.map(r => (
            <div key={r.id} className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5 group fade-up">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{r.name}</p>
                  <p className="text-xs text-stone-400">{r.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold rounded-full px-2.5 py-1', NPS_COLOR(r.nps))}>{r.nps}/10</span>
                  <span className="text-xs font-semibold text-stone-400">{NPS_LABEL(r.nps)}</span>
                  <button onClick={() => deleteResponse(r.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {r.loved && <div className="mb-2"><p className="text-xs font-semibold text-emerald-600 mb-0.5 flex items-center gap-1"><TrendingUp size={10} /> Loved</p><p className="text-sm text-stone-700">{r.loved}</p></div>}
              {r.improve && <div><p className="text-xs font-semibold text-amber-600 mb-0.5 flex items-center gap-1"><TrendingDown size={10} /> Improve</p><p className="text-sm text-stone-700">{r.improve}</p></div>}
            </div>
          ))}
          {responses.length === 0 && !showForm && (
            <div className="text-center py-14 text-stone-400">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No feedback logged yet. Start collecting responses.</p>
            </div>
          )}
        </div>

        {/* AI analysis panel */}
        {responses.length > 0 && (
          <div className="space-y-3 fade-up">
            <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-emerald-600" />
                <h2 className="text-sm font-semibold text-stone-800">AI Analysis</h2>
              </div>

              {/* NPS visual */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wide">Sentiment split</p>
                <div className="flex rounded-lg overflow-hidden h-3">
                  {promoters > 0 && <div className="bg-emerald-500 transition-[flex] duration-500" style={{ flex: promoters }} />}
                  {passives > 0  && <div className="bg-amber-400 transition-[flex] duration-500" style={{ flex: passives }} />}
                  {detractors > 0 && <div className="bg-rose-400 transition-[flex] duration-500" style={{ flex: detractors }} />}
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-stone-500">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500 inline-block" />{promoters} promoters</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400 inline-block" />{passives} passive</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-400 inline-block" />{detractors} detractors</span>
                </div>
              </div>

              {/* what they loved */}
              {lovedThemes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1"><TrendingUp size={11} /> What guests loved</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lovedThemes.map(t => (
                      <span key={t} className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 capitalize">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* what to improve */}
              {improveThemes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1"><TrendingDown size={11} /> Areas to improve</p>
                  <div className="flex flex-wrap gap-1.5">
                    {improveThemes.map(t => (
                      <span key={t} className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 capitalize">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* overall take */}
              <div className="bg-stone-50 ring-1 ring-stone-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-stone-500 mb-1">Summary</p>
                <p className="text-sm text-stone-700">
                  {npsScore != null && npsScore >= 50
                    ? 'Excellent results — guests are highly likely to recommend this retreat.'
                    : npsScore != null && npsScore >= 0
                    ? 'Positive reception overall. Some areas to strengthen for next time.'
                    : 'Mixed feedback — worth addressing the improve themes before the next retreat.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
