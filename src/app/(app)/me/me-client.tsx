"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ListTodo, Wallet, CheckCircle2, type LucideIcon } from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { formatCurrency, cn } from "@/lib/utils";

type Mood = { date: string; score: number };

const MOODS: { score: number; label: string; emoji: string }[] = [
  { score: 1, label: "Muy bajo", emoji: "😞" },
  { score: 2, label: "Bajo", emoji: "😔" },
  { score: 3, label: "Neutro", emoji: "😐" },
  { score: 4, label: "Bien", emoji: "🙂" },
  { score: 5, label: "Genial", emoji: "😄" },
];

const MOOD_COLORS = [
  "bg-bg-main border border-line", // 0 = no data
  "bg-red-200/70",                  // 1
  "bg-amber-200/70",                // 2
  "bg-yellow-200/70",               // 3
  "bg-emerald-200/80",              // 4
  "bg-emerald-400/80",              // 5
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
  const serverScore = todayMood?.score ?? null;
  const serverNotes = todayMood?.notes ?? "";
  const [score, setScore] = useState<number | null>(serverScore);
  const [notes, setNotes] = useState(serverNotes);
  const [saving, setSaving] = useState(false);

  // Re-sincronizar solo cuando el valor real del server cambia (deps primitivas),
  // así un refresh por cambios del partner en otras tablas no pisa lo que tipeás.
  useEffect(() => {
    setScore(serverScore);
  }, [serverScore]);
  useEffect(() => {
    setNotes(serverNotes);
  }, [serverNotes]);

  // 30-day calendar: each cell is a day with a score (or 0 if no data)
  const heatmap = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 29);
    const days = eachDayOfInterval({ start, end: today });
    const byDate = new Map(recentMoods.map((m) => [m.date, m.score]));
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return { date: key, score: byDate.get(key) ?? 0, label: format(d, "d MMM", { locale: es }) };
    });
  }, [recentMoods]);

  async function saveMood(newScore: number) {
    setSaving(true);
    setScore(newScore);
    const supabase = createClient();
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase
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
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success(`Registrado: ${MOODS.find((m) => m.score === newScore)?.label}`);
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

        {/* 30-day heatmap */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-ink-muted">Últimos 30 días</p>
            <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
              <span>menos</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={cn("w-2.5 h-2.5 rounded-sm", MOOD_COLORS[n])} />
              ))}
              <span>más</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-10 gap-1.5">
            {heatmap.map((d) => (
              <div
                key={d.date}
                title={`${d.label}: ${d.score > 0 ? MOODS.find((m) => m.score === d.score)?.label : "sin registro"}`}
                className={cn("aspect-square rounded", MOOD_COLORS[d.score])}
              />
            ))}
          </div>
        </div>
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
