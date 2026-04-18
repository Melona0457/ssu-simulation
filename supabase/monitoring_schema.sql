create table if not exists public.monitoring_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  status text not null check (status in ('success', 'warning', 'error')),
  source text not null,
  duration_ms integer,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_monitoring_events_created_at
  on public.monitoring_events (created_at desc);

create index if not exists idx_monitoring_events_event_type_created_at
  on public.monitoring_events (event_type, created_at desc);

alter table public.monitoring_events enable row level security;

create policy "service role can manage monitoring events"
on public.monitoring_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
