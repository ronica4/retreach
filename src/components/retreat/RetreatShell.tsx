'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type Retreat } from '@/types'
import { getRetreatStage, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ArrowLeft, MapPin, Calendar } from 'lucide-react'

interface Props {
  retreat: Retreat
  children: React.ReactNode
}

const tabs = [
  { stage: 'planning', label: 'Planning' },
  { stage: 'active', label: 'Active' },
  { stage: 'closed', label: 'Closed' },
]

export default function RetreatShell({ retreat, children }: Props) {
  const pathname = usePathname()
  const currentStage = getRetreatStage(retreat)

  return (
    <div className="space-y-0">
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={14} />
          All retreats
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{retreat.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1"><MapPin size={13} />{retreat.destination}</span>
              <span className="flex items-center gap-1"><Calendar size={13} />{formatDate(retreat.start_date)} – {formatDate(retreat.end_date)}</span>
            </div>
          </div>
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide',
            currentStage === 'planning' && 'bg-blue-100 text-blue-700',
            currentStage === 'active' && 'bg-green-100 text-green-700',
            currentStage === 'closed' && 'bg-gray-100 text-gray-600',
          )}>
            {currentStage}
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0">
          {tabs.map(({ stage, label }) => {
            const href = `/retreat/${retreat.id}/${stage}`
            const isActive = pathname.endsWith(`/${stage}`)
            const isCurrent = currentStage === stage

            return (
              <Link
                key={stage}
                href={href}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {label}
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {children}
    </div>
  )
}
