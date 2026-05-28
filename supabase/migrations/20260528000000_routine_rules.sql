-- Nido · Rutina semanal (tareas fijas por día/persona) + Reglas de la relación

-- ============================================================
-- CHORE SCHEDULE (rutina semanal fija)
-- day_of_week: 0=domingo ... 6=sábado (convención JS getDay)
-- ============================================================
create table if not exists public.chore_schedule (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  category text not null default 'general',
  day_of_week smallint not null check (day_of_week between 0 and 6),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists chore_schedule_home_id_idx on public.chore_schedule(home_id);

alter table public.chore_schedule enable row level security;
drop policy if exists "chore_schedule_all_for_members" on public.chore_schedule;
create policy "chore_schedule_all_for_members" on public.chore_schedule
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- Logs de cumplimiento (una marca por chore por día)
create table if not exists public.chore_logs (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  chore_id uuid not null references public.chore_schedule(id) on delete cascade,
  date date not null,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz not null default now(),
  unique(chore_id, date)
);

create index if not exists chore_logs_home_id_idx on public.chore_logs(home_id);
create index if not exists chore_logs_date_idx on public.chore_logs(home_id, date);

alter table public.chore_logs enable row level security;
drop policy if exists "chore_logs_all_for_members" on public.chore_logs;
create policy "chore_logs_all_for_members" on public.chore_logs
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- ============================================================
-- RULES (reglas de la relación) + logs diarios
-- ============================================================
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  text text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists rules_home_id_idx on public.rules(home_id);

alter table public.rules enable row level security;
drop policy if exists "rules_all_for_members" on public.rules;
create policy "rules_all_for_members" on public.rules
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

create table if not exists public.rule_logs (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  rule_id uuid not null references public.rules(id) on delete cascade,
  date date not null,
  followed boolean not null,
  marked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(rule_id, date)
);

create index if not exists rule_logs_home_id_idx on public.rule_logs(home_id);
create index if not exists rule_logs_date_idx on public.rule_logs(home_id, date);

alter table public.rule_logs enable row level security;
drop policy if exists "rule_logs_all_for_members" on public.rule_logs;
create policy "rule_logs_all_for_members" on public.rule_logs
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- ============================================================
-- REALTIME
-- ============================================================
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  for t in select unnest(array['chore_schedule', 'chore_logs', 'rules', 'rule_logs']) loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;
