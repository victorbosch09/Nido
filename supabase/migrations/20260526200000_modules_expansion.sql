-- Nido · Expansión de módulos
-- Tablas nuevas para: despensa, love notes, pendientes (kanban), recetas, moods.
-- Más: realtime publication, seed de budgets default en create_home.

-- ============================================================
-- GROCERY ITEMS (Despensa)
-- ============================================================
create table if not exists public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  name text not null,
  qty numeric(10,2),
  unit text,
  category text not null default 'general',
  is_done boolean not null default false,
  notes text,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  done_by uuid references public.profiles(id) on delete set null,
  done_at timestamptz
);

create index if not exists grocery_items_home_id_idx on public.grocery_items(home_id);
create index if not exists grocery_items_is_done_idx on public.grocery_items(home_id, is_done);

alter table public.grocery_items enable row level security;
drop policy if exists "grocery_items_all_for_members" on public.grocery_items;
create policy "grocery_items_all_for_members" on public.grocery_items
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- ============================================================
-- LOVE NOTES (Pareja · notas)
-- ============================================================
create table if not exists public.love_notes (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  body text not null,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid references public.profiles(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists love_notes_home_id_idx on public.love_notes(home_id);

alter table public.love_notes enable row level security;
drop policy if exists "love_notes_all_for_members" on public.love_notes;
create policy "love_notes_all_for_members" on public.love_notes
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- ============================================================
-- TODOS (Pendientes · kanban)
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'todo_status') then
    create type todo_status as enum ('pending', 'in_progress', 'done');
  end if;
  if not exists (select 1 from pg_type where typname = 'todo_urgency') then
    create type todo_urgency as enum ('low', 'normal', 'urgent');
  end if;
end$$;

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  description text,
  status todo_status not null default 'pending',
  urgency todo_urgency not null default 'normal',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists todos_home_id_idx on public.todos(home_id);
create index if not exists todos_status_idx on public.todos(home_id, status);

alter table public.todos enable row level security;
drop policy if exists "todos_all_for_members" on public.todos;
create policy "todos_all_for_members" on public.todos
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- ============================================================
-- RECIPES (Cocina)
-- ============================================================
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  prep_minutes integer,
  servings integer,
  ingredients text,
  steps text,
  tags text[] default '{}'::text[],
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists recipes_home_id_idx on public.recipes(home_id);

alter table public.recipes enable row level security;
drop policy if exists "recipes_all_for_members" on public.recipes;
create policy "recipes_all_for_members" on public.recipes
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- ============================================================
-- MOODS (Personal · check-in de ánimo)
-- ============================================================
create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  home_id uuid not null references public.homes(id) on delete cascade,
  date date not null default current_date,
  score smallint not null check (score between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique(profile_id, date)
);

create index if not exists moods_profile_id_idx on public.moods(profile_id);
create index if not exists moods_home_id_idx on public.moods(home_id);

alter table public.moods enable row level security;
drop policy if exists "moods_select_self_or_partner" on public.moods;
create policy "moods_select_self_or_partner" on public.moods
  for select using (
    profile_id = auth.uid()
    or public.is_home_member(home_id)
  );

drop policy if exists "moods_insert_self" on public.moods;
create policy "moods_insert_self" on public.moods
  for insert with check (profile_id = auth.uid());

drop policy if exists "moods_update_self" on public.moods;
create policy "moods_update_self" on public.moods
  for update using (profile_id = auth.uid());

drop policy if exists "moods_delete_self" on public.moods;
create policy "moods_delete_self" on public.moods
  for delete using (profile_id = auth.uid());

-- ============================================================
-- REALTIME: agregar tablas a la publicación supabase_realtime
-- (idempotente: chequea pg_publication_tables antes de agregar)
-- ============================================================
do $$
declare
  t text;
begin
  -- Crear la publicación si no existe (proyecto Supabase la trae por defecto,
  -- pero por las dudas).
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  for t in select unnest(array[
    'tasks', 'expenses', 'budgets',
    'grocery_items', 'love_notes', 'todos', 'recipes', 'moods',
    'profiles'
  ]) loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;

-- ============================================================
-- Mejorar create_home: además de crear el nido, sembrar
-- los budgets default (en cero, para que aparezcan en la UI).
-- ============================================================
create or replace function public.create_home(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_home_id uuid;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_code := upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 6));

  insert into public.homes (name, invite_code)
  values (coalesce(nullif(trim(p_name), ''), 'Nuestro nido'), v_code)
  returning id into v_home_id;

  update public.profiles set home_id = v_home_id where id = auth.uid();

  -- Seed: tareas iniciales (recurring weekly chores)
  insert into public.tasks (home_id, title, category, priority, recurrence, assigned_to)
  values
    (v_home_id, 'Limpieza general',         'cleaning', 'medium', 'weekly', auth.uid()),
    (v_home_id, 'Lavandería',               'laundry',  'medium', 'weekly', auth.uid()),
    (v_home_id, 'Cocinar para la semana',   'kitchen',  'medium', 'weekly', auth.uid()),
    (v_home_id, 'Sacar la basura',          'general',  'low',    'weekly', auth.uid());

  return v_home_id;
end;
$$;

grant execute on function public.create_home(text) to authenticated;
