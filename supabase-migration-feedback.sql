-- Migration: feedback tables (participant feedback via link + manager reflection in-app)

create table if not exists public.participant_feedback (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null,
  participant_name text,
  participant_email text,
  nps_score integer check (nps_score between 0 and 10),
  what_loved text,
  what_to_improve text,
  custom_answers jsonb default '{}',
  submitted_at timestamptz default now()
);
alter table public.participant_feedback enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'participant_feedback' and policyname = 'Managers can read participant feedback') then
    execute 'create policy "Managers can read participant feedback" on public.participant_feedback for select
      using (exists (select 1 from public.retreats r where r.id = retreat_id and r.manager_id = auth.uid()))';
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'participant_feedback' and policyname = 'Anyone can submit participant feedback') then
    execute 'create policy "Anyone can submit participant feedback" on public.participant_feedback for insert with check (true)';
  end if;
end $$;

create table if not exists public.manager_feedback (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null unique,
  manager_id uuid references auth.users(id) not null,
  overall_rating integer check (overall_rating between 1 and 5),
  what_went_well text,
  what_to_improve text,
  lessons_learned text,
  would_run_again boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.manager_feedback enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'manager_feedback' and policyname = 'Managers can manage own feedback') then
    execute 'create policy "Managers can manage own feedback" on public.manager_feedback for all
      using (manager_id = auth.uid())';
  end if;
end $$;

-- Questionnaire for participant feedback link (custom questions, manager configures)
create table if not exists public.feedback_questionnaires (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null unique,
  custom_questions jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.feedback_questionnaires enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'feedback_questionnaires' and policyname = 'Managers can manage feedback questionnaires') then
    execute 'create policy "Managers can manage feedback questionnaires" on public.feedback_questionnaires for all
      using (exists (select 1 from public.retreats r where r.id = retreat_id and r.manager_id = auth.uid()))';
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'feedback_questionnaires' and policyname = 'Anyone can read feedback questionnaire') then
    execute 'create policy "Anyone can read feedback questionnaire" on public.feedback_questionnaires for select using (true)';
  end if;
end $$;
