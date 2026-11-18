alter table public.crm_prospects
  add column if not exists tier text,
  add column if not exists segment text,
  add column if not exists signals jsonb,
  add column if not exists score_breakdown jsonb,
  add column if not exists instagram text,
  add column if not exists email_source text,
  add column if not exists decision_maker text,
  add column if not exists outreach_message text,
  add column if not exists maps_url text,
  add column if not exists enriched_at timestamptz;
create index if not exists crm_prospects_tier_idx on public.crm_prospects (tier);
