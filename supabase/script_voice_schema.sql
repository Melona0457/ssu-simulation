-- 교수 스크립트/음성 슬롯 관리용 최소 스키마
-- Supabase SQL Editor에서 그대로 실행 가능

create table if not exists public.professor_script_profiles (
  id bigserial primary key,
  profile_key text not null unique,
  gender text not null check (gender in ('남자', '여자')),
  age_tone text not null check (age_tone in ('TONE_20S', 'TONE_30S', 'TONE_40S')),
  source_file text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.professor_voice_slots (
  id bigserial primary key,
  profile_key text not null references public.professor_script_profiles(profile_key) on delete cascade,
  line_index int not null check (line_index >= 0),
  slot_path text not null,
  duration_ms int,
  mime_type text default 'audio/wav',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_key, line_index)
);

create index if not exists idx_professor_voice_slots_profile_key
  on public.professor_voice_slots(profile_key);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_professor_voice_slots_touch_updated_at on public.professor_voice_slots;
create trigger trg_professor_voice_slots_touch_updated_at
before update on public.professor_voice_slots
for each row
execute function public.touch_updated_at();

insert into public.professor_script_profiles (profile_key, gender, age_tone, source_file)
values
  ('male_20s', '남자', 'TONE_20S', '남자20대젊은교수님.md'),
  ('male_30s', '남자', 'TONE_30S', '남자30대중년교수님.md'),
  ('male_40s', '남자', 'TONE_40S', '남자40대중노년교수님.md'),
  ('female_20s', '여자', 'TONE_20S', '여자20대젊은교수님.md'),
  ('female_30s', '여자', 'TONE_30S', '여자30대중년교수님.md'),
  ('female_40s', '여자', 'TONE_40S', '여자40대중노년교수님.md')
on conflict (profile_key) do update
set
  gender = excluded.gender,
  age_tone = excluded.age_tone,
  source_file = excluded.source_file;
