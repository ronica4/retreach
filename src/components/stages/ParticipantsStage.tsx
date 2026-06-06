'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Retreat, type Participant } from '@/types'
import {
  Plus, Trash2, CheckCircle, Clock, XCircle,
  GripVertical, ClipboardList, Users, DollarSign, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

interface Props {
  retreat: Retreat
  participants: Participant[]
}

// ── Questionnaire builder ──────────────────────────────────────────────────
type QType = 'text' | 'textarea' | 'single' | 'multi'

interface Question {
  id: string
  label: string
  type: QType
  options?: string[]
  required: boolean
}

const LS_Q       = (id: string) => `retreach_questionnaire_${id}`
const LS_PRICE   = (id: string) => `retreach_regprice_${id}`

const Q_TYPES: { key: QType; label: string }[] = [
  { key: 'text',     label: 'Short text'    },
  { key: 'textarea', label: 'Long text'     },
  { key: 'single',   label: 'Single choice' },
  { key: 'multi',    label: 'Multi choice'  },
]

const DEFAULT_QUESTIONS: Question[] = [
  { id: 'q1', label: 'Full name',                    type: 'text',     required: true  },
  { id: 'q2', label: 'Dietary needs / allergies',    type: 'text',     required: false },
  { id: 'q3', label: 'T-shirt size',                 type: 'single', options: ['XS','S','M','L','XL','XXL'], required: false },
  { id: 'q4', label: 'Anything else we should know?',type: 'textarea', required: false },
]

function newId() { return `q${Date.now()}` }

// ── Participants roster ────────────────────────────────────────────────────
const inputCls = 'w-full px-2.5 py-2 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition'
const labelCls = 'text-xs font-semibold text-stone-400 mb-0.5 block'

const PAY_CONFIG = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700',     Icon: Clock       },
  unpaid:  { label: 'Unpaid',  cls: 'bg-stone-100 text-stone-500',     Icon: XCircle     },
}

export default function ParticipantsStage({ retreat, participants }: Props) {
  const router  = useRouter()
  const [tab, setTab]       = useState<'roster' | 'questionnaire'>('roster')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', food_preferences: '', notes: '' })

  // registration price from localStorage
  const [regPrice, setRegPrice] = useState<number>(0)
  useEffect(() => {
    try { setRegPrice(parseFloat(localStorage.getItem(LS_PRICE(retreat.id)) ?? '0') || 0) } catch { /* */ }
  }, [retreat.id])

  function update(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const supabase = createClient()
    await supabase.from('participants').insert({
      retreat_id: retreat.id, name: form.name, email: form.email,
      phone: form.phone || null, food_preferences: form.food_preferences || null,
      notes: form.notes || null, payment_status: 'unpaid', payment_amount: 0,
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
    const cycle: Participant['payment_status'][] = ['unpaid', 'partial', 'paid']
    const next = cycle[(cycle.indexOf(p.payment_status) + 1) % 3]
    const supabase = createClient()
    // When paid: set payment_amount = regPrice (or keep existing if non-zero)
    const payment_amount = next === 'paid' ? (regPrice || p.payment_amount || 0)
      : next === 'partial' ? Math.round((regPrice || 0) / 2)
      : 0
    await supabase.from('participants').update({ payment_status: next, payment_amount }).eq('id', p.id)
    router.refresh()
  }

  // ── Financial stats ──
  const paidCount     = participants.filter(p => p.payment_status === 'paid').length
  const partialCount  = participants.filter(p => p.payment_status === 'partial').length
  const collected     = participants.reduce((s, p) => s + (p.payment_amount ?? 0), 0)
  const totalOwed     = participants.length * regPrice
  const outstanding   = Math.max(0, totalOwed - collected)

  return (
    <div>
      {/* ── Step header ── */}
      <div className="flex items-start justify-between gap-4 mb-6 fade-up">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Step 3 of 5</p>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">Participants &amp; registration</h1>
            <p className="text-sm text-stone-400 mt-0.5">Build the pre-retreat questionnaire, register guests, and track payments.</p>
          </div>
        </div>

        {/* tab toggle */}
        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 shrink-0">
          <TabPill active={tab === 'roster'}        onClick={() => setTab('roster')}        icon={<Users size={13} />}        label="Roster"        />
          <TabPill active={tab === 'questionnaire'} onClick={() => setTab('questionnaire')} icon={<ClipboardList size={13} />} label="Questionnaire" />
        </div>
      </div>

      {/* ── 4 stat tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatTile label="REGISTERED"   icon={<Users size={13} />}        value={participants.length}
          sub={participants.length ? `${paidCount} paid` : 'No guests yet'} />
        <StatTile label="COLLECTED"    icon={<DollarSign size={13} />}   value={formatCurrency(collected)}
          sub={regPrice ? `$${regPrice} / person` : 'Set a price →'} subAction={!regPrice ? () => setTab('questionnaire') : undefined} />
        <StatTile label="OUTSTANDING"  icon={<Clock size={13} />}        value={formatCurrency(outstanding)}
          sub={`${participants.length - paidCount} not fully paid`} tone={outstanding > 0 ? 'rose' : 'stone'} />
        <StatTile label="PAID IN FULL" icon={<CheckCircle size={13} />}  value={paidCount}
          sub={`of ${participants.length}`} tone={paidCount === participants.length && paidCount > 0 ? 'emerald' : 'stone'} />
      </div>

      {/* ── Roster tab ── */}
      {tab === 'roster' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-700 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-800 transition-colors shadow-sm">
              <Plus size={14} /> Register guest
            </button>
            {!regPrice && (
              <button onClick={() => setTab('questionnaire')}
                className="flex items-center gap-1.5 text-sm text-amber-700 font-medium bg-amber-50 ring-1 ring-amber-200 px-3 py-2 rounded-xl hover:bg-amber-100 transition">
                <DollarSign size={13} /> Set a registration price in the Questionnaire tab
                <ArrowRight size={12} />
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleAdd} className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-5 space-y-3 mb-4 fade-up">
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

          <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden">
            {participants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                <div className="size-14 rounded-2xl bg-stone-100 grid place-items-center mb-3">
                  <Users size={24} className="text-stone-300" />
                </div>
                <p className="text-sm font-medium text-stone-500">No participants yet — register your first guest.</p>
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
                          {p.food_preferences && <span className="ml-2 text-amber-600">· {p.food_preferences}</span>}
                        </p>
                      </div>
                      {regPrice > 0 && (
                        <span className="text-xs font-medium text-stone-400 shrink-0">
                          {formatCurrency(p.payment_amount ?? 0)} / {formatCurrency(regPrice)}
                        </span>
                      )}
                      <button onClick={() => cyclePayment(p)}
                        className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition hover:opacity-80 shrink-0', cls)}
                        title="Click to cycle payment status">
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
        </>
      )}

      {/* ── Questionnaire tab ── */}
      {tab === 'questionnaire' && (
        <QuestionnaireBuilder retreatId={retreat.id} regPrice={regPrice} onPriceChange={p => {
          setRegPrice(p)
          localStorage.setItem(LS_PRICE(retreat.id), String(p))
        }} />
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

function StatTile({ label, icon, value, sub, tone = 'stone', subAction }: {
  label: string; icon: React.ReactNode; value: string | number; sub: string; tone?: string; subAction?: () => void
}) {
  const vals: Record<string, string> = { stone: 'text-stone-900', emerald: 'text-emerald-700', rose: 'text-rose-600', amber: 'text-amber-600' }
  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{label}</p>
        <span className="text-stone-300">{icon}</span>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', vals[tone] ?? vals.stone)}>{value}</p>
      {subAction ? (
        <button onClick={subAction} className="text-xs text-emerald-600 font-semibold mt-0.5 hover:underline">{sub}</button>
      ) : (
        <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
      )}
    </div>
  )
}

// ── Questionnaire Builder ──────────────────────────────────────────────────
function QuestionnaireBuilder({ retreatId, regPrice, onPriceChange }: {
  retreatId: string; regPrice: number; onPriceChange: (p: number) => void
}) {
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem(LS_Q(retreatId))
      return saved ? JSON.parse(saved) : DEFAULT_QUESTIONS
    } catch { return DEFAULT_QUESTIONS }
  })
  const [editing, setEditing] = useState<string | null>(null)

  function saveQs(qs: Question[]) {
    setQuestions(qs)
    localStorage.setItem(LS_Q(retreatId), JSON.stringify(qs))
  }

  function addQuestion() {
    const q: Question = { id: newId(), label: 'New question', type: 'text', required: false }
    const next = [...questions, q]
    saveQs(next)
    setEditing(q.id)
  }

  function deleteQuestion(id: string) {
    saveQs(questions.filter(q => q.id !== id))
    if (editing === id) setEditing(null)
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    saveQs(questions.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  const iCls = 'w-full px-2.5 py-1.5 text-sm rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition bg-white'

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4">
      <div className="space-y-3">
        {/* Registration price */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-1.5">
            <DollarSign size={14} className="text-stone-400" /> Registration price
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
              <input
                type="number" min="0" step="10"
                value={regPrice || ''}
                onChange={e => onPriceChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition bg-white"
              />
            </div>
            <span className="text-sm text-stone-400">per person</span>
          </div>
          {regPrice > 0 && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">
              {regPrice > 0 && `${formatCurrency(regPrice)} × guests = target revenue`}
            </p>
          )}
        </div>

        {/* Question list */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-stone-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-800">Registration questions ({questions.length})</p>
            <button onClick={addQuestion}
              className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition">
              <Plus size={12} /> Add question
            </button>
          </div>
          <div className="divide-y divide-stone-100">
            {questions.map((q, idx) => (
              <div key={q.id}>
                <button className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-stone-50 transition"
                  onClick={() => setEditing(editing === q.id ? null : q.id)}>
                  <GripVertical size={14} className="text-stone-300 shrink-0" />
                  <span className="text-xs font-bold text-stone-400 w-5 shrink-0">{idx + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-stone-800 truncate">{q.label}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">
                    {Q_TYPES.find(t => t.key === q.type)?.label}
                  </span>
                  {q.required && <span className="text-xs font-semibold text-rose-500 shrink-0">Required</span>}
                </button>

                {editing === q.id && (
                  <div className="px-5 pb-4 pt-2 space-y-3 border-t border-stone-100 bg-stone-50/50 fade-up">
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
        </div>
      </div>

      {/* Live form preview */}
      <div className="sticky top-4">
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-4">Form preview</p>
          <div className="space-y-3">
            {questions.map(q => (
              <div key={q.id}>
                <label className="text-xs font-semibold text-stone-600 mb-1 block">
                  {q.label}{q.required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
                {q.type === 'text'     && <div className="h-8 rounded-lg ring-1 ring-stone-200 bg-stone-50" />}
                {q.type === 'textarea' && <div className="h-16 rounded-lg ring-1 ring-stone-200 bg-stone-50" />}
                {q.type === 'single'   && (
                  <div className="space-y-1">
                    {(q.options ?? ['Option A', 'Option B']).filter(Boolean).map(o => (
                      <div key={o} className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="size-3.5 rounded-full ring-1 ring-stone-300 bg-white shrink-0" /> {o}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'multi' && (
                  <div className="space-y-1">
                    {(q.options ?? ['Option A', 'Option B']).filter(Boolean).map(o => (
                      <div key={o} className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="size-3.5 rounded ring-1 ring-stone-300 bg-white shrink-0" /> {o}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {questions.length > 0 && (
            <button disabled className="w-full mt-4 text-sm font-semibold py-2 bg-emerald-700 text-white rounded-lg opacity-50 cursor-not-allowed">
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
