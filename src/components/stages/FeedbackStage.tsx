'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Retreat, ParticipantFeedback, ManagerFeedback, FeedbackQuestionnaire, CustomQuestion } from '@/types'
import {
  MessageSquare, Users, User, Star, TrendingUp, TrendingDown,
  Link2, Check, Plus, Sparkles, ClipboardList, Trash2, PenLine,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  retreat: Retreat
  participantFeedback: ParticipantFeedback[]
  managerFeedback: ManagerFeedback | null
  feedbackQuestionnaire: FeedbackQuestionnaire | null
}

type Tab = 'my-notes' | 'guest' | 'setup'

const NPS_LABEL = (n: number) => n >= 9 ? 'Promoter' : n >= 7 ? 'Passive' : 'Detractor'
const NPS_CLS   = (n: number) => n >= 9 ? 'text-emerald-700 bg-emerald-100' : n >= 7 ? 'text-amber-700 bg-amber-100' : 'text-rose-600 bg-rose-100'

function extractThemes(texts: string[]) {
  const stop = new Set(['the','a','and','to','in','of','was','it','for','this','that','with','we','i','very','so','our','but','is','at','on','be','as','by'])
  const freq: Record<string, number> = {}
  texts.join(' ').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
    if (w.length > 3 && !stop.has(w)) freq[w] = (freq[w] ?? 0) + 1
  })
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w)
}

function newId() { return `q${Date.now()}` }
type QType = 'text' | 'textarea' | 'single' | 'multi'
const Q_TYPES: { key: QType; label: string }[] = [
  { key: 'text',     label: 'Short text'    },
  { key: 'textarea', label: 'Long text'     },
  { key: 'single',   label: 'Single choice' },
  { key: 'multi',    label: 'Multi choice'  },
]

export default function FeedbackStage({ retreat, participantFeedback, managerFeedback, feedbackQuestionnaire }: Props) {
  const [tab, setTab] = useState<Tab>('my-notes')
  const router = useRouter()

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 fade-up">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
            <MessageSquare size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Post-retreat</p>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">Feedback</h1>
            <p className="text-sm text-stone-400 mt-0.5">Your reflection + participant responses</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 shrink-0">
          <TabPill active={tab === 'my-notes'} onClick={() => setTab('my-notes')} icon={<User size={13} />}         label="My Notes" />
          <TabPill active={tab === 'guest'}    onClick={() => setTab('guest')}    icon={<Users size={13} />}        label={`Guest (${participantFeedback.length})`} />
          <TabPill active={tab === 'setup'}    onClick={() => setTab('setup')}    icon={<ClipboardList size={13} />} label="Send Link" />
        </div>
      </div>

      {tab === 'my-notes' && (
        <ManagerNotesTab retreat={retreat} initial={managerFeedback} onSaved={() => router.refresh()} />
      )}
      {tab === 'guest' && (
        <GuestResponsesTab responses={participantFeedback} retreatId={retreat.id} />
      )}
      {tab === 'setup' && (
        <SetupTab retreat={retreat} initial={feedbackQuestionnaire} onSaved={() => router.refresh()} />
      )}
    </div>
  )
}

// ── Manager Notes ────────────────────────────────────────────────────────────

function ManagerNotesTab({ retreat, initial, onSaved }: {
  retreat: Retreat
  initial: ManagerFeedback | null
  onSaved: () => void
}) {
  const [editing, setEditing]               = useState(!initial)
  const [rating, setRating]                 = useState(initial?.overall_rating ?? 0)
  const [hoverRating, setHoverRating]       = useState(0)
  const [whatWentWell, setWhatWentWell]     = useState(initial?.what_went_well ?? '')
  const [whatToImprove, setWhatToImprove]   = useState(initial?.what_to_improve ?? '')
  const [lessonsLearned, setLessonsLearned] = useState(initial?.lessons_learned ?? '')
  const [wouldRunAgain, setWouldRunAgain]   = useState<boolean | null>(initial?.would_run_again ?? null)
  const [saving, setSaving]                 = useState(false)
  const [feedbackId, setFeedbackId]         = useState<string | null>(initial?.id ?? null)

  const ta = 'w-full px-3 py-2.5 text-sm bg-white rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition resize-none'

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const payload = {
      retreat_id: retreat.id,
      overall_rating: rating || null,
      what_went_well: whatWentWell || null,
      what_to_improve: whatToImprove || null,
      lessons_learned: lessonsLearned || null,
      would_run_again: wouldRunAgain,
      updated_at: new Date().toISOString(),
    }
    if (feedbackId) {
      await supabase.from('manager_feedback').update(payload).eq('id', feedbackId)
    } else {
      const { data } = await supabase.from('manager_feedback').insert({ ...payload, manager_id: retreat.manager_id }).select('id').single()
      if (data) setFeedbackId(data.id)
    }
    setSaving(false)
    setEditing(false)
    onSaved()
    fetch(`/api/retreat-summary/${retreat.id}`, { method: 'POST' }).catch(() => {})
  }

  const RATING_LABEL = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']
  const WOULD_RUN_LABEL: Record<string, string> = { true: 'Yes', false: 'No', null: 'Maybe' }

  // ── Read-only view ──────────────────────────────────────────────────────────
  if (!editing) {
    const hasAny = rating > 0 || whatWentWell || whatToImprove || lessonsLearned || wouldRunAgain !== null
    return (
      <div className="max-w-2xl space-y-5">
        <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">My Reflection</p>
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 ring-1 ring-stone-200 rounded-lg px-3 py-1.5 transition">
              <PenLine size={12} /> Edit
            </button>
          </div>

          {!hasAny ? (
            <p className="text-sm text-stone-400">No notes yet. Click Edit to add your reflection.</p>
          ) : (
            <div className="space-y-4">
              {rating > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-400 mb-1.5 uppercase tracking-wide">Overall rating</p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={18}
                          className={cn(n <= rating ? 'text-amber-400 fill-amber-400' : 'text-stone-200 fill-stone-100')} />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-stone-700">{RATING_LABEL[rating]}</span>
                  </div>
                </div>
              )}
              {whatWentWell && (
                <div>
                  <p className="text-xs font-semibold text-emerald-600 mb-1 flex items-center gap-1"><TrendingUp size={11} /> What went well</p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">{whatWentWell}</p>
                </div>
              )}
              {whatToImprove && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1"><TrendingDown size={11} /> What to do differently</p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">{whatToImprove}</p>
                </div>
              )}
              {lessonsLearned && (
                <div>
                  <p className="text-xs font-semibold text-emerald-600 mb-1 flex items-center gap-1"><Sparkles size={11} /> Lessons learned</p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">{lessonsLearned}</p>
                </div>
              )}
              {wouldRunAgain !== null && (
                <div>
                  <p className="text-xs font-semibold text-stone-400 mb-1 uppercase tracking-wide">Run again?</p>
                  <span className={cn('text-sm font-semibold px-2.5 py-1 rounded-lg',
                    wouldRunAgain === true ? 'bg-emerald-100 text-emerald-700' : wouldRunAgain === false ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
                    {WOULD_RUN_LABEL[String(wouldRunAgain)]}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-stone-400 text-center">
          Your notes are private and only visible to you.
        </p>
      </div>
    )
  }

  // ── Edit view ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-5">
      {/* Overall rating */}
      <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-3">Overall rating</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110">
              <Star size={28}
                className={cn('transition-colors', n <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-stone-200 fill-stone-100')} />
            </button>
          ))}
          {(hoverRating || rating) > 0 && (
            <span className="ml-2 text-sm text-stone-500 self-center">
              {RATING_LABEL[hoverRating || rating]}
            </span>
          )}
        </div>
      </div>

      {/* Reflections */}
      <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Reflections</p>

        <div>
          <label className="text-xs font-semibold text-stone-500 mb-1.5 flex items-center gap-1.5 block">
            <TrendingUp size={12} className="text-emerald-600" /> What went well?
          </label>
          <textarea rows={3} value={whatWentWell} onChange={e => setWhatWentWell(e.target.value)}
            className={ta} placeholder="The things that worked and should be repeated…" />
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-500 mb-1.5 flex items-center gap-1.5 block">
            <TrendingDown size={12} className="text-amber-600" /> What would you do differently?
          </label>
          <textarea rows={3} value={whatToImprove} onChange={e => setWhatToImprove(e.target.value)}
            className={ta} placeholder="Pain points, things to change next time…" />
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-500 mb-1.5 flex items-center gap-1.5 block">
            <Sparkles size={12} className="text-emerald-600" /> Lessons learned
          </label>
          <textarea rows={3} value={lessonsLearned} onChange={e => setLessonsLearned(e.target.value)}
            className={ta} placeholder="Key takeaways to remember for future retreats…" />
        </div>
      </div>

      {/* Would run again */}
      <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-3">Would you run this retreat again?</p>
        <div className="flex gap-2">
          {([['yes', true], ['no', false], ['maybe', null]] as const).map(([label, val]) => (
            <button key={label} type="button"
              onClick={() => setWouldRunAgain(val)}
              className={cn('px-4 py-2 text-sm font-semibold rounded-lg ring-1 transition capitalize',
                wouldRunAgain === val
                  ? (val === true ? 'bg-emerald-700 text-white ring-emerald-700' : val === false ? 'bg-rose-500 text-white ring-rose-500' : 'bg-amber-500 text-white ring-amber-500')
                  : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300'
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {feedbackId && (
          <button onClick={() => setEditing(false)}
            className="px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 ring-1 ring-stone-200 rounded-xl transition">
            Cancel
          </button>
        )}
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-50 rounded-xl transition">
          {saving ? 'Saving…' : <><Check size={14} /> Save notes</>}
        </button>
      </div>

      <p className="text-xs text-stone-400 text-center">
        Your notes are private and only visible to you. The AI agent uses them across all your retreats to give better suggestions.
      </p>
    </div>
  )
}

// ── Guest Responses ──────────────────────────────────────────────────────────

function GuestResponsesTab({ responses, retreatId }: { responses: ParticipantFeedback[]; retreatId: string }) {
  // Auto-sync the retreat summary when the manager views this tab so the agent
  // picks up the latest participant responses + schedule context
  useEffect(() => {
    if (responses.length > 0) {
      fetch(`/api/retreat-summary/${retreatId}`, { method: 'POST' }).catch(() => {})
    }
  }, [retreatId, responses.length])

  const promoters  = responses.filter(r => (r.nps_score ?? 0) >= 9).length
  const passives   = responses.filter(r => (r.nps_score ?? 0) >= 7 && (r.nps_score ?? 0) < 9).length
  const detractors = responses.filter(r => (r.nps_score ?? 0) < 7 && r.nps_score != null).length
  const withNps    = responses.filter(r => r.nps_score != null)
  const npsScore   = withNps.length > 0
    ? Math.round(((promoters - detractors) / withNps.length) * 100)
    : null
  const avg = withNps.length > 0
    ? (withNps.reduce((s, r) => s + (r.nps_score ?? 0), 0) / withNps.length).toFixed(1)
    : null

  const lovedThemes   = useMemo(() => extractThemes(responses.map(r => r.what_loved ?? '').filter(Boolean)),   [responses])
  const improveThemes = useMemo(() => extractThemes(responses.map(r => r.what_to_improve ?? '').filter(Boolean)), [responses])

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-stone-400">
        <div className="size-14 rounded-2xl bg-stone-100 grid place-items-center mb-3">
          <Users size={24} className="text-stone-300" />
        </div>
        <p className="text-sm font-medium text-stone-500">No guest responses yet.</p>
        <p className="text-sm text-stone-400 mt-1">Share the feedback link (Send Link tab) with participants.</p>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4">
      {/* Responses list */}
      <div className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-1">
          <StatTile label="RESPONSES"  value={responses.length} />
          <StatTile label="NPS SCORE"  value={npsScore != null ? (npsScore > 0 ? '+' : '') + npsScore : '—'}
            tone={npsScore != null && npsScore >= 30 ? 'emerald' : npsScore != null && npsScore < 0 ? 'rose' : 'stone'} />
          <StatTile label="AVG SCORE"  value={avg ?? '—'} />
          <StatTile label="PROMOTERS"  value={promoters} tone="emerald" />
        </div>

        {responses.map(r => (
          <div key={r.id} className="bg-white ring-1 ring-stone-200 rounded-2xl p-5 fade-up">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-stone-900">{r.participant_name || 'Anonymous'}</p>
                {r.participant_email && <p className="text-xs text-stone-400">{r.participant_email}</p>}
                <p className="text-xs text-stone-300">{new Date(r.submitted_at).toLocaleDateString()}</p>
              </div>
              {r.nps_score != null && (
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold rounded-full px-2.5 py-1', NPS_CLS(r.nps_score))}>
                    {r.nps_score}/10
                  </span>
                  <span className="text-xs font-semibold text-stone-400">{NPS_LABEL(r.nps_score)}</span>
                </div>
              )}
            </div>
            {r.what_loved && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-emerald-600 mb-0.5 flex items-center gap-1"><TrendingUp size={10} /> Loved</p>
                <p className="text-sm text-stone-700">{r.what_loved}</p>
              </div>
            )}
            {r.what_to_improve && (
              <div>
                <p className="text-xs font-semibold text-amber-600 mb-0.5 flex items-center gap-1"><TrendingDown size={10} /> Improve</p>
                <p className="text-sm text-stone-700">{r.what_to_improve}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI analysis */}
      <div>
        <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-5 sticky top-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-stone-800">Analysis</h2>
          </div>

          {/* Sentiment bar */}
          <div>
            <p className="text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wide">Sentiment split</p>
            <div className="flex rounded-lg overflow-hidden h-3">
              {promoters  > 0 && <div className="bg-emerald-500 transition-[flex] duration-500" style={{ flex: promoters }} />}
              {passives   > 0 && <div className="bg-amber-400 transition-[flex] duration-500"  style={{ flex: passives }} />}
              {detractors > 0 && <div className="bg-rose-400 transition-[flex] duration-500"   style={{ flex: detractors }} />}
            </div>
            <div className="flex gap-3 mt-1.5 text-xs text-stone-500">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500 inline-block" />{promoters} promoters</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400 inline-block"  />{passives} passive</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-400 inline-block"   />{detractors} detractors</span>
            </div>
          </div>

          {lovedThemes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1"><TrendingUp size={11} /> What guests loved</p>
              <div className="flex flex-wrap gap-1.5">
                {lovedThemes.map(t => (
                  <span key={t} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 capitalize">{t}</span>
                ))}
              </div>
            </div>
          )}

          {improveThemes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1"><TrendingDown size={11} /> Areas to improve</p>
              <div className="flex flex-wrap gap-1.5">
                {improveThemes.map(t => (
                  <span key={t} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 capitalize">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-stone-50 ring-1 ring-stone-100 rounded-xl p-3">
            <p className="text-xs text-stone-700">
              {npsScore != null && npsScore >= 50
                ? 'Excellent — guests are highly likely to recommend this retreat.'
                : npsScore != null && npsScore >= 0
                ? 'Positive overall. Address the improvement themes next time.'
                : 'Mixed feedback — worth reviewing the improvement themes carefully.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Setup / Send Link ────────────────────────────────────────────────────────

function SetupTab({ retreat, initial, onSaved }: {
  retreat: Retreat
  initial: FeedbackQuestionnaire | null
  onSaved: () => void
}) {
  const [customQs, setCustomQs] = useState<CustomQuestion[]>(initial?.custom_questions ?? [])
  const [questId, setQuestId]   = useState<string | null>(initial?.id ?? null)
  const [editing, setEditing]   = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState(false)

  const iCls = 'w-full px-2.5 py-1.5 text-sm rounded-lg ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition bg-white'

  async function save(questions: CustomQuestion[]) {
    setSaving(true)
    const supabase = createClient()
    const payload = { retreat_id: retreat.id, custom_questions: questions, updated_at: new Date().toISOString() }
    if (questId) {
      await supabase.from('feedback_questionnaires').update(payload).eq('id', questId)
    } else {
      const { data } = await supabase.from('feedback_questionnaires').insert(payload).select('id').single()
      if (data) setQuestId(data.id)
    }
    setSaving(false)
    onSaved()
  }

  function addQuestion() {
    const q: CustomQuestion = { id: newId(), label: 'New question', type: 'text', required: false }
    const next = [...customQs, q]
    setCustomQs(next)
    setEditing(q.id)
    save(next)
  }

  function deleteQuestion(id: string) {
    const next = customQs.filter(q => q.id !== id)
    setCustomQs(next)
    if (editing === id) setEditing(null)
    save(next)
  }

  function updateQuestion(id: string, patch: Partial<CustomQuestion>) {
    const next = customQs.map(q => q.id === id ? { ...q, ...patch } : q)
    setCustomQs(next)
    save(next)
  }

  function copyLink() {
    const url = `${window.location.origin}/feedback/${retreat.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Share link */}
      <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm font-semibold text-stone-800">Participant feedback link</p>
          <p className="text-xs text-stone-400 mt-0.5">Send this to participants after the retreat — anyone with the link can submit.</p>
          <code className="text-xs text-stone-500 bg-stone-50 rounded px-2 py-0.5 mt-1 inline-block">
            {typeof window !== 'undefined' ? `${window.location.origin}/feedback/${retreat.id}` : `/feedback/${retreat.id}`}
          </code>
        </div>
        <button onClick={copyLink}
          className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition shrink-0',
            copied ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-white hover:bg-stone-700')}>
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {/* Standard questions (read-only preview) */}
      <div className="bg-white ring-1 ring-stone-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <p className="text-sm font-semibold text-stone-800">Standard questions <span className="text-stone-400 font-normal">(always included)</span></p>
        </div>
        <div className="px-5 py-3 space-y-1.5">
          {['Name (optional)', 'Email (optional)', 'How likely to recommend? (NPS 0–10)', 'What did you love most?', 'What could have been better?'].map(q => (
            <p key={q} className="text-sm text-stone-600 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-stone-300 shrink-0" /> {q}
            </p>
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
          <p className="text-sm text-stone-400 text-center py-8">No custom questions — participants will see the standard questions above.</p>
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
                              q.type === t.key ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300')}>
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
        {saving && <p className="text-xs text-stone-400 text-center py-2">Saving…</p>}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function TabPill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
        active ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700')}>
      {icon} {label}
    </button>
  )
}

function StatTile({ label, value, tone = 'stone' }: { label: string; value: string | number; tone?: 'stone' | 'emerald' | 'rose' }) {
  const colors = { stone: 'text-stone-900', emerald: 'text-emerald-700', rose: 'text-rose-600' }
  return (
    <div className="bg-white ring-1 ring-stone-200 rounded-2xl p-4 text-center">
      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums', colors[tone])}>{value}</p>
    </div>
  )
}
