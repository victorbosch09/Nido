-- Nido · Schema completo
-- Ejecuta este archivo en el SQL Editor de Supabase (proyecto nuevo).

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- HOMES
-- ============================================================
create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nuestro nido',
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES (1:1 con auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_emoji text not null default '🌿',
  role_tag text,
  home_id uuid references public.homes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_home_id_idx on public.profiles(home_id);

-- ============================================================
-- TASKS
-- ============================================================
create type task_status as enum ('pending', 'done');
create type task_priority as enum ('low', 'medium', 'high');
create type task_recurrence as enum ('once', 'daily', 'weekly', 'monthly');

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date date,
  recurrence task_recurrence not null default 'once',
  priority task_priority not null default 'medium',
  category text not null default 'general',
  status task_status not null default 'pending',
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tasks_home_id_idx on public.tasks(home_id);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);

-- ============================================================
-- EXPENSES
-- ============================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  amount numeric(12,2) not null,
  category text not null default 'other',
  paid_by uuid references public.profiles(id) on delete set null,
  date date not null default current_date,
  is_shared boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_home_id_idx on public.expenses(home_id);
create index if not exists expenses_date_idx on public.expenses(date);

-- ============================================================
-- BUDGETS (mensual / por categoría)
-- ============================================================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  category text not null,
  monthly_limit numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique(home_id, category)
);

-- ============================================================
-- HELPER: ¿el usuario pertenece a este home?
-- ============================================================
create or replace function public.is_home_member(p_home_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and home_id = p_home_id
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.homes      enable row level security;
alter table public.profiles   enable row level security;
alter table public.tasks      enable row level security;
alter table public.expenses   enable row level security;
alter table public.budgets    enable row level security;

-- Profiles: cada usuario ve y edita su propio perfil; también puede ver el perfil de su pareja (mismo home).
drop policy if exists "profiles_select_self_or_partner" on public.profiles;
create policy "profiles_select_self_or_partner" on public.profiles
  for select using (
    id = auth.uid()
    or (home_id is not null and public.is_home_member(home_id))
  );

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- Homes: cualquiera autenticado puede crear; solo miembros pueden ver/editar.
drop policy if exists "homes_select_members" on public.homes;
create policy "homes_select_members" on public.homes
  for select using (public.is_home_member(id));

drop policy if exists "homes_insert_authenticated" on public.homes;
create policy "homes_insert_authenticated" on public.homes
  for insert with check (auth.uid() is not null);

drop policy if exists "homes_update_members" on public.homes;
create policy "homes_update_members" on public.homes
  for update using (public.is_home_member(id));

-- Para unirse a un home con código de invitación necesitamos poder leer el home por código.
-- Lo resolvemos con un RPC `join_home_by_code` (security definer) más abajo.

-- Tasks
drop policy if exists "tasks_all_for_members" on public.tasks;
create policy "tasks_all_for_members" on public.tasks
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- Expenses
drop policy if exists "expenses_all_for_members" on public.expenses;
create policy "expenses_all_for_members" on public.expenses
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- Budgets
drop policy if exists "budgets_all_for_members" on public.budgets;
create policy "budgets_all_for_members" on public.budgets
  for all using (public.is_home_member(home_id))
  with check (public.is_home_member(home_id));

-- ============================================================
-- RPC: unirse a un home por código de invitación
-- ============================================================
create or replace function public.join_home_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_home_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_home_id from public.homes where invite_code = upper(p_code);

  if v_home_id is null then
    raise exception 'invalid invite code';
  end if;

  update public.profiles set home_id = v_home_id where id = auth.uid();

  return v_home_id;
end;
$$;

grant execute on function public.join_home_by_code(text) to authenticated;

-- ============================================================
-- RPC: crear home + asignarme como miembro en una sola transacción
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

  -- código de 6 caracteres alfanuméricos en mayúsculas
  v_code := upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 6));

  insert into public.homes (name, invite_code)
  values (coalesce(nullif(trim(p_name), ''), 'Nuestro nido'), v_code)
  returning id into v_home_id;

  update public.profiles set home_id = v_home_id where id = auth.uid();

  return v_home_id;
end;
$$;

grant execute on function public.create_home(text) to authenticated;

-- ============================================================
-- DEFAULTS al crear un perfil: sembrar tareas iniciales una vez el usuario tenga home.
-- (Lo hacemos desde la app, no en el schema, para mantenerlo simple.)
-- ============================================================
