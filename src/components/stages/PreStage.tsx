'use client'

import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'
import { formatDate, formatCurrency, daysUntil } from '@/lib/utils'
import { Calendar, MapPin, Users, Handshake, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
}

export default function PreStage({ retreat, vendors, participants, schedule }: Props) {
  const { id } = useParams<{ id: string }>()
  const days = daysUntil(retreat.start_date)

  const confirmedVendors  = vendors.filter(v => v.status === 'confirmed' || v.status === 'completed')
  const pendingVendors    = vendors.filter(v => v.status === 'pending')
  const cancelledVendors  = vendors.filter(v => v.status === 'cancelled')

  const paidParticipants  = participants.filter(p => p.payment_status === 'paid')
  const unpaidParticipants = participants.filter(p => p.payment_status === 'unpaid')

  const today = new Date().toISOString().split('T')[0]
  const overdueVendors = vendors.filter(v => v.deadline && v.deadline < today && v.status === 'pending')

  const alerts: string[] = []
  if (overdueVendors.length > 0) alerts.push(`${overdueVendors.length} vendor deadline${overdueVendors.length > 1 ? 's' : ''} overdue`)
  if (unpaidParticipants.length > 0) alerts.push(`${unpaidParticipants.length} guest${unpaidParticipants.length > 1 ? 's' : ''} haven't paid`)
  if (schedule.length === 0) alerts.push('No agenda items scheduled yet')
  if (!retreat.concept) alerts.push('No retreat concept defined')

  const isReady = alerts.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Pre-event overview</h1>
        <p className="text-sm text-stone-400 mt-0.5">Everything at a glance before the retreat starts</p>
      </div>

      {/* Countdown */}
      <div className={`rounded-2xl p-5 ring-1 card ${days > 7 ? 'bg-emerald-50 ring-emerald-200' : days > 0 ? 'bg-amber-50 ring-amber-200' : 'bg-stone-100 ring-stone-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-3xl font-bold ${days > 7 ? 'text-emerald-700' : days > 0 ? 'text-amber-700' : 'text-stone-600'}`}>
              {days > 0 ? `${days} days` : days === 0 ? 'Today!' : 'Started'}
            </p>
            <p className={`text-sm mt-1 ${days > 7 ? 'text-emerald-600' : days > 0 ? 'text-amber-600' : 'text-stone-500'}`}>
              {days > 0 ? `until ${retreat.name}` : 'retreat is live'}
            </p>
          </div>
          <div className="text-sm text-right">
            <div className="flex items-center gap-1.5 text-stone-600 justify-end">
              <MapPin size={13} />{retreat.destination}
            </div>
            <div className="flex items-center gap-1.5 text-stone-500 mt-1 justify-end">
              <Calendar size={13} />{formatDate(retreat.start_date)} – {formatDate(retreat.end_date)}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Needs attention</span>
          </div>
          <ul className="space-y-1">
            {alerts.map((a, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isReady && (
        <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">All clear — you're ready for the retreat!</p>
        </div>
      )}

      {/* Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vendors */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Handshake size={15} className="text-stone-400" />
            <span className="text-sm font-semibold text-stone-900">Vendors</span>
            <span className="ml-auto text-xs text-stone-400">{vendors.length} total</span>
          </div>
          <div className="space-y-2">
            <StatusRow label="Confirmed" count={confirmedVendors.length} total={vendors.length} color="emerald" />
            <StatusRow label="Pending" count={pendingVendors.length} total={vendors.length} color="amber" />
            {cancelledVendors.length > 0 && <StatusRow label="Cancelled" count={cancelledVendors.length} total={vendors.length} color="rose" />}
          </div>
          {overdueVendors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <p className="text-xs font-semibold text-rose-600 mb-1.5">Overdue</p>
              {overdueVendors.map(v => (
                <p key={v.id} className="text-xs text-stone-600">{v.name} — due {formatDate(v.deadline!)}</p>
              ))}
            </div>
          )}
          <Link href={`/retreat/${id}/vendors`} className="mt-3 block text-xs text-emerald-600 hover:text-emerald-800 font-medium">
            Go to vendors →
          </Link>
        </div>

        {/* Participants */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-stone-400" />
            <span className="text-sm font-semibold text-stone-900">Guests</span>
            <span className="ml-auto text-xs text-stone-400">{participants.length} registered</span>
          </div>
          <div className="space-y-2">
            <StatusRow label="Paid" count={paidParticipants.length} total={participants.length} color="emerald" />
            <StatusRow label="Partial" count={participants.filter(p => p.payment_status === 'partial').length} total={participants.length} color="amber" />
            <StatusRow label="Unpaid" count={unpaidParticipants.length} total={participants.length} color="stone" />
          </div>
          <Link href={`/retreat/${id}/participants`} className="mt-3 block text-xs text-emerald-600 hover:text-emerald-800 font-medium">
            Go to participants →
          </Link>
        </div>

        {/* Schedule */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-stone-400" />
            <span className="text-sm font-semibold text-stone-900">Schedule</span>
            <span className="ml-auto text-xs text-stone-400">{schedule.length} items</span>
          </div>
          {schedule.slice(0, 4).map(item => (
            <div key={item.id} className="flex items-start gap-2 py-1.5 border-b border-stone-50 last:border-0">
              <span className="text-xs text-stone-400 font-mono w-14 shrink-0">{item.start_time}</span>
              <span className="text-xs text-stone-700">{item.title}</span>
            </div>
          ))}
          {schedule.length === 0 && <p className="text-xs text-stone-400">No items yet</p>}
          {schedule.length > 4 && <p className="text-xs text-stone-400 mt-1">+{schedule.length - 4} more</p>}
          <Link href={`/retreat/${id}/agenda`} className="mt-3 block text-xs text-emerald-600 hover:text-emerald-800 font-medium">
            Go to agenda →
          </Link>
        </div>

        {/* Budget */}
        <div className="bg-white ring-1 ring-stone-200 card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-stone-900">Budget</span>
          </div>
          <p className="text-2xl font-bold text-stone-900">{formatCurrency(vendors.reduce((s, v) => s + (v.cost ?? 0), 0))}</p>
          <p className="text-xs text-stone-400 mt-0.5">committed of {formatCurrency(retreat.budget)}</p>
          <div className="mt-3 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: retreat.budget > 0 ? `${Math.min((vendors.reduce((s, v) => s + (v.cost ?? 0), 0) / retreat.budget) * 100, 100)}%` : '0%' }}
            />
          </div>
          <p className="text-xs text-emerald-600 mt-1.5 font-medium">
            {formatCurrency(retreat.budget - vendors.reduce((s, v) => s + (v.cost ?? 0), 0))} remaining
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const barColor = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500', stone: 'bg-stone-300' }[color] ?? 'bg-stone-300'
  const textColor = { emerald: 'text-emerald-700', amber: 'text-amber-700', rose: 'text-rose-600', stone: 'text-stone-500' }[color] ?? 'text-stone-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-stone-500 w-16">{label}</span>
      <span className={`text-xs font-semibold ${textColor} w-4 text-right`}>{count}</span>
    </div>
  )
}
