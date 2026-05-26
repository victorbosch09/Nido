"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ListTodo, Wallet, CheckCircle2, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";

type Mood = { date: string; score: number };

const MOODS: { score: number; label: string; emoji: string }[] = [
  { score: 1, label: "Muy bajo", emoji: "😞" },
  { score: 2, label: "Bajo", emoji: "😔" },
  { score: 3, label: "Neutro", emoji: "😐" },
  { score: 4, label: "Bien", emoji: "🙂" },
  { score: 5, label: "Genial", emoji: "😄" },
];

export function MeClient({
  homeId,
  currentUserId,
  todayMood,
  recentMoods,
  pendingCount,
  doneCount,
  monthTotalSpent,
  monthPersonalSpent,
}: {
  homeId: string;
  currentUserId: string;
  todayMood: { score: number; notes: string | null } | null;
  recentMoods: Mood[];
  pendingCount: number;
  doneCount: number;
  monthTotalSpent: number;
  monthPersonalSpent: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [score, setScore] = useState<number | null>(todayMood?.score ?? null);
  const [notes, setNotes] = useState(todayMood?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function saveMood(newScore: number) {
    setSaving(true);
    setScore(newScore);
    const supabase = createClient();
    const today = format(new Date(), "yyyy-MM-dd");
    await supabase
      .from("moods")
      .upsert(
        {
          profile_id: currentUserId,
          home_id: homeId,
          date: today,
          score: newScore,
          notes: notes.trim() || null,
        },
        { onConflict: "profile_id,date" },
      );
    setSaving(false);
    startTransition(() => router.refresh());
  }

  async function saveNotes() {
    if (score == null) return;
    setSaving(true);
    const supabase = createClient();
    const today = format(new Date(), "yyyy-MM-dd");
    await supabase
      .from("moods")
      .upsert(
        {
          profile_id: currentUserId,
          home_id: homeId,
          date: today,
          score,
          notes: notes.trim() || null,
        },
        { onConflict: "profile_id,date" },
      );
    setSaving(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {/* Mood check-in */}
      <section className="rounded-3xl border border-line bg-bg-card shadow-warm p-5">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Hoy te sentís…</p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {MOODS.map((m) => {
            const active = score === m.score;
            return (
              <motion.button
                key={m.score}
                whileTap={{ scale: 0.92 }}
                onClick={() => saveMood(m.score)}
                disabled={saving}
                aria-label={m.label}
                className={cn(
                  "rounded-2xl border py-3 flex flex-col items-center gap-1",
                  active
                    ? "border-accent-primary bg-accent-soft/30 shadow-warm"
                    : "border-line bg-bg-main hover:border-accent-soft",
                )}
              >
                <span className="text-2xl leading-none">{m.emoji}</span>
                <span className="text-[10px] text-ink-muted">{m.label}</span>
              </motion.button>
            );
          })}
        </div>
        {score != null && (
          <label className="block mt-4">
            <span className="text-xs text-ink-muted">Nota del día (opcional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="¿Qué pasó hoy?"
              className="mt-1 w-full rounded-xl border border-line bg-bg-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            />
          </label>
        )}

        {recentMoods.length > 1 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wider text-ink-muted">Últimos 14 días</p>
            <div className="mt-2 flex items-end gap-1 h-12">
              {recentMoods.map((m) => {
                const h = (m.score / 5) * 100;
                return (
                  <div
                    key={m.date}
                    className="flex-1 rounded-t bg-accent-primary/60"
                    style={{ height: `${h}%` }}
                    title={`${m.date}: ${m.score}/5`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Mi balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Tus pendientes"
          value={String(pendingCount)}
          icon={ListTodo}
          hint="tareas asignadas a vos"
        />
        <StatCard
          label="Hechas este mes"
          value={String(doneCount)}
          icon={CheckCircle2}
          hint="tareas completadas por vos"
        />
        <StatCard
          label="Pagaste este mes"
          value={formatCurrency(monthTotalSpent)}
          icon={Wallet}
          hint={
            monthPersonalSpent > 0
              ? `${formatCurrency(monthPersonalSpent)} personal`
              : "todo compartido"
          }
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wider text-ink-muted">{label}</p>
        <Icon className="w-5 h-5 text-accent-primary" strokeWidth={1.6} />
      </div>
      <p className="font-display text-3xl mt-2">{value}</p>
      {hint && <p className="text-xs text-ink-muted mt-1">{hint}</p>}
    </div>
  );
}
