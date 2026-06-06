'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Retreat, type Notification } from '@/types'
import { formatDate } from '@/lib/utils'
import { Bell, Send, RefreshCw, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Mail, MessageSquare, Smartphone, Zap, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  retreat: Retreat
  notifications: Notification[]
}

const CHANNEL_BADGE: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  email: { label: 'Email',  cls: 'bg-blue-50 text-blue-700 ring-blue-200',   Icon: Mail },
  sms:   { label: 'SMS',    cls: 'bg-purple-50 text-purple-700 ring-purple-200', Icon: MessageSquare },
  push:  { label: 'Push',   cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Smartphone },
}

const STATUS_BADGE: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-amber-200',   Icon: Clock },
  sent:    { label: 'Sent',    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: CheckCircle2 },
  failed:  { label: 'Failed',  cls: 'bg-rose-50 text-rose-700 ring-rose-200',       Icon: XCircle },
}

const TYPE_BADGE: Record<string, string> = {
  vendor:      'bg-stone-100 text-stone-600',
  participant: 'bg-emerald-100 text-emerald-700',
  manager:     'bg-blue-100 text-blue-700',
}

const QUICK_OPTIONS = [
  { label: 'Tomorrow',  days: 1 },
  { label: 'In 2 days', days: 2 },
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
]

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(8, 0, 0, 0)
  return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM for datetime-local
}

export default function NotificationsStage({ retreat, notifications: initial }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(initial)
  const [generating, setGenerating]       = useState(false)
  const [runningCron, setRunningCron]     = useState(false)
  const [filter, setFilter]               = useState<'all' | 'pending' | 'sent'>('all')
  const [sendingId, setSendingId]         = useState<string | null>(null)
  const [toast, setToast]                 = useState<string | null>(null)

  const [showReminder, setShowReminder]   = useState(false)
  const [reminderSubject, setReminderSubject] = useState('')
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderQuick, setReminderQuick] = useState<number | null>(null)
  const [reminderCustom, setReminderCustom] = useState('')
  const [savingReminder, setSavingReminder] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function scheduleReminder(e: React.FormEvent) {
    e.preventDefault()
    const scheduledFor = reminderQuick !== null
      ? new Date(daysFromNow(reminderQuick)).toISOString()
      : reminderCustom ? new Date(reminderCustom).toISOString() : null
    if (!scheduledFor) return
    setSavingReminder(true)
    try {
      const res = await fetch('/api/notifications/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retreatId: retreat.id,
          subject: reminderSubject,
          message: reminderMessage,
          scheduledFor,
        }),
      })
      if (res.ok) {
        showToast('Reminder scheduled — you\'ll get an email when it\'s due.')
        setShowReminder(false)
        setReminderSubject('')
        setReminderMessage('')
        setReminderQuick(null)
        setReminderCustom('')
        router.refresh()
      } else {
        const d = await res.json()
        showToast(d.error ?? 'Failed to schedule reminder')
      }
    } finally {
      setSavingReminder(false)
    }
  }

  async function generateReminders() {
    setGenerating(true)
    try {
      const res = await fetch('/api/notifications/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retreatId: retreat.id }),
      })
      const data = await res.json()
      showToast(data.message ?? 'Done')
      router.refresh()
    } finally {
      setGenerating(false)
    }
  }

  async function simulateCron() {
    setRunningCron(true)
    try {
      const res = await fetch('/api/cron/reminders')
      const data = await res.json()
      showToast(data.message ?? 'Cron ran')
      router.refresh()
    } finally {
      setRunningCron(false)
    }
  }

  async function sendNow(id: string) {
    setSendingId(id)
    try {
      await fetch(`/api/notifications/${id}/send`, { method: 'POST' })
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: 'sent', sent_at: new Date().toISOString() } : n)
      )
      showToast('Notification marked as sent')
    } finally {
      setSendingId(null)
    }
  }

  const pending = notifications.filter(n => n.status === 'pending').length
  const sent    = notifications.filter(n => n.status === 'sent').length
  const failed  = notifications.filter(n => n.status === 'failed').length

  const visible = filter === 'all' ? notifications
    : notifications.filter(n => n.status === filter)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 fade-up">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
            <Bell size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Communications</p>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">Notifications</h1>
            <p className="text-sm text-stone-400 mt-0.5">Deadline reminders and participant communications.</p>
          </div>
        </div>
      </div>

      {/* Architecture banner */}
      <div className="bg-stone-900 rounded-2xl p-5 mb-5 fade-up">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Production architecture</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <ArchChip label="Vercel Cron" sub="runs daily 8am" color="emerald" />
          <Arrow />
          <ArchChip label="Supabase queue" sub="notifications table" color="blue" />
          <Arrow />
          <div className="flex gap-2">
            <ArchChip label="Email" sub="Resend API" color="purple" />
            <ArchChip label="SMS" sub="Twilio" color="purple" />
            <ArchChip label="Push" sub="Firebase" color="purple" />
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-3">
          The cron job runs on Vercel&apos;s servers every day — no browser needed, no one needs to be logged in.
          Click <strong className="text-stone-300">"Simulate cron"</strong> to run it now and see it queue real notifications.
          In production, clicking <strong className="text-stone-300">"Send"</strong> calls Resend or Twilio instead of marking the record.
        </p>
      </div>

      {/* Self-reminder card */}
      <div className="bg-white ring-1 ring-stone-200 card rounded-2xl mb-5 overflow-hidden fade-up">
        <button
          onClick={() => setShowReminder(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50 transition text-left"
        >
          <div className="size-8 rounded-xl bg-blue-100 text-blue-700 grid place-items-center shrink-0">
            <Bell size={14} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-800">Schedule a reminder to yourself</p>
            <p className="text-xs text-stone-400">Get an email in your inbox at the right time</p>
          </div>
          {showReminder
            ? <X size={15} className="text-stone-400 shrink-0" />
            : <Plus size={15} className="text-stone-400 shrink-0" />}
        </button>

        {showReminder && (
          <form onSubmit={scheduleReminder} className="px-5 pb-5 space-y-4 border-t border-stone-100 pt-4">
            {/* Subject */}
            <div>
              <label className="text-xs font-semibold text-stone-400 mb-1 block">Subject *</label>
              <input
                required
                value={reminderSubject}
                onChange={e => setReminderSubject(e.target.value)}
                placeholder="e.g. Check hotel confirmations"
                className="w-full px-3 py-2 text-sm bg-stone-50 rounded-xl ring-1 ring-stone-200 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-semibold text-stone-400 mb-1 block">Note (optional)</label>
              <textarea
                rows={2}
                value={reminderMessage}
                onChange={e => setReminderMessage(e.target.value)}
                placeholder="What do you need to do?"
                className="w-full px-3 py-2 text-sm bg-stone-50 rounded-xl ring-1 ring-stone-200 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            {/* When */}
            <div>
              <label className="text-xs font-semibold text-stone-400 mb-2 block">Send when *</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {QUICK_OPTIONS.map(o => (
                  <button
                    key={o.days} type="button"
                    onClick={() => { setReminderQuick(o.days); setReminderCustom('') }}
                    className={cn(
                      'text-xs font-semibold px-3 py-1.5 rounded-xl ring-1 transition',
                      reminderQuick === o.days
                        ? 'bg-emerald-700 text-white ring-emerald-700'
                        : 'bg-stone-50 text-stone-600 ring-stone-200 hover:bg-stone-100'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setReminderQuick(null)}
                  className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-xl ring-1 transition',
                    reminderQuick === null && reminderCustom !== ''
                      ? 'bg-emerald-700 text-white ring-emerald-700'
                      : 'bg-stone-50 text-stone-600 ring-stone-200 hover:bg-stone-100'
                  )}
                >
                  Custom
                </button>
              </div>
              {reminderQuick === null && (
                <input
                  type="datetime-local"
                  value={reminderCustom}
                  onChange={e => setReminderCustom(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-stone-50 rounded-xl ring-1 ring-stone-200 focus:ring-emerald-500 outline-none"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowReminder(false)}
                className="text-sm px-4 py-2 rounded-xl ring-1 ring-stone-200 text-stone-600 hover:bg-stone-50">
                Cancel
              </button>
              <button type="submit" disabled={savingReminder || (!reminderQuick && !reminderCustom)}
                className="text-sm font-semibold px-5 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition flex items-center gap-1.5">
                <Clock size={13} />
                {savingReminder ? 'Scheduling…' : 'Schedule reminder'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <StatPill label="pending" count={pending} color="amber" active={filter === 'pending'} onClick={() => setFilter(f => f === 'pending' ? 'all' : 'pending')} />
          <StatPill label="sent"    count={sent}    color="emerald" active={filter === 'sent'}    onClick={() => setFilter(f => f === 'sent' ? 'all' : 'sent')} />
          {failed > 0 && <StatPill label="failed" count={failed} color="rose" active={false} onClick={() => {}} />}
        </div>
        <div className="flex gap-2">
          <button onClick={simulateCron} disabled={runningCron}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-50 transition">
            <Zap size={12} className={runningCron ? 'animate-pulse' : ''} />
            {runningCron ? 'Running…' : 'Simulate cron'}
          </button>
          <button onClick={generateReminders} disabled={generating}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition">
            <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating…' : 'Generate reminders'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg fade-up">
          {toast}
        </div>
      )}

      {/* Notification list */}
      {visible.length === 0 ? (
        <div className="text-center py-16 bg-white ring-1 ring-stone-200 card rounded-2xl">
          <Bell size={24} className="mx-auto mb-2 text-stone-300" />
          <p className="text-sm font-medium text-stone-600">No notifications yet</p>
          <p className="text-sm text-stone-400 mt-1">
            Click &ldquo;Generate reminders&rdquo; to draft messages for upcoming vendor deadlines, or &ldquo;Simulate cron&rdquo; to run the daily job now.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(n => (
            <NotificationRow key={n.id} notification={n} sending={sendingId === n.id} onSend={sendNow} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Notification row ───────────────────────────────────────────────────────

function NotificationRow({ notification: n, sending, onSend }: {
  notification: Notification; sending: boolean; onSend: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const channel = CHANNEL_BADGE[n.channel] ?? CHANNEL_BADGE.email
  const status  = STATUS_BADGE[n.status] ?? STATUS_BADGE.pending
  const ChannelIcon = channel.Icon
  const StatusIcon  = status.Icon

  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5">
        {/* Recipient */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize', TYPE_BADGE[n.recipient_type])}>
              {n.recipient_type}
            </span>
            <span className="text-sm font-semibold text-stone-900 truncate">
              {n.recipient_name ?? n.recipient_id}
            </span>
            {n.recipient_email && (
              <span className="text-xs text-stone-400 truncate hidden sm:block">{n.recipient_email}</span>
            )}
          </div>
          <p className="text-sm text-stone-600 truncate">{n.subject}</p>
          {n.scheduled_for && (
            <p className="text-xs text-stone-400 mt-0.5">
              {n.status === 'sent' && n.sent_at
                ? `Sent ${formatDate(n.sent_at)}`
                : `Scheduled for ${formatDate(n.scheduled_for)}`}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ring-1', channel.cls)}>
            <ChannelIcon size={10} /> {channel.label}
          </span>
          <span className={cn('flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ring-1', status.cls)}>
            <StatusIcon size={10} /> {status.label}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {n.status === 'pending' && (
            <button onClick={() => onSend(n.id)} disabled={sending}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition">
              <Send size={11} className={sending ? 'animate-pulse' : ''} />
              {sending ? 'Sending…' : 'Send'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-stone-100 pt-3">
          <p className="text-xs font-semibold text-stone-400 mb-1.5 uppercase tracking-wide">Message body</p>
          <pre className="text-sm text-stone-700 whitespace-pre-wrap font-sans leading-relaxed bg-stone-50 rounded-xl p-4 ring-1 ring-stone-100">
            {n.body}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Small UI helpers ───────────────────────────────────────────────────────

function ArchChip({ label, sub, color }: { label: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-900/60 text-emerald-300 ring-emerald-700/50',
    blue:    'bg-blue-900/40 text-blue-300 ring-blue-700/50',
    purple:  'bg-purple-900/40 text-purple-300 ring-purple-700/50',
  }
  return (
    <div className={cn('flex flex-col px-3 py-1.5 rounded-xl ring-1', colors[color])}>
      <span className="text-xs font-bold">{label}</span>
      <span className="text-[10px] opacity-70">{sub}</span>
    </div>
  )
}

function Arrow() {
  return <span className="text-stone-600 font-bold text-lg select-none">→</span>
}

function StatPill({ label, count, color, active, onClick }: {
  label: string; count: number; color: string; active: boolean; onClick: () => void
}) {
  const colors: Record<string, string> = {
    amber:   active ? 'bg-amber-600 text-white'   : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    emerald: active ? 'bg-emerald-700 text-white'  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    rose:    active ? 'bg-rose-600 text-white'     : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  }
  return (
    <button onClick={onClick}
      className={cn('text-xs font-semibold px-3 py-1.5 rounded-full transition', colors[color])}>
      {count} {label}
    </button>
  )
}
