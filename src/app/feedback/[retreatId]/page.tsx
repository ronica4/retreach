'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CustomQuestion } from '@/types'
import { CheckCircle, Loader } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputCls = 'w-full px-3 py-2.5 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-sm font-semibold text-stone-700 mb-1 block'

const NPS_LABEL = (n: number) => n >= 9 ? 'Promoter — very likely' : n >= 7 ? 'Passive — somewhat likely' : 'Unlikely to recommend'
const NPS_CLS   = (n: number, sel: boolean) =>
  sel
    ? n >= 9 ? 'bg-emerald-700 text-white ring-emerald-700'
      : n >= 7 ? 'bg-amber-500 text-white ring-amber-500'
      : 'bg-rose-500 text-white ring-rose-500'
    : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300'

export default function FeedbackPage() {
  const { retreatId } = useParams<{ retreatId: string }>()
  const [retreatName, setRetreatName] = useState('')
  const [customQs, setCustomQs]       = useState<CustomQuestion[]>([])
  const [loading, setLoading]         = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [error, setError]             = useState('')

  const [form, setForm] = useState({
    name: '', email: '', nps: -1, what_loved: '', what_to_improve: '',
  })
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: retreat }, { data: questionnaire }] = await Promise.all([
        supabase.from('retreats').select('name').eq('id', retreatId).single(),
        supabase.from('feedback_questionnaires').select('custom_questions').eq('retreat_id', retreatId).single(),
      ])
      setRetreatName(retreat?.name ?? 'Retreat')
      setCustomQs(questionnaire?.custom_questions ?? [])
      setLoading(false)
    }
    load()
  }, [retreatId])

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.nps < 0) { setError('Please select a score (0–10) before submitting.'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch(`/api/feedback/${retreatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, custom_answers: customAnswers }),
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      const { error: msg } = await res.json()
      setError(msg || 'Submission failed. Please try again.')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  function resetForm() {
    setForm({ name: '', email: '', nps: -1, what_loved: '', what_to_improve: '' })
    setCustomAnswers({})
    setError('')
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl ring-1 ring-stone-200 p-8 text-center">
          <div className="size-16 rounded-full bg-emerald-100 grid place-items-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Thank you!</h1>
          <p className="text-stone-500 text-sm mb-6">Your feedback for <strong>{retreatName}</strong> has been submitted. We really appreciate it.</p>
          <button onClick={resetForm}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 transition">
            Submit another response
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-900">{retreatName}</h1>
          <p className="text-stone-500 mt-1 text-sm">Share your experience — it takes 2 minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Section title="About You">
            <Field label="Your Name">
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Optional" />
            </Field>
            <Field label="Your Email">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="Optional — only if you'd like a reply" />
            </Field>
          </Section>

          <Section title="Your Experience">
            <Field label="How likely are you to recommend this retreat to a friend? *">
              <div className="flex gap-1.5 flex-wrap mt-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <button key={i} type="button" onClick={() => set('nps', i)}
                    className={cn('w-9 h-9 text-sm font-semibold rounded-lg ring-1 transition-colors', NPS_CLS(i, form.nps === i))}>
                    {i}
                  </button>
                ))}
              </div>
              {form.nps >= 0 && (
                <p className={cn('text-xs font-semibold mt-1.5',
                  form.nps >= 9 ? 'text-emerald-700' : form.nps >= 7 ? 'text-amber-600' : 'text-rose-600')}>
                  {NPS_LABEL(form.nps)}
                </p>
              )}
            </Field>
            <Field label="What did you love most about the retreat?">
              <textarea rows={3} value={form.what_loved} onChange={e => set('what_loved', e.target.value)}
                className={inputCls + ' resize-none'} placeholder="The thing that stood out most…" />
            </Field>
            <Field label="What could have been better?">
              <textarea rows={3} value={form.what_to_improve} onChange={e => set('what_to_improve', e.target.value)}
                className={inputCls + ' resize-none'} placeholder="Honest feedback helps us improve…" />
            </Field>
          </Section>

          {customQs.length > 0 && (
            <Section title="A Few More Questions">
              {customQs.map(q => (
                <Field key={q.id} label={q.label + (q.required ? ' *' : '')}>
                  {q.type === 'text' && (
                    <input required={q.required} value={customAnswers[q.id] ?? ''} onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))} className={inputCls} />
                  )}
                  {q.type === 'textarea' && (
                    <textarea required={q.required} rows={3} value={customAnswers[q.id] ?? ''} onChange={e => setCustomAnswers(a => ({ ...a, [q.id]: e.target.value }))} className={inputCls + ' resize-none'} />
                  )}
                  {q.type === 'single' && (q.options ?? []).map(o => (
                    <label key={o} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer mt-1">
                      <input type="radio" name={q.id} value={o} checked={customAnswers[q.id] === o} onChange={() => setCustomAnswers(a => ({ ...a, [q.id]: o }))} />
                      {o}
                    </label>
                  ))}
                  {q.type === 'multi' && (q.options ?? []).map(o => (
                    <label key={o} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer mt-1">
                      <input type="checkbox"
                        checked={(customAnswers[q.id] ?? '').split(',').includes(o)}
                        onChange={e => {
                          const current = (customAnswers[q.id] ?? '').split(',').filter(Boolean)
                          const next = e.target.checked ? [...current, o] : current.filter(v => v !== o)
                          setCustomAnswers(a => ({ ...a, [q.id]: next.join(',') }))
                        }} />
                      {o}
                    </label>
                  ))}
                </Field>
              ))}
            </Section>
          )}

          {error && <p className="text-sm text-rose-600 text-center">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-emerald-700 text-white font-semibold rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-colors text-sm">
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}
