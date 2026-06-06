'use client'

import { useState, useEffect } from 'react'
import { type Retreat, type Vendor, type Participant } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle2, Circle, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
}

interface Checklist {
  payments: boolean
  invoices: boolean
  feedback: boolean
  archive: boolean
}

const LS_KEY = (id: string) => `retreach_closing_${id}`
const DEFAULT: Checklist = { payments: false, invoices: false, feedback: false, archive: false }

const ITEMS: { key: keyof Checklist; label: string; desc: string }[] = [
  { key: 'payments', label: 'Collect outstanding payments', desc: 'Ensure all participant payments are settled' },
  { key: 'invoices', label: 'Settle vendor invoices', desc: 'Pay or confirm payment of all vendor invoices' },
  { key: 'feedback', label: 'Send feedback survey', desc: 'Distribute NPS survey to all participants' },
  { key: 'archive', label: 'Archive retreat materials', desc: 'Upload photos, decks, and notes to Content library' },
]

export default function ClosingStage({ retreat, vendors, participants }: Props) {
  const [checklist, setChecklist] = useState<Checklist>(DEFAULT)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY(retreat.id))
      if (saved) setChecklist({ ...DEFAULT, ...JSON.parse(saved) })
    } catch { /* */ }
  }, [retreat.id])

  function toggle(key: keyof Checklist) {
    const updated = { ...checklist, [key]: !checklist[key] }
    setChecklist(updated)
    localStorage.setItem(LS_KEY(retreat.id), JSON.stringify(updated))
  }

  const done = Object.values(checklist).filter(Boolean).length
  const total = ITEMS.length
  const allDone = done === total
  const checkPct = Math.round(done / total * 100)

  const paid        = participants.filter(p => p.payment_status === 'paid').length
  const outstanding = participants.filter(p => p.payment_status !== 'paid').length
  const totalSpend  = vendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const grossMargin = retreat.budget - totalSpend
  const rated       = vendors.filter(v => v.rating !== null).length

  function exportSummary() {
    const lines = [
      `# ${retreat.name} — Retreat Wrap-Up`,
      ``,
      `**Destination:** ${retreat.destination}`,
      `**Dates:** ${formatDate(retreat.start_date)} – ${formatDate(retreat.end_date)}`,
      `**Budget:** ${formatCurrency(retreat.budget)}`,
      ``,
      `## Financials`,
      `- Total spend: ${formatCurrency(totalSpend)}`,
      `- Gross margin: ${formatCurrency(grossMargin)} (${retreat.budget > 0 ? Math.round((grossMargin / retreat.budget) * 100) : 0}%)`,
      ``,
      `## Participants`,
      `- Total: ${participants.length} (${paid} paid, ${outstanding} outstanding)`,
      ...participants.map(p => `  - ${p.name} (${p.email}) — ${p.payment_status}`),
      ``,
      `## Vendors`,
      ...vendors.map(v => `- **${v.name}** (${v.category}) — ${v.cost != null ? formatCurrency(v.cost) : 'N/A'}${v.rating != null ? ` — ${v.rating}/5 ★` : ''}`),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${retreat.name.replace(/\s+/g, '-')}-wrap-up.md` })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-stone-900">Closing</h1>
        <p className="text-sm text-stone-400 mt-0.5">Wrap up and archive your retreat</p>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Final spend" value={formatCurrency(totalSpend)} sub={`Budget: ${formatCurrency(retreat.budget)}`} tone="stone" />
        <Stat label="Gross margin"
          value={formatCurrency(Math.abs(grossMargin))}
          sub={grossMargin >= 0 ? 'under budget' : 'over budget'}
          tone={grossMargin >= 0 ? 'emerald' : 'rose'}
          icon={grossMargin >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} />
        <Stat label="Payments" value={`${paid}/${participants.length}`} sub={`${outstanding} outstanding`}
          tone={outstanding ? 'amber' : 'emerald'} />
        <Stat label="Tasks done" value={`${done}/${total}`} sub={`${checkPct}% complete`}
          tone={allDone ? 'emerald' : 'stone'} progress={checkPct} />
      </div>

      {allDone && (
        <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-4 flex items-center gap-3 mb-4 fade-up">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">All done — great retreat!</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Checklist */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">Closing checklist</h2>
            <span className="text-xs text-stone-400">{done}/{total}</span>
          </div>
          <div className="divide-y divide-stone-100">
            {ITEMS.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => toggle(key)}
                className="w-full flex items-start gap-4 px-5 py-4 hover:bg-stone-50 transition-colors text-left"
              >
                {checklist[key]
                  ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5 pop-check" />
                  : <Circle size={18} className="text-stone-300 shrink-0 mt-0.5" />
                }
                <div>
                  <p className={cn('text-sm font-medium', checklist[key] ? 'text-stone-400 line-through' : 'text-stone-900')}>{label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="px-5 pb-4 pt-2">
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${checkPct}%` }} />
            </div>
          </div>
        </div>

        {/* Summary report preview */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-900">Wrap-up report</h2>
            <button
              onClick={exportSummary}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={12} /> Export
            </button>
          </div>

          {/* report preview */}
          <div className="space-y-3 text-sm text-stone-700">
            <div>
              <p className="font-bold text-stone-900 text-base">{retreat.name}</p>
              <p className="text-xs text-stone-400">{retreat.destination && `${retreat.destination} · `}{formatDate(retreat.start_date)} – {formatDate(retreat.end_date)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-stone-50 ring-1 ring-stone-200 rounded-xl p-3">
                <p className="text-xs text-stone-400 font-medium mb-0.5">Budget</p>
                <p className="font-semibold text-stone-900">{formatCurrency(retreat.budget)}</p>
              </div>
              <div className={cn('ring-1 rounded-xl p-3', grossMargin >= 0 ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200')}>
                <p className="text-xs text-stone-400 font-medium mb-0.5">Margin</p>
                <p className={cn('font-semibold', grossMargin >= 0 ? 'text-emerald-700' : 'text-rose-600')}>{formatCurrency(Math.abs(grossMargin))}</p>
              </div>
            </div>

            <div className="divide-y divide-stone-100">
              <div className="py-2 flex justify-between">
                <span className="text-stone-500">Participants</span>
                <span className="font-semibold text-stone-900">{participants.length} ({paid} paid)</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-stone-500">Vendors</span>
                <span className="font-semibold text-stone-900">{vendors.length} ({rated} rated)</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-stone-500">Total spend</span>
                <span className="font-semibold text-stone-900">{formatCurrency(totalSpend)}</span>
              </div>
            </div>

            {vendors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-400 mb-1.5 uppercase tracking-wide">Vendors</p>
                <div className="space-y-1">
                  {vendors.slice(0, 5).map(v => (
                    <div key={v.id} className="flex items-center justify-between text-xs">
                      <span className="text-stone-700 font-medium">{v.name}</span>
                      <span className="text-stone-400">{v.cost != null ? formatCurrency(v.cost) : '—'}</span>
                    </div>
                  ))}
                  {vendors.length > 5 && <p className="text-xs text-stone-400">+{vendors.length - 5} more in export</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, tone = 'stone', progress, icon }: {
  label: string; value: string; sub: string; tone?: string; progress?: number; icon?: React.ReactNode
}) {
  const vals: Record<string, string> = { stone: 'text-stone-900', emerald: 'text-emerald-700', rose: 'text-rose-600', amber: 'text-amber-600' }
  const bars: Record<string, string> = { stone: 'bg-stone-400', emerald: 'bg-emerald-500', rose: 'bg-rose-500', amber: 'bg-amber-400' }
  return (
    <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{label}</p>
        {icon && <span className={vals[tone] ?? vals.stone}>{icon}</span>}
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', vals[tone] ?? vals.stone)}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      {progress != null && (
        <div className="mt-2 h-1 rounded-full bg-stone-100 overflow-hidden">
          <div className={cn('h-full rounded-full transition-[width] duration-500', bars[tone] ?? bars.stone)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  )
}
