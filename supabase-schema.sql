-- RetReach Database Schema
-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Retreats
create table public.retreats (
  id uuid default gen_random_uuid() primary key,
  manager_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  destination text not null,
  concept text,
  start_date date not null,
  end_date date not null,
  budget numeric(10,2) not null default 0,
  number_of_participants integer,
  hotel_budget numeric(10,2),
  flight_budget numeric(10,2),
  stage_override text check (stage_override in ('planning','active','closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.retreats enable row level security;
create policy "Managers can manage own retreats" on public.retreats for all using (auth.uid() = manager_id);

-- Vendors
create table public.vendors (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('hotel','food','transport','flights','merch','attraction','other')),
  contact_name text,
  contact_email text,
  contact_phone text,
  deliverables text,
  deadline date,
  cost numeric(10,2),
  status text default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  rating integer check (rating between 1 and 5),
  rating_notes text,
  created_at timestamptz default now()
);
alter table public.vendors enable row level security;
create policy "Managers can manage vendors" on public.vendors for all
  using (exists (select 1 from public.retreats r where r.id = retreat_id and r.manager_id = auth.uid()));

-- Participants
create table public.participants (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null,
  name text not null,
  email text not null,
  phone text,
  food_preferences text,
  payment_status text default 'unpaid' check (payment_status in ('unpaid','partial','paid')),
  payment_amount numeric(10,2),
  notes text,
  created_at timestamptz default now()
);
alter table public.participants enable row level security;
create policy "Managers can manage participants" on public.participants for all
  using (exists (select 1 from public.retreats r where r.id = retreat_id and r.manager_id = auth.uid()));

-- Schedule Items
create table public.schedule_items (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null,
  title text not null,
  description text,
  date date not null,
  start_time time not null,
  end_time time,
  vendor_id uuid references public.vendors(id) on delete set null,
  location text,
  item_type text default 'session' check (item_type in ('session','meal','transport','activity','other')),
  created_at timestamptz default now()
);
alter table public.schedule_items enable row level security;
create policy "Managers can manage schedule" on public.schedule_items for all
  using (exists (select 1 from public.retreats r where r.id = retreat_id and r.manager_id = auth.uid()));

-- Notifications
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null,
  recipient_type text not null check (recipient_type in ('vendor','participant','manager')),
  recipient_id uuid not null,
  channel text not null check (channel in ('email','sms','push')),
  subject text not null,
  body text not null,
  status text default 'pending' check (status in ('pending','sent','failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "Managers can manage notifications" on public.notifications for all
  using (exists (select 1 from public.retreats r where r.id = retreat_id and r.manager_id = auth.uid()));

-- AI Interactions (for learning over time)
create table public.ai_interactions (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete cascade not null,
  prompt text not null,
  response text not null,
  action_taken text,
  accepted boolean,
  created_at timestamptz default now()
);
alter table public.ai_interactions enable row level security;
create policy "Managers can manage own ai interactions" on public.ai_interactions for all using (auth.uid() = manager_id);

-- Agoda City IDs (lookup table for hotel destinations)
create table public.agoda_city_ids (
  id uuid default gen_random_uuid() primary key,
  city_name text not null unique,
  country text not null,
  agoda_city_id integer not null,
  latitude decimal(10,8),
  longitude decimal(11,8),
  created_at timestamptz default now()
);
alter table public.agoda_city_ids enable row level security;
create policy "Anyone can read city lookups" on public.agoda_city_ids for select using (true);

-- Flight Airport Codes (IATA airport codes for flight searches)
create table public.flight_airport_codes (
  id uuid default gen_random_uuid() primary key,
  iata_code text not null unique,
  airport_name text not null,
  city text not null,
  country text not null,
  latitude decimal(10,8),
  longitude decimal(11,8),
  created_at timestamptz default now()
);
alter table public.flight_airport_codes enable row level security;
create policy "Anyone can read airport lookups" on public.flight_airport_codes for select using (true);

-- Vendor Search Results (cache of API responses)
create table public.vendor_search_results (
  id uuid default gen_random_uuid() primary key,
  retreat_id uuid references public.retreats(id) on delete cascade not null,
  search_type text not null check (search_type in ('hotel','flight')),
  api_response_json jsonb not null,
  created_at timestamptz default now()
);
alter table public.vendor_search_results enable row level security;
create policy "Managers can view search results for own retreats" on public.vendor_search_results for all
  using (exists (select 1 from public.retreats r where r.id = retreat_id and r.manager_id = auth.uid()));

-- Auto-update updated_at on retreats
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger retreats_updated_at before update on public.retreats
  for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
