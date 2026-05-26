"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Plus, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  category: string;
  is_done: boolean;
  notes: string | null;
  added_by: string | null;
  added_at: string;
  done_by: string | null;
  done_at: string | null;
};
type Member = { id: string; name: string; avatar_emoji: string };

const CATEGORIES: { value: string; label: string }[] = [
  { value: "produce", label: "Frutas y verduras" },
  { value: "dairy", label: "Lácteos" },
  { value: "meat", label: "Carnes" },
  { value: "pantry", label: "Despensa" },
  { value: "frozen", label: "Congelados" },
  { value: "bakery", label: "Panadería" },
  { value: "drinks", label: "Bebidas" },
  { value: "household", label: "Hogar" },
  { value: "personal", label: "Cuidado personal" },
  { value: "general", label: "General" },
];

const CAT_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

export function GroceriesClient({
  items,
  members,
  currentUserId,
}: {
  items: Item[];
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const pending = useMemo(() => items.filter((i) => !i.is_done), [items]);
  const done = useMemo(() => items.filter((i) => i.is_done), [items]);

  const groupedPending = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const c of CATEGORIES) map.set(c.value, []);
    for (const item of pending) {
      const key = map.has(item.category) ? item.category : "general";
      (map.get(key) ?? []).push(item);
    }
    return Array.from(map.entries()).filter(([, arr]) => arr.length > 0);
  }, [pending]);

  async function toggle(item: Item) {
    const supabase = createClient();
    await supabase
      .from("grocery_items")
      .update({
        is_done: !item.is_done,
        done_at: !item.is_done ? new Date().toISOString() : null,
        done_by: !item.is_done ? currentUserId : null,
      })
      .eq("id", item.id);
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("grocery_items").delete().eq("id", id);
    startTransition(() => router.refresh());
  }

  async function clearDone() {
    if (!confirm("¿Limpiar todos los items comprados?")) return;
    const supabase = createClient();
    await supabase.from("grocery_items").delete().eq("is_done", true);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {pending.length} {pending.length === 1 ? "item" : "items"} por comprar
          {done.length > 0 && ` · ${done.length} en el carrito`}
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card px-5 py-2 text-sm font-medium shadow-warm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cerrar" : "Agregar"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <NewItemForm
              currentUserId={currentUserId}
              onDone={() => {
                setShowForm(false);
                startTransition(() => router.refresh());
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {pending.length === 0 && done.length === 0 ? (
        <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
            <ShoppingCart className="w-8 h-8" strokeWidth={1.6} />
          </div>
          <p className="font-display text-2xl">Carrito vacío</p>
          <p className="text-ink-muted mt-2 leading-relaxed">
            Agregá lo que necesiten comprar. Tu pareja lo va a ver al toque.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedPending.map(([cat, arr]) => (
            <section key={cat}>
              <p className="text-xs uppercase tracking-wider text-ink-muted mb-2">
                {CAT_LABEL[cat] ?? "General"}
              </p>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {arr.map((item) => (
                    <GroceryRow
                      key={item.id}
                      item={item}
                      adder={item.added_by ? memberById[item.added_by] : null}
                      onToggle={() => toggle(item)}
                      onRemove={() => remove(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}

          {done.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-ink-muted">
                  En el carrito ({done.length})
                </p>
                <button
                  onClick={clearDone}
                  className="text-xs text-ink-muted hover:text-accent-primary"
                >
                  Vaciar
                </button>
              </div>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {done.map((item) => (
                    <GroceryRow
                      key={item.id}
                      item={item}
                      adder={item.done_by ? memberById[item.done_by] : null}
                      onToggle={() => toggle(item)}
                      onRemove={() => remove(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function GroceryRow({
  item,
  adder,
  onToggle,
  onRemove,
}: {
  item: Item;
  adder: Member | null;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "rounded-2xl bg-bg-card border border-line p-3 flex items-center gap-3 shadow-warm",
        item.is_done && "opacity-60",
      )}
    >
      <button
        onClick={onToggle}
        aria-label={item.is_done ? "Marcar por comprar" : "Marcar comprado"}
        className={cn(
          "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0",
          item.is_done
            ? "bg-accent-secondary border-accent-secondary text-bg-card"
            : "border-line hover:border-accent-primary",
        )}
      >
        {item.is_done && <Check className="w-4 h-4" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium truncate", item.is_done && "line-through")}>
          {item.name}
          {item.qty != null && (
            <span className="text-ink-muted font-normal ml-2 text-sm">
              {item.qty}
              {item.unit && ` ${item.unit}`}
            </span>
          )}
        </p>
        {item.notes && (
          <p className="text-xs text-ink-muted truncate">{item.notes}</p>
        )}
      </div>
      {adder && (
        <span className="text-lg leading-none shrink-0" title={adder.name} aria-hidden>
          {adder.avatar_emoji}
        </span>
      )}
      <button
        onClick={onRemove}
        className="text-ink-muted hover:text-accent-primary shrink-0"
        aria-label="Eliminar"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.li>
  );
}

function NewItemForm({
  currentUserId,
  onDone,
}: {
  currentUserId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("general");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", user!.id)
      .single();
    await supabase.from("grocery_items").insert({
      home_id: profile!.home_id,
      name: name.trim(),
      qty: qty.trim() ? Number(qty) : null,
      unit: unit.trim() || null,
      category,
      notes: notes.trim() || null,
      added_by: currentUserId,
    });
    setName("");
    setQty("");
    setUnit("");
    setNotes("");
    setLoading(false);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4 rounded-2xl bg-bg-main border border-line">
      <label className="block">
        <span className="text-xs text-ink-muted">Item</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="Ej: tomates"
          required
          className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-ink-muted">Cantidad</span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="—"
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Unidad</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="kg, L…"
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Categoría</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-ink-muted">Notas (marca, tamaño…)</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-line bg-bg-card px-5 py-2 text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Agregando…" : "Agregar"}
        </button>
      </div>
    </form>
  );
}
