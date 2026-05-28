-- Nido · Inventario a granel + cocción
-- is_bulk marca artículos sin medición por unidad (azúcar, sal, harina, jabón):
-- se trackean por nivel restante (quantity = 0-100%) y unit_cost = precio del lote completo.

alter table public.pantry_items
  add column if not exists is_bulk boolean not null default false;
