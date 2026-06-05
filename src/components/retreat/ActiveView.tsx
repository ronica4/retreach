'use client'

import { useState } from 'react'
import { type Retreat, type Vendor, type Participant, type ScheduleItem } from '@/types'
import AgentPanel from './AgentPanel'
import { formatDate } from '@/lib/utils'
import { Phone, Mail, Clock, MapPin } from 'lucide-react'

interface Props {
  retreat: Retreat
  vendors: Vendor[]
  participants: Participant[]
  schedule: ScheduleItem[]
}

const categoryColors: Record<string, string> = {
  hotel: 'bg-blue-100 text-blue-700',
  food: 'bg-orange-100 text-orange-700',
  transport: 'bg-purple-100 text-purple-700',
  flights: 'bg-sky-100 text-sky-700',
  merch: 'bg-pink-100 text-pink-700',
  attraction: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
}

export default function ActiveView({ retreat, vendors, participants, schedule }: Props) {
  const [view, setView] = useState<'schedule' | 'vendors' | 'participants'>('schedule')

  const today = new Date().toISOString().split('T')[0]
  const todayItems = schedule.filter(s => s.date === today)

  const groupedSchedule = schedule.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item)
    return acc
  }, {} as Record<string, ScheduleItem[]>)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {/* Today's briefing */}
        {todayItems.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-2">Today — {formatDate(today)}</h3>
            <div className="space-y-1.5">
              {todayItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-green-700">
                  <Clock size={13} />
                  <span className="font-medium">{item.start_time}</span>
                  <span>{item.title}</span>
                  {item.location && <span className="text-green-500 flex items-center gap-0.5"><MapPin size={11} />{item.location}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 border-b border-gray-200">
          {(['schedule', 'vendors', 'participants'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                view === tab ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {view === 'schedule' && (
          <div className="space-y-4">
            {Object.entries(groupedSchedule).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {formatDate(date)} {date === today && '· Today'}
                </h3>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                      <div className="text-sm text-gray-500 w-16 shrink-0 font-mono">{item.start_time}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        {item.location && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-0.5"><MapPin size={10} />{item.location}</p>}
                        {item.vendor && <p className="text-xs text-indigo-600 mt-0.5">{item.vendor.name}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedSchedule).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No schedule items yet.</p>
            )}
          </div>
        )}

        {view === 'vendors' && (
          <div className="space-y-2">
            {vendors.map(v => (
              <div key={v.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{v.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${categoryColors[v.category]}`}>{v.category}</span>
                  </div>
                  {v.contact_name && <p className="text-xs text-gray-500 mt-0.5">{v.contact_name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {v.contact_phone && (
                    <a href={`tel:${v.contact_phone}`} className="text-gray-400 hover:text-indigo-600 transition-colors">
                      <Phone size={15} />
                    </a>
                  )}
                  {v.contact_email && (
                    <a href={`mailto:${v.contact_email}`} className="text-gray-400 hover:text-indigo-600 transition-colors">
                      <Mail size={15} />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {vendors.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No vendors added.</p>}
          </div>
        )}

        {view === 'participants' && (
          <div className="space-y-2">
            {participants.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    p.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {p.payment_status}
                  </span>
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="text-gray-400 hover:text-indigo-600 transition-colors">
                      <Phone size={15} />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {participants.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No participants yet.</p>}
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <AgentPanel retreat={retreat} vendors={vendors} participants={participants} schedule={schedule} />
      </div>
    </div>
  )
}
