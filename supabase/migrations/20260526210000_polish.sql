-- Nido · Polish iteration
-- Agrega: due_date a todos, last_cooked_at a recipes.

alter table public.todos
  add column if not exists due_date date;

create index if not exists todos_due_date_idx on public.todos(home_id, due_date);

alter table public.recipes
  add column if not exists last_cooked_at timestamptz;
