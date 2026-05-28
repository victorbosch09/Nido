"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Plus, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { CATEGORY_ICON, type IconName } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Chore = {
  id: string;
  title: string;
  category: string;
  day_of_week: number;
  assigned_to: string | null;
};
type Member = { id: string; name: string; avatar_emoji: string };
type Log = { chore_id: string; completed_by: string | null; completed_at: string };

// Orden de display lunes-primero; getDay() usa 0=domingo
const DAYS = [
  { dow: 1, label: "Lunes", short: "Lun" },
  { dow: 2, label: "Martes", short: "Mar" },
  { dow: 3, label: "Miércoles", short: "Mié" },
  { dow: 4, label: "Jueves", short: "Jue" },
  { dow: 5, label: "Viernes", short: "Vie" },
  { dow: 6, label: "Sábado", short: "Sáb" },
  { dow: 0, label: "Domingo", short: "Dom" },
];

function catIcon(c: string) {
  return CATEGORY_ICON[c as IconName] ?? CATEGORY_ICON.general;
}

export function RoutineClient({
  chores: serverChores,
  members,
  todayLogs: serverLogs,
  currentUserId,
  todayDow,
}: {
  chores: Chore[];
  members: Member[];
  todayLogs: Log[];
  currentUserId: string;
  todayDow: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [chores, setChores] = useState<Chore[]>(serverChores);
  const [logs, setLogs] = useState<Log[]>(serverLogs);
  const [showForm, setShowForm] = useState(false);

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const doneByChore = useMemo(
    () => new Map(logs.map((l) => [l.chore_id, l])),
    [logs],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, Chore[]>();
    for (const d of DAYS) map.set(d.dow, []);
    for (const c of chores) (map.get(c.day_of_week) ?? []).push(c);
    return map;
  }, [chores]);

  const todayChores = byDay.get(todayDow) ?? [];

  async function toggleToday(chore: Chore) {
    const existing = doneByChore.get(chore.id);
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", currentUserId)
      .single();
    const homeId = profile!.home_id;
    const today = format(new Date(), "yyyy-MM-dd");

    if (existing) {
      // desmarcar
      setLogs((arr) => arr.filter((l) => l.chore_id !== chore.id));
      const { error } = await supabase
        .from("chore_logs")
        .delete()
        .eq("chore_id", chore.id)
        .eq("date", today);
      if (error) {
        setLogs((arr) => [...arr, existing]);
        toast.error("No se pudo actualizar");
        return;
      }
    } else {
      const optimistic: Log = {
        chore_id: chore.id,
        completed_by: currentUserId,
        completed_at: new Date().toISOString(),
      };
      setLogs((arr) => [...arr, optimistic]);
      const { error } = await supabase.from("chore_logs").insert({
        home_id: homeId,
        chore_id: chore.id,
        date: today,
        completed_by: currentUserId,
      });
      if (error) {
        setLogs((arr) => arr.filter((l) => l.chore_id !== chore.id));
        toast.error("No se pudo marcar");
        return;
      }
      toast.success("¡Hecho!");
    }
    startTransition(() => router.refresh());
  }

  async function removeChore(chore: Chore) {
    setChores((arr) => arr.filter((c) => c.id !== chore.id));
    const supabase = createClient();
    const { error } = await supabase.from("chore_schedule").delete().eq("id", chore.id);
    if (error) {
      setChores((arr) => [...arr, chore]);
      toast.error("No se pudo eliminar");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {/* Hoy */}
      <section className="rounded-3xl border border-accent-soft bg-accent-soft/15 p-5">
        <div className="flex items-center gap-2 text-accent-primary mb-3">
          <CalendarDays className="w-5 h-5" strokeWidth={1.8} />
          <p className="font-medium text-ink">
            Hoy · {DAYS.find((d) => d.dow === todayDow)?.label}
          </p>
        </div>
        {todayChores.length === 0 ? (
          <p className="text-sm text-ink-muted">Nada fijo para hoy. Disfrutá.</p>
        ) : (
          <ul className="space-y-2">
            {todayChores.map((c) => {
              const log = doneByChore.get(c.id);
              const done = !!log;
              const assignee = c.assigned_to ? memberById[c.assigned_to] : null;
              const Icon = catIcon(c.category);
              const doneBy = log?.completed_by ? memberById[log.completed_by] : null;
              return (
                <li
                  key={c.id}
                  className={cn(
                    "rounded-2xl bg-bg-card border border-line p-3 flex items-center gap-3",
                    done && "opacity-70",
                  )}
                >
                  <button
                    onClick={() => toggleToday(c)}
                    aria-label={done ? "Desmarcar" : "Marcar hecha"}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0",
                      done
                        ? "bg-accent-secondary border-accent-secondary text-bg-card"
                        : "border-line hover:border-accent-primary",
                    )}
                  >
                    {done && <Check className="w-4 h-4" strokeWidth={3} />}
                  </button>
                  <span className="w-9 h-9 rounded-xl bg-accent-soft/25 text-accent-primary flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium truncate", done && "line-through")}>{c.title}</p>
                    {assignee && (
                      <p className="text-xs text-ink-muted">
                        {assignee.avatar_emoji} {assignee.name}
                        {done && doneBy && doneBy.id !== assignee.id && ` · lo hizo ${doneBy.name}`}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Semana completa */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">La semana</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card px-5 py-2 text-sm font-medium shadow-warm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cerrar" : "Tarea fija"}
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
            <NewChoreForm
              members={members}
              currentUserId={currentUserId}
              defaultDow={todayDow}
              onDone={() => {
                setShowForm(false);
                startTransition(() => router.refresh());
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {DAYS.map((d) => {
          const list = byDay.get(d.dow) ?? [];
          const isToday = d.dow === todayDow;
          return (
            <div
              key={d.dow}
              className={cn(
                "rounded-2xl border p-4",
                isToday ? "border-accent-primary bg-bg-card" : "border-line bg-bg-card",
              )}
            >
              <p className={cn("text-xs uppercase tracking-wider mb-2", isToday ? "text-accent-primary" : "text-ink-muted")}>
                {d.label}{isToday && " · hoy"}
              </p>
              {list.length === 0 ? (
                <p className="text-sm text-ink-muted">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {list.map((c) => {
                    const assignee = c.assigned_to ? memberById[c.assigned_to] : null;
                    const Icon = catIcon(c.category);
                    return (
                      <li key={c.id} className="flex items-center gap-2.5 text-sm">
                        <Icon className="w-4 h-4 text-accent-primary shrink-0" strokeWidth={1.8} />
                        <span className="flex-1 min-w-0 truncate">{c.title}</span>
                        {assignee && (
                          <span className="text-ink-muted shrink-0" title={assignee.name}>
                            {assignee.avatar_emoji}
                          </span>
                        )}
                        <button
                          onClick={() => removeChore(c)}
                          className="text-ink-muted hover:text-accent-primary shrink-0"
                          aria-label="Eliminar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewChoreForm({
  members,
  currentUserId,
  defaultDow,
  onDone,
}: {
  members: Member[];
  currentUserId: string;
  defaultDow: number;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [dow, setDow] = useState(defaultDow);
  const [assignedTo, setAssignedTo] = useState(currentUserId);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", currentUserId)
      .single();
    const { error } = await supabase.from("chore_schedule").insert({
      home_id: profile!.home_id,
      title: title.trim(),
      category,
      day_of_week: dow,
      assigned_to: assignedTo || null,
    });
    setLoading(false);
    if (error) {
      toast.error("No se pudo crear");
      return;
    }
    setTitle("");
    toast.success("Tarea fija agregada");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4 rounded-2xl bg-bg-main border border-line">
      <label className="block">
        <span className="text-xs text-ink-muted">Tarea</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          placeholder="Ej: lavar los platos"
          required
          className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-ink-muted">Día</span>
          <select
            value={dow}
            onChange={(e) => setDow(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          >
            {DAYS.map((d) => (
              <option key={d.dow} value={d.dow}>{d.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Categoría</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          >
            <option value="cleaning">Limpieza</option>
            <option value="laundry">Lavandería</option>
            <option value="kitchen">Cocina</option>
            <option value="general">General</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Asignado</span>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          >
            <option value="">Cualquiera</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.avatar_emoji} {m.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="rounded-full border border-line bg-bg-card px-5 py-2 text-sm">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Agregar"}
        </button>
      </div>
    </form>
  );
}
