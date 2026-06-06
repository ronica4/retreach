'use client'

import { useState } from 'react'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'
import VendorSection from './VendorSection'
import ScheduleSection from './ScheduleSection'
import ParticipantSection from './ParticipantSection'
import AgentPanel from './AgentPanel'
import { formatCurrency } from '@/lib/utils'
import { Users, Building2, Calendar, DollarSign } from 'lucide-react'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
}

export default function PlanningView({ retreat, vendors, participants, schedule }: Props) {
  const [activeTab, setActiveTab] = useState<'vendors' | 'schedule' | 'participants'>('vendors')

  const spent = vendors.reduce((sum, v) => sum + (v.cost ?? 0), 0)
  const budgetPct = retreat.budget > 0 ? Math.min((spent / retreat.budget) * 100, 100) : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Building2 size={16} />} label="Vendors" value={vendors.length} />
          <StatCard icon={<Users size={16} />} label="Participants" value={participants.length} />
          <StatCard icon={<Calendar size={16} />} label="Schedule items" value={schedule.length} />
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
              <DollarSign size={14} /> Budget
            </span>
            <span className="text-sm text-stone-400">
              {formatCurrency(spent)} / {formatCurrency(retreat.budget)}
            </span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-rose-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          <p className="text-xs text-stone-400 mt-1">{formatCurrency(retreat.budget - spent)} remaining</p>
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-stone-200 card overflow-hidden">
          <div className="flex border-b border-stone-200">
            {(['vendors', 'schedule', 'participants'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-emerald-700 border-b-2 border-emerald-700 bg-emerald-50'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'vendors'      && <VendorSection retreat={retreat} vendors={vendors} />}
            {activeTab === 'schedule'     && <ScheduleSection retreat={retreat} schedule={schedule} vendors={vendors} />}
            {activeTab === 'participants' && <ParticipantSection retreat={retreat} participants={participants} />}
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <AgentPanel retreat={retreat} vendors={vendors} participants={participants} schedule={schedule} />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-stone-200 card p-4 flex items-center gap-3">
      <div className="text-emerald-600">{icon}</div>
      <div>
        <p className="text-xl font-bold text-stone-900">{value}</p>
        <p className="text-xs text-stone-400">{label}</p>
      </div>
    </div>
  )
}
