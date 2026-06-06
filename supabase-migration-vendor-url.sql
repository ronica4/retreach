-- Add a link/website field to per-retreat vendors so the source URL (e.g. the
-- catalog entry's page) is preserved when a vendor is added to a retreat.
-- Run this in your Supabase SQL editor.
alter table public.vendors add column if not exists url text;
