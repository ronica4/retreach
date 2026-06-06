'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type Retreat } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Sprout, ArrowLeft, MapPin, Calendar,
  Compass, Handshake, Users, CalendarDays, LayoutDashboard,
  Zap, Star, MessageSquare, FolderOpen, CheckCircle2, Bell, ChevronDown,
} from 'lucide-react'

interface Props {
  retreat: Retreat
  vendorCount: number
  participantCount: number
}

const PHASES = [
  {
    group: 'BEFORE',
    stages: [
      { id: 'planning',     label: 'Planning',      Icon: Compass,          desc: 'Retreat concept & details' },
      { id: 'vendors',      label: 'Vendors',        Icon: Handshake,        desc: 'Manage suppliers' },
      { id: 'participants', label: 'Participants',   Icon: Users,            desc: 'Guest registration' },
      { id: 'agenda',         label: 'Agenda',         Icon: CalendarDays,     desc: 'Schedule & timeline' },
      { id: 'notifications',  label: 'Notifications',  Icon: Bell,             desc: 'Reminders & comms' },
      { id: 'pre',            label: 'Pre-event',      Icon: LayoutDashboard,  desc: 'Final overview' },
    ],
  },
  {
    group: 'DURING',
    stages: [
      { id: 'during',       label: 'During',         Icon: Zap,              desc: 'Live operations' },
    ],
  },
  {
    group: 'AFTER',
    stages: [
      { id: 'reviews',      label: 'Reviews',        Icon: Star,             desc: 'Rate vendors' },
      { id: 'feedback',     label: 'Feedback',       Icon: MessageSquare,    desc: 'Guest NPS' },
      { id: 'content',      label: 'Content',        Icon: FolderOpen,       desc: 'Media & materials' },
      { id: 'closing',      label: 'Closing',        Icon: CheckCircle2,     desc: 'Wrap-up' },
    ],
  },
]

export default function RetreatSidebar({ retreat, vendorCount, participantCount }: Props) {
  const pathname = usePathname()

  // Which group holds the stage the user is currently on
  const activeGroup =
    PHASES.find(p => p.stages.some(s => pathname.endsWith(`/${s.id}`)))?.group ?? 'BEFORE'

  // Start with only the active group expanded so the menu isn't overwhelming
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    BEFORE: activeGroup === 'BEFORE',
    DURING: activeGroup === 'DURING',
    AFTER: activeGroup === 'AFTER',
  }))

  const toggleGroup = (group: string) =>
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))

  return (
    <aside className="w-64 shrink-0 bg-emerald-950 flex flex-col h-full overflow-y-auto nice-scroll">
      {/* Logo + back */}
      <div className="px-4 pt-5 pb-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} /> All retreats
        </Link>
        <div className="flex items-center gap-2 mt-4 mb-0.5">
          <div className="size-7 rounded-lg bg-emerald-700 grid place-items-center text-white shrink-0">
            <Sprout size={13} />
          </div>
          <span className="text-sm font-semibold text-white">Retreat OS</span>
        </div>
      </div>

      {/* Retreat info */}
      <div className="mx-3 mb-4 bg-emerald-900/60 rounded-xl p-3 ring-1 ring-emerald-800/50">
        <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{retreat.name}</p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-300">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{retreat.destination}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-300">
            <Calendar size={11} className="shrink-0" />
            <span>{formatDate(retreat.start_date)} – {formatDate(retreat.end_date)}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-3 mb-5 space-y-2.5">
        <SidebarProgress label="Vendors" count={vendorCount} />
        <SidebarProgress label="Guests" count={participantCount} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pb-6">
        {PHASES.map(({ group, stages }) => {
          const open = openGroups[group]
          return (
            <div key={group} className="mb-5">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={open}
                className="w-full flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold tracking-widest text-emerald-500 hover:text-emerald-300 uppercase transition-colors"
              >
                {group}
                <ChevronDown
                  size={13}
                  className={cn('transition-transform duration-200', open ? 'rotate-0' : '-rotate-90')}
                />
              </button>
              {open && (
                <div className="space-y-0.5">
                  {stages.map(({ id, label, Icon }) => {
                    const href = `/retreat/${retreat.id}/${id}`
                    const active = pathname.endsWith(`/${id}`)
                    return (
                      <Link
                        key={id}
                        href={href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                          active
                            ? 'bg-emerald-700 text-white font-medium'
                            : 'text-emerald-300 hover:bg-emerald-900/70 hover:text-white'
                        )}
                      >
                        <Icon size={15} className="shrink-0" />
                        {label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

function SidebarProgress({ label, count }: { label: string; count: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-emerald-400 mb-1">
        <span>{label}</span>
        <span className="font-medium text-emerald-300">{count}</span>
      </div>
      <div className="h-1 bg-emerald-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: count > 0 ? `${Math.min((count / 15) * 100, 100)}%` : '0%' }}
        />
      </div>
    </div>
  )
}
