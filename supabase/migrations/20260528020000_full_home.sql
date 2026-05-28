-- Nido · Full hogar: settlements (quién debe a quién), gastos fijos, plan de comidas

-- ============================================================
-- SETTLEMENTS (saldar deudas entre la pareja)
-- ============================================================
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists settlements_home_id_idx on public.settlements(home_id);
alter table public.settlements enable row level security;
drop policy if exists "settlements_all_for_members" on public.settlements;
create policy "settlements_all_for_members" on public.settlements
  for all using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));

-- ============================================================
-- RECURRING EXPENSES (gastos fijos mensuales)
-- ============================================================
create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null,
  category text not null default 'home',
  day_of_month smallint check (day_of_month between 1 and 31),
  paid_by uuid references public.profiles(id) on delete set null,
  is_shared boolean not null default true,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists recurring_expenses_home_id_idx on public.recurring_expenses(home_id);
alter table public.recurring_expenses enable row level security;
drop policy if exists "recurring_expenses_all_for_members" on public.recurring_expenses;
create policy "recurring_expenses_all_for_members" on public.recurring_expenses
  for all using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));

-- Marca en expenses qué gasto vino de un fijo (para no duplicar en el mes)
alter table public.expenses
  add column if not exists recurring_id uuid references public.recurring_expenses(id) on delete set null;

-- ============================================================
-- MEAL PLANS (planificador semanal de comidas)
-- ============================================================
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('lunch', 'dinner')),
  recipe_id uuid references public.recipes(id) on delete set null,
  title text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(home_id, date, slot)
);
create index if not exists meal_plans_home_id_idx on public.meal_plans(home_id, date);
alter table public.meal_plans enable row level security;
drop policy if exists "meal_plans_all_for_members" on public.meal_plans;
create policy "meal_plans_all_for_members" on public.meal_plans
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
  for t in select unnest(array['settlements', 'recurring_expenses', 'meal_plans']) loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;
