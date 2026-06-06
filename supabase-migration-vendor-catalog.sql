-- Vendor Catalog — the shared "moat" directory of vendors.
-- A global, company-wide library of suppliers (attractions + lodging) that every
-- manager can search by name / country / category and pull into a specific retreat.
-- Run this in your Supabase SQL editor, then seed it with scripts/import-vendor-catalog.py
create table if not exists public.vendor_catalog (
  id uuid default gen_random_uuid() primary key,
  source_id integer,                 -- parent_id from the master dataset (null for user-added rows)
  entity_type text not null default 'attraction' check (entity_type in ('attraction','hostel')),
  name text not null,
  country text,                      -- normalized (Hebrew) country name
  city text,
  category text,                     -- raw source category: hostel_general | general | nature | workshop | extreme | food | transportation | culture | wellness
  description text,
  url text,
  created_by uuid references public.profiles(id) on delete set null,  -- null = centrally seeded
  created_at timestamptz default now()
);
alter table public.vendor_catalog enable row level security;

-- Everyone signed in can browse the shared catalog.
create policy "Authenticated can read catalog" on public.vendor_catalog
  for select using (auth.role() = 'authenticated');
-- Managers can contribute new entries (must stamp themselves as the author).
create policy "Authenticated can add to catalog" on public.vendor_catalog
  for insert with check (auth.uid() = created_by);
-- ...and edit / remove only the entries they added (seeded rows stay read-only).
create policy "Authors can update own catalog rows" on public.vendor_catalog
  for update using (auth.uid() = created_by);
create policy "Authors can delete own catalog rows" on public.vendor_catalog
  for delete using (auth.uid() = created_by);

create index if not exists vendor_catalog_country_idx  on public.vendor_catalog (country);
create index if not exists vendor_catalog_category_idx on public.vendor_catalog (category);
create index if not exists vendor_catalog_name_idx on public.vendor_catalog using gin (to_tsvector('simple', coalesce(name,'')));
-- Lets the importer upsert (re-run safe) on the source dataset id.
create unique index if not exists vendor_catalog_source_uniq on public.vendor_catalog (source_id) where source_id is not null;
