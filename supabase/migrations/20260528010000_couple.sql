-- Nido · Pareja: planes/citas, wishlist, fechas importantes

-- ============================================================
-- DATE PLANS (citas / planes)
-- ============================================================
create table if not exists public.date_plans (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  planned_at timestamptz,
  location text,
  notes text,
  done boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists date_plans_home_id_idx on public.date_plans(home_id);
alter table public.date_plans enable row level security;
drop policy if exists "date_plans_all_for_members" on public.date_plans;
create policy "date_plans_all_for_members" on public.date_plans
  for all using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));

-- ============================================================
-- WISHES (wishlist compartida)
-- ============================================================
create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  description text,
  url text,
  granted boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wishes_home_id_idx on public.wishes(home_id);
alter table public.wishes enable row level security;
drop policy if exists "wishes_all_for_members" on public.wishes;
create policy "wishes_all_for_members" on public.wishes
  for all using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));

-- ============================================================
-- IMPORTANT DATES (aniversarios / fechas)
-- ============================================================
create table if not exists public.important_dates (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  date date not null,
  recurring_yearly boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists important_dates_home_id_idx on public.important_dates(home_id);
alter table public.important_dates enable row level security;
drop policy if exists "important_dates_all_for_members" on public.important_dates;
create policy "important_dates_all_for_members" on public.important_dates
  for all using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));

-- ============================================================
-- REALTIME
-- ============================================================
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  for t in select unnest(array['date_plans', 'wishes', 'important_dates']) loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;
