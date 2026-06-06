'use client'

import { useState, useEffect } from 'react'
import { type Retreat, type Vendor, type Participant } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle2, Circle, Download } from 'lucide-react'

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

  const paid       = participants.filter(p => p.payment_status === 'paid').length
  const totalSpend = vendors.reduce((s, v) => s + (v.cost ?? 0), 0)
  const rated      = vendors.filter(v => v.rating !== null).length

  function exportSummary() {
    const lines = [
      `# ${retreat.name} — Retreat Wrap-Up`,
      ``,
      `**Destination:** ${retreat.destination}`,
      `**Dates:** ${formatDate(retreat.start_date)} – ${formatDate(retreat.end_date)}`,
      `**Budget:** ${formatCurrency(retreat.budget)}`,
      ``,
      `## Summary`,
      `- Participants: ${participants.length} (${paid} paid)`,
      `- Vendors: ${vendors.length} (${rated} rated)`,
      `- Total spend: ${formatCurrency(totalSpend)}`,
      `- Under budget: ${formatCurrency(retreat.budget - totalSpend)}`,
      ``,
      `## Vendors`,
      ...vendors.map(v => `- **${v.name}** (${v.category}) — ${v.cost != null ? formatCurrency(v.cost) : 'N/A'}${v.rating != null ? ` — ${v.rating}/5 ⭐` : ''}`),
      ``,
      `## Participants`,
      ...participants.map(p => `- ${p.name} (${p.email}) — ${p.payment_status}`),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${retreat.name.replace(/\s+/g, '-')}-wrap-up.md` })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Closing</h1>
        <p className="text-sm text-stone-400 mt-0.5">Wrap up and archive your retreat</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
          <p className="text-2xl font-bold text-stone-900">{participants.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Participants</p>
        </div>
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
          <p className="text-2xl font-bold text-stone-900">{paid}/{participants.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Payments collected</p>
        </div>
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-4">
          <p className="text-2xl font-bold text-stone-900">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-stone-400 mt-0.5">Total spent</p>
          <p className="text-xs text-emerald-600 mt-0.5">{formatCurrency(retreat.budget - totalSpend)} under budget</p>
        </div>
      </div>

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
                <p className={`text-sm font-medium ${checklist[key] ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {allDone && (
        <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-4 flex items-center gap-3 fade-up">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">All done — great retreat!</p>
        </div>
      )}

      {/* Export */}
      <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-stone-900 mb-1">Export summary</h2>
        <p className="text-xs text-stone-400 mb-4">Download a markdown report of the retreat for your records.</p>
        <button
          onClick={exportSummary}
          className="flex items-center gap-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors"
        >
          <Download size={15} /> Download wrap-up report
        </button>
      </div>
    </div>
  )
}
