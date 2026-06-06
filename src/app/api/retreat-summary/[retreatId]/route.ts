import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Extracts top N words from free-text, excluding stopwords
function topThemes(texts: string[], n = 6): string {
  const stop = new Set([
    'the','a','and','to','in','of','was','it','for','this','that','with',
    'we','i','very','so','our','but','is','at','on','be','as','by','had',
    'were','have','there','really','would','could','which','they','all',
  ])
  const freq: Record<string, number> = {}
  texts.join(' ').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
    if (w.length > 3 && !stop.has(w)) freq[w] = (freq[w] ?? 0) + 1
  })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w)
    .join(', ')
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ retreatId: string }> },
) {
  try {
    const { retreatId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch all source data in parallel
    const [
      { data: retreat },
      { data: scheduleItems },
      { data: mFeedback },
      { data: pFeedback },
      { data: participants },
    ] = await Promise.all([
      supabase.from('retreats').select('*').eq('id', retreatId).eq('manager_id', user.id).single(),
      supabase.from('schedule_items').select('day_number,start_time,end_time,title,item_type,location').eq('retreat_id', retreatId).order('day_number').order('start_time'),
      supabase.from('manager_feedback').select('*').eq('retreat_id', retreatId).single(),
      supabase.from('participant_feedback').select('nps_score,what_loved,what_to_improve').eq('retreat_id', retreatId),
      supabase.from('participants').select('id', { count: 'exact', head: true }).eq('retreat_id', retreatId),
    ])

    if (!retreat) return NextResponse.json({ error: 'Retreat not found' }, { status: 404 })

    // Build schedule snapshot (compact, ordered)
    const scheduleSnapshot = (scheduleItems ?? []).map(s => ({
      day:   s.day_number ?? 1,
      start: s.start_time?.slice(0, 5) ?? '00:00',
      ...(s.end_time ? { end: s.end_time.slice(0, 5) } : {}),
      title: s.title,
      type:  s.item_type,
      ...(s.location ? { location: s.location } : {}),
    }))

    // Compute NPS stats
    const fb = pFeedback ?? []
    const withNps    = fb.filter(f => f.nps_score != null)
    const promoters  = withNps.filter(f => (f.nps_score ?? 0) >= 9).length
    const passives   = withNps.filter(f => (f.nps_score ?? 0) >= 7 && (f.nps_score ?? 0) < 9).length
    const detractors = withNps.filter(f => (f.nps_score ?? 0) < 7).length
    const avgNps     = withNps.length > 0
      ? Math.round((withNps.reduce((s, f) => s + (f.nps_score ?? 0), 0) / withNps.length) * 10) / 10
      : null

    const lovedThemes   = topThemes(fb.map(f => f.what_loved   ?? '').filter(Boolean))
    const improveThemes = topThemes(fb.map(f => f.what_to_improve ?? '').filter(Boolean))

    // Compute total days
    const totalDays = retreat.start_date && retreat.end_date
      ? Math.round((new Date(retreat.end_date + 'T00:00:00').getTime() - new Date(retreat.start_date + 'T00:00:00').getTime()) / 86400000) + 1
      : null

    const payload = {
      retreat_id:                retreatId,
      manager_id:                user.id,
      retreat_name:              retreat.name,
      destination:               retreat.destination ?? null,
      start_date:                retreat.start_date ?? null,
      end_date:                  retreat.end_date ?? null,
      total_days:                totalDays,
      participant_count:         (participants as unknown as { count: number } | null)?.count ?? 0,
      schedule_snapshot:         scheduleSnapshot,
      // Manager reflection
      overall_rating:            mFeedback?.overall_rating ?? null,
      what_went_well:            mFeedback?.what_went_well ?? null,
      what_to_improve:           mFeedback?.what_to_improve ?? null,
      lessons_learned:           mFeedback?.lessons_learned ?? null,
      would_run_again:           mFeedback?.would_run_again ?? null,
      // Participant feedback
      participant_response_count: fb.length,
      avg_nps:                   avgNps,
      nps_promoters:             promoters,
      nps_passives:              passives,
      nps_detractors:            detractors,
      top_loved_themes:          lovedThemes || null,
      top_improve_themes:        improveThemes || null,
      updated_at:                new Date().toISOString(),
    }

    const { error } = await supabase
      .from('retreat_summaries')
      .upsert(payload, { onConflict: 'retreat_id' })

    if (error) throw error

    return NextResponse.json({ success: true, scheduleItems: scheduleSnapshot.length, feedbackResponses: fb.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Summary generation error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
