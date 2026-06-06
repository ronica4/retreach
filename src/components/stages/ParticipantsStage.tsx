'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Participant, type Questionnaire, type CustomQuestion } from '@/types'
import {
  Plus, Trash2, CheckCircle, Clock, XCircle,
  ClipboardList, Users, DollarSign, Link2, Check,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface Props {
  retreat: Retreat
  participants: Participant[]
}

type QType = 'text' | 'textarea' | 'single' | 'multi'

const Q_TYPES: { key: QType; label: string }[] = [
  { key: 'text',     label: 'Short text'    },
  { key: 'textarea', label: 'Long text'     },
  { key: 'single',   label: 'Single choice' },
  { key: 'multi',    label: 'Multi choice'  },
]

const PAY_CONFIG = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700',     Icon: Clock       },
  unpaid:  { label: 'Unpaid',  cls: 'bg-stone-100 text-stone-500',     Icon: XCircle     },
}

const FIXED_FIELDS = [
  { section: 'Basic Information', fields: ['Full Name *', 'Age', 'Gender (Optional)', 'City / Country', 'Email Address *', 'Phone Number *'] },
  { section: 'About You', fields: ['Occupation / Profession', 'What languages do you speak?', 'Is this your first retreat?', 'How did you hear about us?'] },
  { section: 'Community & Connection', fields: ['What motivated you to join this retreat?', 'What are you hoping to gain from this experience?', 'What skills, knowledge, or experiences would you like to share with the group?', 'What are your main hobbies or interests?', 'What is one thing most people don\'t know about you?'] },
  { section: 'Retreat Preferences', fields: ['Dietary Needs / Allergies', 'T-Shirt Size', 'Activity Level (Beginner / Intermediate / Advanced)', 'Previous Experience with Yoga, Meditation, or Wellness Retreats', 'Rooming Preferences (Private / Shared)'] },
  { section: 'Emergency Contact', fields: ['Emergency Contact Name', 'Relationship', 'Emergency Contact Phone Number'] },
  { section: 'Additional Information', fields: ['Anything else we should know?', 'Do you consent to being photographed during the retreat? (Yes / No)', 'Would you like to stay connected with other participants after the retreat? (Yes / No)'] },
]

function newId() { return `q${Date.now()}` }

export default function ParticipantsStage({ retreat, participants }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'roster' | 'questionnaire'>('roster')

  const paidCount    = participants.filter(p => p.payment_status === 'paid').length
  const collected    = participants.reduce((s, p) => s + (p.payment_amount ?? 0), 0)
  const [regPrice, setRegPrice] = useState(0)
  const outstanding  = Math.max(0, participants.length * regPrice - collected)

  async function cyclePayment(p: Participant) {
    const cycle: Participant['payment_status'][] = ['unpaid', 'partial', 'paid']
    const next = cycle[(cycle.indexOf(p.payment_status) + 1) % 3]
    const payment_amount = next === 'paid' ? (regPrice || p.payment_amount || 0)
      : next === 'partial' ? Math.round((regPrice || 0) / 2) : 0
    const supabase = createClient()
    await supabase.from('participants').update({ payment_status: next, payment_amount }).eq('id', p.id)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('participants').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 fade-up">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Step 3 of 5</p>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">Participants &amp; registration</h1>
            <p className="text-sm text-stone-400 mt-0.5">Build the questionnaire, share the link, and track payments.</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 shrink-0">
          <TabPill active={tab === 'roster'}        onClick={() => setTab('roster')}        icon={<Users size={13} />}        label="Roster"        />
          <TabPill active={tab === 'questionnaire'} onClick={() => setTab('questionnaire')} icon={<ClipboardList size={13} />} label="Questionnaire" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatTile label="REGISTERED"   value={participants.length} sub={`${paidCount} paid`} />
        <StatTile label="COLLECTED"    value={formatCurrency(collected)} sub={regPrice ? `$${regPrice}/person` : 'Set price →'} subAction={!regPrice ? () => setTab('questionnaire') : undefined} />
        <StatTile label="OUTSTANDING"  value={formatCurrency(outstanding)} tone={outstanding > 0 ? 'rose' : 'stone'} sub={`${participants.length - paidCount} not fully paid`} />
        <StatTile label="PAID IN FULL" value={paidCount} tone={paidCount > 0 && paidCount === participants.length ? 'emerald' : 'stone'} sub={`of ${participants.length}`} />
      </div>

      {tab === 'roster' && (
        <div className="bg-white ring-1 ring-stone-200 rounded-2xl overflow-hidden">
          {participants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
              <div className="size-14 rounded-2xl bg-stone-100 grid place-items-center mb-3">
                <Users size={24} className="text-stone-300" />
              </div>
              <p className="text-sm font-medium text-stone-500">No participants yet — share the registration link.</p>
              <button onClick={() => setTab('questionnaire')} className="mt-3 text-sm text-emerald-600 font-semibold hover:underline">
                Go to Questionnaire →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {participants.map(p => {
                const { label, cls, Icon } = PAY_CONFIG[p.payment_status]
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 group hover:bg-stone-50 transition">
                    <div className="size-8 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-sm font-bold shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900">{p.name}</p>
                      <p className="text-xs text-stone-400 truncate">
                        {p.email}
                        {p.city_country && <span className="ml-2">· {p.city_country}</span>}
                        {p.dietary_needs && <span className="ml-2 text-amber-600">· {p.dietary_needs}</span>}
                      </p>
                    </div>
                    {regPrice > 0 && (
                      <span className="text-xs font-medium text-stone-400 shrink-0">
                        {formatCurrency(p.payment_amount ?? 0)} / {formatCurrency(regPrice)}
                      </span>
                    )}
                    <button onClick={() => cyclePayment(p)}
                      className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition hover:opacity-80 shrink-0', cls)}>
                      <Icon size={11} /> {label}
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'questionnaire' && (
        <QuestionnaireBuilder retreat={retreat} onPriceLoad={setRegPrice} />
      )}
    </div>
  )
}

function TabPill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
        active ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
      )}>
      {icon} {label}
    </button>
  )
}

function StatTile({ label, value, sub, tone = 'stone', subAction }: {
  label: string; value: string | number; sub: string; tone?: string; subAction?: () => void
}) {
  const colors: Record<string, string> = { stone: 'text-stone-900', emerald: 'text-emerald-700', rose: 'text-rose-600' }
  return (
    <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-4">
      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums', colors[tone] ?? colors.stone)}>{value}</p>
      {subAction ? (
        <button onClick={subAction} className="text-xs text-emerald-600 font-semibold mt-0.5 hover:underline">{sub}</button>
      ) : (
        <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
      )}
    </div>
  )
}

function QuestionnaireBuilder({ retreat, onPriceLoad }: { retreat: Retreat; onPriceLoad: (p: number) => void }) {
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [copied, setCopied]         = useState(false)
  const [regPrice, setRegPrice]     = useState(0)
  const [customQs, setCustomQs]     = useState<CustomQuestion[]>([])
  const [editing, setEditing]       = useState<string | null>(null)
  const [questId, setQuestId]       = useState<string | null>(null)

  const iCls = 'w-full px-2.5 py-1.5 text-sm rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition bg-white'

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('retreat_id', retreat.id)
        .single()
      if (data) {
        setQuestId(data.id)
        setRegPrice(data.registration_price ?? 0)
        setCustomQs(data.custom_questions ?? [])
        onPriceLoad(data.registration_price ?? 0)
      }
      setLoading(false)
    }
    load()
  }, [retreat.id])

  async function save(price: number, questions: CustomQuestion[]) {
    setSaving(true)
    const supabase = createClient()
    const payload = {
      retreat_id: retreat.id,
      registration_price: price,
      custom_questions: questions,
      updated_at: new Date().toISOString(),
    }
    if (questId) {
      await supabase.from('questionnaires').update(payload).eq('id', questId)
    } else {
      const { data } = await supabase.from('questionnaires').insert(payload).select('id').single()
      if (data) setQuestId(data.id)
    }
    setSaving(false)
  }

  function updatePrice(p: number) {
    setRegPrice(p)
    onPriceLoad(p)
    save(p, customQs)
  }

  function addQuestion() {
    const q: CustomQuestion = { id: newId(), label: 'New question', type: 'text', required: false }
    const next = [...customQs, q]
    setCustomQs(next)
    setEditing(q.id)
    save(regPrice, next)
  }

  function deleteQuestion(id: string) {
    const next = customQs.filter(q => q.id !== id)
    setCustomQs(next)
    if (editing === id) setEditing(null)
    save(regPrice, next)
  }

  function updateQuestion(id: string, patch: Partial<CustomQuestion>) {
    const next = customQs.map(q => q.id === id ? { ...q, ...patch } : q)
    setCustomQs(next)
    save(regPrice, next)
  }

  function copyLink() {
    const url = `${window.location.origin}/register/${retreat.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="py-12 text-center text-sm text-stone-400">Loading questionnaire…</div>

  return (
    <div className="space-y-4">
      {/* Price + Send link */}
      <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-5 flex items-end gap-4 flex-wrap">
        <div>
          <label className="text-xs font-semibold text-stone-400 mb-1 block">Registration price</label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
              <input type="number" min="0" step="10" value={regPrice || ''}
                onChange={e => updatePrice(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-32 pl-7 pr-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition bg-white" />
            </div>
            <span className="text-sm text-stone-400">per person</span>
          </div>
        </div>
        <button onClick={copyLink}
          className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition',
            copied ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-white hover:bg-stone-700'
          )}>
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? 'Link copied!' : 'Copy registration link'}
        </button>
        {saving && <span className="text-xs text-stone-400">Saving…</span>}
      </div>

      {/* Fixed questions (read-only) */}
      <div className="bg-white ring-1 ring-stone-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <p className="text-sm font-semibold text-stone-800">Standard questions <span className="text-stone-400 font-normal">(always included)</span></p>
        </div>
        <div className="divide-y divide-stone-100">
          {FIXED_FIELDS.map(section => (
            <div key={section.section} className="px-5 py-3">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">{section.section}</p>
              <div className="space-y-1">
                {section.fields.map(f => (
                  <p key={f} className="text-sm text-stone-600 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-stone-300 shrink-0" /> {f}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom questions */}
      <div className="bg-white ring-1 ring-stone-200 rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-stone-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-800">
            Custom questions <span className="text-stone-400 font-normal">({customQs.length})</span>
          </p>
          <button onClick={addQuestion}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition">
            <Plus size={12} /> Add question
          </button>
        </div>

        {customQs.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">No custom questions yet — add one above.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {customQs.map((q, idx) => (
              <div key={q.id}>
                <button className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-stone-50 transition"
                  onClick={() => setEditing(editing === q.id ? null : q.id)}>
                  <span className="text-xs font-bold text-stone-400 w-5 shrink-0">{idx + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-stone-800 truncate">{q.label}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">
                    {Q_TYPES.find(t => t.key === q.type)?.label}
                  </span>
                  {q.required && <span className="text-xs font-semibold text-rose-500 shrink-0">Required</span>}
                </button>

                {editing === q.id && (
                  <div className="px-5 pb-4 pt-2 space-y-3 border-t border-stone-100 bg-stone-50/50">
                    <div>
                      <label className="text-xs font-semibold text-stone-400 mb-0.5 block">Question label</label>
                      <input value={q.label} onChange={e => updateQuestion(q.id, { label: e.target.value })} className={iCls} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-400 mb-1 block">Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {Q_TYPES.map(t => (
                          <button key={t.key} type="button"
                            onClick={() => updateQuestion(q.id, { type: t.key })}
                            className={cn('px-2.5 py-1 text-xs font-semibold rounded-lg ring-1 transition',
                              q.type === t.key ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300'
                            )}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(q.type === 'single' || q.type === 'multi') && (
                      <div>
                        <label className="text-xs font-semibold text-stone-400 mb-0.5 block">Options (one per line)</label>
                        <textarea rows={3}
                          value={(q.options ?? []).join('\n')}
                          onChange={e => updateQuestion(q.id, { options: e.target.value.split('\n') })}
                          className={iCls + ' resize-none'}
                          placeholder={'Option A\nOption B\nOption C'} />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={q.required}
                          onChange={e => updateQuestion(q.id, { required: e.target.checked })}
                          className="rounded text-emerald-600" />
                        <span className="text-xs font-semibold text-stone-600">Required</span>
                      </label>
                      <button onClick={() => deleteQuestion(q.id)}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1">
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
