-- Nido · Inventario (despensa/nevera con costo)
-- pantry_items = stock actual; pantry_movements = historial de entradas/salidas.

-- ============================================================
-- PANTRY ITEMS (stock actual)
-- ============================================================
create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  name text not null,
  category text not null default 'general',
  unit text,
  quantity numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pantry_items_home_id_idx on public.pantry_items(home_id);

alter table public.pantry_items enable row level security;
drop policy if exists "pantry_items_all_for_members" on public.pantry_items;
create policy "pantry_items_all_for_members" on public.pantry_items
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- ============================================================
-- PANTRY MOVEMENTS (historial)
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'pantry_movement_type') then
    create type pantry_movement_type as enum ('purchase', 'consumption', 'adjustment');
  end if;
end$$;

create table if not exists public.pantry_movements (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  item_id uuid references public.pantry_items(id) on delete set null,
  item_name text not null,
  type pantry_movement_type not null,
  quantity numeric(12,2) not null,
  unit text,
  unit_cost numeric(12,2),
  total_cost numeric(12,2),
  recipe_id uuid references public.recipes(id) on delete set null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pantry_movements_home_id_idx on public.pantry_movements(home_id);
create index if not exists pantry_movements_created_at_idx on public.pantry_movements(home_id, created_at);

alter table public.pantry_movements enable row level security;
drop policy if exists "pantry_movements_all_for_members" on public.pantry_movements;
create policy "pantry_movements_all_for_members" on public.pantry_movements
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- ============================================================
-- REALTIME
-- ============================================================
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  for t in select unnest(array['pantry_items', 'pantry_movements']) loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;
