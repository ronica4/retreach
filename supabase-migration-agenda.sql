-- Migration: Add day_number + track to schedule_items, add schedule_day_titles
-- Run this against your existing Supabase project if schedule_items already exists.

alter table public.schedule_items
  add column if not exists day_number integer not null default 1,
  add column if not exists track text default 'Main' check (track in ('Main','Ops','Reminders'));

-- Backfill day_number from existing date + retreat start_date
update public.schedule_items si
set day_number = greatest(1, (si.date::date - r.start_date::date) + 1)
from public.retreats r
where r.id = si.retreat_id;

-- Schedule Day Titles
create table if not exists public.schedule_day_titles (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null,
  day_number integer not null,
  title text not null default '',
  unique(retreat_id, day_number)
);
alter table public.schedule_day_titles enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'schedule_day_titles'
      and policyname = 'Managers can manage day titles'
  ) then
    execute 'create policy "Managers can manage day titles" on public.schedule_day_titles for all
      using (exists (select 1 from public.retreats r where r.id = retreat_id and r.manager_id = auth.uid()))';
  end if;
end $$;
