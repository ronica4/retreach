'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2, Check, X, Loader2 } from 'lucide-react'

/**
 * Floating delete affordance for a retreat card. Rendered as a sibling overlay
 * (not nested inside the card's <Link>) so it never triggers navigation.
 * Two-step confirm — deleting a retreat cascades to all its data.
 */
export default function DeleteRetreatButton({ retreatId }: { retreatId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }

  async function del(e: React.MouseEvent) {
    stop(e)
    setLoading(true)
    const supabase = createClient()
    await supabase.from('retreats').delete().eq('id', retreatId)
    setLoading(false)
    setConfirming(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div onClick={stop}
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-white ring-1 ring-stone-200 rounded-lg shadow-sm px-1.5 py-1">
        <span className="text-xs font-semibold text-stone-500 px-1">Delete?</span>
        <button onClick={del} disabled={loading} title="Confirm delete"
          className="size-6 grid place-items-center rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
        <button onClick={e => { stop(e); setConfirming(false) }} disabled={loading} title="Cancel"
          className="size-6 grid place-items-center rounded-md text-stone-500 hover:bg-stone-100 transition">
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <button onClick={e => { stop(e); setConfirming(true) }} title="Delete retreat"
      className="absolute bottom-3 right-3 z-10 size-7 grid place-items-center rounded-lg bg-white/90 ring-1 ring-stone-200 text-stone-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 hover:ring-rose-200 transition">
      <Trash2 size={14} />
    </button>
  )
}
