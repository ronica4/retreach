'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CustomQuestion } from '@/types'
import { CheckCircle, Loader } from 'lucide-react'

const inputCls = 'w-full px-3 py-2.5 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-sm font-semibold text-stone-700 mb-1 block'

export default function RegisterPage() {
  const { retreatId } = useParams<{ retreatId: string }>()
  const [retreatName, setRetreatName] = useState('')
  const [customQs, setCustomQs]       = useState<CustomQuestion[]>([])
  const [loading, setLoading]         = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [error, setError]             = useState('')

  const [form, setForm] = useState({
    name: '', email: '', phone: '', age: '', gender: '', city_country: '',
    occupation: '', languages: '', first_retreat: '', how_heard: '',
    motivation: '', hoping_to_gain: '', skills_to_share: '', hobbies: '', fun_fact: '',
    dietary_needs: '', tshirt_size: '', activity_level: '', wellness_experience: '', rooming_preference: '',
    emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '',
    additional_info: '', photo_consent: '', stay_connected: '',
  })
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: retreat }, { data: questionnaire }] = await Promise.all([
        supabase.from('retreats').select('name').eq('id', retreatId).single(),
        supabase.from('questionnaires').select('custom_questions').eq('retreat_id', retreatId).single(),
      ])
      setRetreatName(retreat?.name ?? 'Retreat')
      setCustomQs(questionnaire?.custom_questions ?? [])
      setLoading(false)
    }
    load()
  }, [retreatId])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch(`/api/register/${retreatId}`, {
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl ring-1 ring-stone-200 p-8 text-center">
          <div className="size-16 rounded-full bg-emerald-100 grid place-items-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">You're registered!</h1>
          <p className="text-stone-500 text-sm">Thanks for signing up for <strong>{retreatName}</strong>. We'll be in touch soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-900">{retreatName}</h1>
          <p className="text-stone-500 mt-1 text-sm">Complete your registration below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Section title="Basic Information">
            <Field label="Full Name *">
              <input required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <input type="number" min="1" max="120" value={form.age} onChange={e => set('age', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Gender (Optional)">
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputCls}>
                  <option value="">Prefer not to say</option>
                  <option>Female</option><option>Male</option><option>Non-binary</option><option>Other</option>
                </select>
              </Field>
            </div>
            <Field label="City / Country">
              <input value={form.city_country} onChange={e => set('city_country', e.target.value)} placeholder="e.g. New York, USA" className={inputCls} />
            </Field>
            <Field label="Email Address *">
              <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Phone Number *">
              <input required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
            </Field>
          </Section>

          {/* About You */}
          <Section title="About You">
            <Field label="Occupation / Profession">
              <input value={form.occupation} onChange={e => set('occupation', e.target.value)} className={inputCls} />
            </Field>
            <Field label="What languages do you speak?">
              <input value={form.languages} onChange={e => set('languages', e.target.value)} placeholder="e.g. English, Spanish" className={inputCls} />
            </Field>
            <Field label="Is this your first retreat?">
              <div className="flex gap-4 pt-1">
                {['Yes', 'No'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
                    <input type="radio" name="first_retreat" value={v} checked={form.first_retreat === v} onChange={() => set('first_retreat', v)} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="How did you hear about us?">
              <input value={form.how_heard} onChange={e => set('how_heard', e.target.value)} className={inputCls} />
            </Field>
          </Section>

          {/* Community & Connection */}
          <Section title="Community & Connection">
            <Field label="What motivated you to join this retreat?">
              <textarea rows={3} value={form.motivation} onChange={e => set('motivation', e.target.value)} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="What are you hoping to gain from this experience?">
              <textarea rows={3} value={form.hoping_to_gain} onChange={e => set('hoping_to_gain', e.target.value)} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="What skills, knowledge, or experiences would you like to share with the group?">
              <textarea rows={2} value={form.skills_to_share} onChange={e => set('skills_to_share', e.target.value)} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="What are your main hobbies or interests?">
              <input value={form.hobbies} onChange={e => set('hobbies', e.target.value)} className={inputCls} />
            </Field>
            <Field label="What is one thing most people don't know about you?">
              <input value={form.fun_fact} onChange={e => set('fun_fact', e.target.value)} className={inputCls} />
            </Field>
          </Section>

          {/* Retreat Preferences */}
          <Section title="Retreat Preferences">
            <Field label="Dietary Needs / Allergies">
              <input value={form.dietary_needs} onChange={e => set('dietary_needs', e.target.value)} placeholder="e.g. vegetarian, nut allergy" className={inputCls} />
            </Field>
            <Field label="T-Shirt Size">
              <select value={form.tshirt_size} onChange={e => set('tshirt_size', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {['XS','S','M','L','XL','XXL'].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Activity Level">
              <div className="flex gap-4 pt-1">
                {['Beginner','Intermediate','Advanced'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
                    <input type="radio" name="activity_level" value={v} checked={form.activity_level === v} onChange={() => set('activity_level', v)} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Previous Experience with Yoga, Meditation, or Wellness Retreats">
              <textarea rows={2} value={form.wellness_experience} onChange={e => set('wellness_experience', e.target.value)} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Rooming Preferences">
              <div className="flex gap-4 pt-1">
                {['Private','Shared'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
                    <input type="radio" name="rooming_preference" value={v} checked={form.rooming_preference === v} onChange={() => set('rooming_preference', v)} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
          </Section>

          {/* Emergency Contact */}
          <Section title="Emergency Contact">
            <Field label="Emergency Contact Name">
              <input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Relationship">
              <input value={form.emergency_contact_relationship} onChange={e => set('emergency_contact_relationship', e.target.value)} placeholder="e.g. Spouse, Parent" className={inputCls} />
            </Field>
            <Field label="Emergency Contact Phone Number">
              <input type="tel" value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} className={inputCls} />
            </Field>
          </Section>

          {/* Additional Information */}
          <Section title="Additional Information">
            <Field label="Anything else we should know?">
              <textarea rows={3} value={form.additional_info} onChange={e => set('additional_info', e.target.value)} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Do you consent to being photographed during the retreat?">
              <div className="flex gap-4 pt-1">
                {['Yes','No'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
                    <input type="radio" name="photo_consent" value={v} checked={form.photo_consent === v} onChange={() => set('photo_consent', v)} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Would you like to stay connected with other participants after the retreat?">
              <div className="flex gap-4 pt-1">
                {['Yes','No'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
                    <input type="radio" name="stay_connected" value={v} checked={form.stay_connected === v} onChange={() => set('stay_connected', v)} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
          </Section>

          {/* Custom questions */}
          {customQs.length > 0 && (
            <Section title="Additional Questions">
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
                      <input type="checkbox" checked={(customAnswers[q.id] ?? '').split(',').includes(o)}
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
            {submitting ? 'Submitting…' : 'Submit Registration'}
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
