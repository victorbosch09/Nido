"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";

type Expense = {
  id: string;
  amount: number;
  category: string;
  paid_by: string | null;
  date: string;
  is_shared: boolean;
  notes: string | null;
};
type Budget = { category: string; monthly_limit: number };
type Member = { id: string; name: string; avatar_emoji: string };

const CATEGORIES: { value: string; label: string; emoji: string; color: string }[] = [
  { value: "groceries", label: "Mercado", emoji: "🛒", color: "#4A7C59" },
  { value: "home", label: "Hogar", emoji: "🏠", color: "#C96A3B" },
  { value: "personal_care", label: "Cuidado", emoji: "🧴", color: "#E8B4A0" },
  { value: "eating_out", label: "Restaurantes", emoji: "🍕", color: "#D4A04A" },
  { value: "fun", label: "Diversión", emoji: "🎉", color: "#8B5CA6" },
  { value: "health", label: "Salud", emoji: "💊", color: "#5A9DB5" },
  { value: "repairs", label: "Arreglos", emoji: "🔧", color: "#8A7A6A" },
  { value: "other", label: "Otro", emoji: "❓", color: "#A8997F" },
];

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

export function BudgetClient({
  expenses, budgets, members, currentUserId,
}: { expenses: Expense[]; budgets: Budget[]; members: Member[]; currentUserId: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount)));
    return map;
  }, [expenses]);

  const total = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses],
  );

  const totalBudget = budgets.reduce((s, b) => s + Number(b.monthly_limit), 0);
  const budgetByCategory = Object.fromEntries(budgets.map((b) => [b.category, Number(b.monthly_limit)]));

  async function remove(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", id);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Gastado" value={formatCurrency(total)} emoji="💸" />
        <SummaryCard
          label="Presupuesto"
          value={totalBudget > 0 ? formatCurrency(totalBudget) : "—"}
          emoji="🎯"
        />
        <SummaryCard
          label="Restante"
          value={totalBudget > 0 ? formatCurrency(Math.max(0, totalBudget - total)) : "—"}
          emoji="🌱"
        />
      </div>

      <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Por categoría</h2>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-full bg-accent-primary text-bg-card px-5 py-2 text-sm font-medium shadow-warm"
          >
            {showForm ? "Cerrar" : "+ Gasto"}
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <NewExpenseForm
                members={members}
                currentUserId={currentUserId}
                onDone={() => {
                  setShowForm(false);
                  startTransition(() => router.refresh());
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3 mt-2">
          {CATEGORIES.map((c) => {
            const spent = byCategory.get(c.value) ?? 0;
            const limit = budgetByCategory[c.value] ?? 0;
            const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const danger = limit > 0 && spent >= limit;
            const warn = limit > 0 && spent >= limit * 0.8 && !danger;
            if (spent === 0 && limit === 0) return null;
            return (
              <div key={c.value}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{c.emoji}</span>
                    <span className="font-medium">{c.label}</span>
                  </span>
                  <span className={cn("font-mono", danger ? "text-red-700" : warn ? "text-amber-700" : "text-ink-muted")}>
                    {formatCurrency(spent)}{limit > 0 && ` / ${formatCurrency(limit)}`}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-bg-main overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${limit > 0 ? pct : Math.min(100, (spent / Math.max(1, total)) * 100)}%`,
                      background: danger ? "#C9543B" : warn ? "#D4A04A" : c.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-5">
        <h2 className="font-display text-2xl mb-4">Movimientos del mes</h2>
        {expenses.length === 0 ? (
          <p className="text-ink-muted text-center py-8">Aún no hay gastos. ¡Empezá registrando uno! 🌱</p>
        ) : (
          <ul className="divide-y divide-line">
            {expenses.map((e) => {
              const c = CAT[e.category] ?? CAT.other;
              const payer = e.paid_by ? memberById[e.paid_by] : null;
              return (
                <li key={e.id} className="py-3 flex items-center gap-3">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {e.notes || c.label}
                      {!e.is_shared && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-muted">personal</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-muted font-mono">
                      {e.date}{payer && ` · ${payer.avatar_emoji} ${payer.name}`}
                    </p>
                  </div>
                  <span className="font-mono font-medium">{formatCurrency(Number(e.amount))}</span>
                  <button
                    onClick={() => remove(e.id)}
                    className="text-ink-muted hover:text-accent-primary text-sm"
                    aria-label="Eliminar"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="rounded-3xl border border-line bg-bg-card p-5 shadow-warm">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wider text-ink-muted">{label}</p>
        <span className="text-2xl">{emoji}</span>
      </div>
      <p className="font-display text-3xl mt-2 font-mono">{value}</p>
    </div>
  );
}

function NewExpenseForm({
  members, currentUserId, onDone,
}: { members: Member[]; currentUserId: string; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("groceries");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [isShared, setIsShared] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user!.id).single();
    await supabase.from("expenses").insert({
      home_id: profile!.home_id,
      amount: num,
      category,
      date,
      paid_by: paidBy,
      is_shared: isShared,
      notes: notes || null,
    });
    setAmount("");
    setNotes("");
    setLoading(false);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 mb-4 p-4 rounded-2xl bg-bg-main border border-line">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-ink-muted">Monto</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Categoría</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Fecha</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Pagado por</span>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.avatar_emoji} {m.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-ink-muted">Notas</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Compra del fin de semana"
          className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
        <span>Gasto compartido</span>
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
          disabled={loading}
          className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Agregar gasto"}
        </button>
      </div>
    </form>
  );
}
