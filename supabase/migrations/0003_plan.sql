-- Kullanıcıya özel plan ayarları + 5'e kadar tekrar, 4'e kadar soru turu.
-- Supabase SQL Editor'da bir kez çalıştırın (tekrar çalıştırılabilir).

alter table public.progress
  add column if not exists tekrar4_at timestamptz,
  add column if not exists tekrar5_at timestamptz,
  add column if not exists soru3_at timestamptz,
  add column if not exists soru4_at timestamptz;

alter table public.study_log drop constraint if exists study_log_event_check;
alter table public.study_log add constraint study_log_event_check check (
  event in ('calisma','tekrar1','tekrar2','tekrar3','tekrar4','tekrar5','soru1','soru2','soru3','soru4')
);

create table if not exists public.plan_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  tekrar_count int not null default 3 check (tekrar_count between 0 and 5),
  soru_count int not null default 2 check (soru_count between 0 and 4),
  daily_goal int not null default 4 check (daily_goal between 1 and 20),
  soru_share int check (soru_share between 0 and 100), -- null = otomatik
  days_per_week int not null default 7 check (days_per_week between 1 and 7),
  updated_at timestamptz not null default now()
);

alter table public.plan_settings enable row level security;

drop policy if exists plan_settings_own on public.plan_settings;
create policy plan_settings_own on public.plan_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
