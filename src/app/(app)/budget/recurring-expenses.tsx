"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, Plus, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { cn, formatCurrency } from "@/lib/utils";

type Member = { id: string; name: string; avatar_emoji: string };
type Recurring = {
  id: string;
  title: string;
  amount: number;
  category: string;
  day_of_month: number | null;
  paid_by: string | null;
  is_shared: boolean;
  registered: boolean;
};

const CATEGORIES = [
  { value: "home", label: "Hogar" },
  { value: "groceries", label: "Mercado" },
  { value: "health", label: "Salud" },
  { value: "fun", label: "Diversión" },
  { value: "other", label: "Otro" },
];

export function RecurringExpenses({
  items,
  total,
  members,
  currentUserId,
  monthKey,
}: {
  items: Recurring[];
  total: number;
  members: Member[];
  currentUserId: string;
  monthKey: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const pendingCount = items.filter((i) => !i.registered).length;

  async function register(item: Recurring) {
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", currentUserId).single();
    const day = item.day_of_month ?? 1;
    const date = `${monthKey}-${String(day).padStart(2, "0")}`;
    const { error } = await supabase.from("expenses").insert({
      home_id: profile!.home_id,
      amount: item.amount,
      category: item.category,
      date,
      paid_by: item.paid_by ?? currentUserId,
      is_shared: item.is_shared,
      notes: item.title,
      recurring_id: item.id,
    });
    if (error) {
      toast.error("No se pudo registrar");
      return;
    }
    toast.success(`"${item.title}" registrado`);
    startTransition(() => router.refresh());
  }

  async function registerAll() {
    const pending = items.filter((i) => !i.registered);
    if (pending.length === 0) return;
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", currentUserId).single();
    const rows = pending.map((item) => ({
      home_id: profile!.home_id,
      amount: item.amount,
      category: item.category,
      date: `${monthKey}-${String(item.day_of_month ?? 1).padStart(2, "0")}`,
      paid_by: item.paid_by ?? currentUserId,
      is_shared: item.is_shared,
      notes: item.title,
      recurring_id: item.id,
    }));
    const { error } = await supabase.from("expenses").insert(rows);
    if (error) {
      toast.error("No se pudieron registrar");
      return;
    }
    toast.success(`${pending.length} gastos fijos registrados`);
    startTransition(() => router.refresh());
  }

  async function remove(item: Recurring) {
    const supabase = createClient();
    await supabase.from("recurring_expenses").update({ active: false }).eq("id", item.id);
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-5">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
            <Repeat className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </span>
          <div className="text-left">
            <p className="font-medium">Gastos fijos</p>
            <p className="text-xs text-ink-muted">
              {formatCurrency(total)}/mes
              {pendingCount > 0 && ` · ${pendingCount} sin registrar`}
            </p>
          </div>
        </div>
        <span className="text-ink-muted text-sm">{open ? "−" : "+"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-2">
                  Cargá tus fijos (alquiler, servicios…) y registralos cada mes con un toque.
                </p>
              ) : (
                <>
                  {items.map((item) => {
                    const payer = item.paid_by ? members.find((m) => m.id === item.paid_by) : null;
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-line bg-bg-main p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-ink-muted font-mono">
                            {formatCurrency(Number(item.amount))}
                            {item.day_of_month && ` · día ${item.day_of_month}`}
                            {payer && ` · ${payer.avatar_emoji}`}
                            {!item.is_shared && " · personal"}
                          </p>
                        </div>
                        {item.registered ? (
                          <span className="inline-flex items-center gap-1 text-xs text-accent-secondary">
                            <Check className="w-3.5 h-3.5" /> este mes
                          </span>
                        ) : (
                          <button
                            onClick={() => register(item)}
                            className="rounded-full bg-accent-primary text-bg-card px-3 py-1.5 text-xs font-medium"
                          >
                            Registrar
                          </button>
                        )}
                        <button onClick={() => remove(item)} className="text-ink-muted hover:text-accent-primary shrink-0" aria-label="Quitar">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {pendingCount > 1 && (
                    <button
                      onClick={registerAll}
                      className="w-full rounded-full border border-accent-primary text-accent-primary py-2 text-sm font-medium"
                    >
                      Registrar todos ({pendingCount})
                    </button>
                  )}
                </>
              )}

              {showForm ? (
                <NewRecurringForm
                  members={members}
                  currentUserId={currentUserId}
                  onDone={() => {
                    setShowForm(false);
                    startTransition(() => router.refresh());
                  }}
                />
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-accent-primary font-medium pt-1"
                >
                  <Plus className="w-4 h-4" />
                  Agregar gasto fijo
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NewRecurringForm({
  members,
  currentUserId,
  onDone,
}: {
  members: Member[];
  currentUserId: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("home");
  const [day, setDay] = useState("1");
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [isShared, setIsShared] = useState(true);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!title.trim() || !Number.isFinite(num) || num <= 0) return;
    setSaving(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", currentUserId).single();
    const { error } = await supabase.from("recurring_expenses").insert({
      home_id: profile!.home_id,
      title: title.trim(),
      amount: num,
      category,
      day_of_month: Number(day) || 1,
      paid_by: paidBy || null,
      is_shared: isShared,
      created_by: currentUserId,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo crear");
      return;
    }
    toast.success("Gasto fijo agregado");
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-2 p-4 rounded-2xl bg-bg-main border border-line space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Ej: alquiler" required
        className="w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">Monto</span>
          <input type="number" step="0.01" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required
            className="mt-0.5 w-full rounded-xl border border-line bg-bg-card px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">Día</span>
          <input type="number" min="1" max="31" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)}
            className="mt-0.5 w-full rounded-xl border border-line bg-bg-card px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">Categoría</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="mt-0.5 w-full rounded-xl border border-line bg-bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">Paga</span>
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
            className="mt-0.5 w-full rounded-xl border border-line bg-bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40">
            {members.map((m) => <option key={m.id} value={m.id}>{m.avatar_emoji}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
        <span>Compartido</span>
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="rounded-full border border-line bg-bg-card px-5 py-2 text-sm">Cancelar</button>
        <button type="submit" disabled={saving || !title.trim()} className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50">
          {saving ? "Guardando…" : "Agregar"}
        </button>
      </div>
    </form>
  );
}
