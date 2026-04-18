create table if not exists public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  professor_name text not null,
  appearance jsonb not null,
  custom_prompt text,
  professor_summary text not null,
  illustration_prompt text not null,
  chapter_scores jsonb not null,
  total_score integer not null,
  ending_key text not null,
  ending_title text not null,
  story_log jsonb not null
);

alter table public.play_sessions enable row level security;

create policy "service role can manage play sessions"
on public.play_sessions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists public.credit_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  player_name text not null,
  message_text text not null check (char_length(message_text) between 1 and 80),
  professor_image_url text,
  ending_key text,
  ending_title text
);

alter table public.credit_messages
add column if not exists professor_image_url text;

alter table public.credit_messages enable row level security;

create policy "service role can manage credit messages"
on public.credit_messages
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
