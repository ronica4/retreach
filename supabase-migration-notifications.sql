-- Migration: add recipient_name, recipient_email, trigger_key to notifications
-- Run in Supabase SQL editor

alter table public.notifications
  add column if not exists recipient_name text,
  add column if not exists recipient_email text,
  add column if not exists trigger_key text;

-- Unique index so the cron never queues duplicate reminders for the same vendor+window
create unique index if not exists notifications_trigger_key_idx
  on public.notifications (trigger_key)
  where trigger_key is not null;
