-- Migration: retreat_summaries — materialized per-retreat snapshot for agent historical context
-- Links schedule, manager reflection, and participant feedback into one record per retreat.
-- The agent reads this instead of joining 4 separate tables at query time.

create table if not exists public.retreat_summaries (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null unique,
  manager_id uuid references auth.users(id) not null,

  -- Retreat identity (denormalized for fast agent reads)
  retreat_name text not null,
  destination text,
  start_date date,
  end_date date,
  total_days integer,
  participant_count integer default 0,

  -- Schedule snapshot: [{day, start, end, title, type, location}]
  schedule_snapshot jsonb default '[]',

  -- Manager reflection (mirrors manager_feedback)
  overall_rating integer,
  what_went_well text,
  what_to_improve text,
  lessons_learned text,
  would_run_again boolean,

  -- Aggregated participant feedback
  participant_response_count integer default 0,
  avg_nps numeric(4,1),
  nps_promoters integer default 0,
  nps_passives integer default 0,
  nps_detractors integer default 0,
  top_loved_themes text,
  top_improve_themes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.retreat_summaries enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'retreat_summaries' and policyname = 'Managers can manage own summaries'
  ) then
    execute 'create policy "Managers can manage own summaries" on public.retreat_summaries for all
      using (manager_id = auth.uid())';
  end if;
end $$;
