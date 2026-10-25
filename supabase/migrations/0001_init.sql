-- TUS 2027 takip uygulaması şeması
-- Supabase SQL Editor'da bir kez çalıştırın.

create table if not exists public.topics (
  id int primary key,
  ders text not null,
  bolum text not null,
  konu text not null,
  ortalama_soru numeric not null,
  toplam_6_sinav int not null,
  ders_ici_yuzde numeric not null,
  oncelik text not null check (oncelik in ('Yüksek','Orta','Düşük')),
  dagilim jsonb not null
);

create table if not exists public.progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic_id int not null references public.topics(id) on delete cascade,
  calisma_at timestamptz,
  tekrar1_at timestamptz,
  tekrar2_at timestamptz,
  tekrar3_at timestamptz,
  soru1_at timestamptz,
  soru2_at timestamptz,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table if not exists public.daily_plan (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_date date not null,
  slot text not null check (slot in ('sabah','aksam')),
  position int not null check (position in (1,2)),
  topic_id int not null references public.topics(id) on delete cascade,
  primary key (user_id, plan_date, slot, position)
);

create table if not exists public.study_log (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic_id int not null references public.topics(id) on delete cascade,
  event text not null check (event in ('calisma','tekrar1','tekrar2','tekrar3','soru1','soru2')),
  at timestamptz not null default now()
);
create index if not exists study_log_user_at on public.study_log (user_id, at desc);

-- RLS
alter table public.topics enable row level security;
alter table public.progress enable row level security;
alter table public.daily_plan enable row level security;
alter table public.study_log enable row level security;

drop policy if exists topics_read on public.topics;
create policy topics_read on public.topics for select to authenticated using (true);

drop policy if exists progress_own on public.progress;
create policy progress_own on public.progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists daily_plan_own on public.daily_plan;
create policy daily_plan_own on public.daily_plan for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists study_log_own on public.study_log;
create policy study_log_own on public.study_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
