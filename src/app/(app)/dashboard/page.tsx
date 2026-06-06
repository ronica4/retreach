import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getRetreatStage, formatDate, daysUntil, formatCurrency } from '@/lib/utils'
import { type Retreat } from '@/types'
import { Plus, MapPin, Calendar, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

const stageConfig = {
  planning: { label: 'Planning', color: 'bg-emerald-100 text-emerald-700' },
  active:   { label: 'Active',   color: 'bg-amber-100 text-amber-700' },
  closed:   { label: 'Closed',   color: 'bg-stone-100 text-stone-500' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: retreats } = await supabase
    .from('retreats')
    .select('*')
    .eq('manager_id', user!.id)
    .order('start_date', { ascending: false })

  const active   = retreats?.filter(r => getRetreatStage(r) === 'active')   ?? []
  const upcoming = retreats?.filter(r => getRetreatStage(r) === 'planning') ?? []
  const past     = retreats?.filter(r => getRetreatStage(r) === 'closed')   ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Your Retreats</h1>
          <p className="text-sm text-stone-400 mt-1">{retreats?.length ?? 0} total</p>
        </div>
        <Link
          href="/retreat/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 transition-colors shadow-sm"
        >
          <Plus size={16} />
          New retreat
        </Link>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Active now</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map(r => <RetreatCard key={r.id} retreat={r} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Upcoming</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map(r => <RetreatCard key={r.id} retreat={r} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Past retreats</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.map(r => <RetreatCard key={r.id} retreat={r} />)}
          </div>
        </section>
      )}

      {(!retreats || retreats.length === 0) && (
        <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-2xl">
          <p className="text-stone-400 mb-4">No retreats yet. Create your first one.</p>
          <Link
            href="/retreat/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 transition-colors shadow-sm"
          >
            <Plus size={16} />
            New retreat
          </Link>
        </div>
      )}
    </div>
  )
}

function RetreatCard({ retreat }: { retreat: Retreat }) {
  const stage = getRetreatStage(retreat)
  const { label, color } = stageConfig[stage]
  const days = daysUntil(retreat.start_date)

  return (
    <Link
      href={`/retreat/${retreat.id}/planning`}
      className="block bg-white rounded-2xl ring-1 ring-stone-200 card p-5 hover:ring-emerald-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors">
          {retreat.name}
        </h3>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', color)}>
          {label}
        </span>
      </div>

      <div className="space-y-1.5 text-sm text-stone-500">
        <div className="flex items-center gap-1.5">
          <MapPin size={13} />
          {retreat.destination}
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={13} />
          {formatDate(retreat.start_date)}
          {stage === 'planning' && days > 0 && (
            <span className="text-emerald-600 font-medium ml-1">· {days}d away</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign size={13} />
          {formatCurrency(retreat.budget)}
        </div>
      </div>
    </Link>
  )
}
