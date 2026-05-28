"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Search } from "lucide-react";
import { addDays, addWeeks, addMonths, format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { Segmented } from "@/components/segmented";
import { CATEGORY_ICON, type IconName } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; avatar_emoji: string };
type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "done";
  due_date: string | null;
  recurrence: "once" | "daily" | "weekly" | "monthly";
  assigned_to: string | null;
  completed_at: string | null;
};

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function getCategoryIcon(category: string) {
  return CATEGORY_ICON[category as IconName] ?? CATEGORY_ICON.general;
}

type Filter = "all" | "mine" | "pending" | "done";

function advanceDate(date: string, recurrence: Task["recurrence"]): string {
  const d = new Date(date + "T00:00:00");
  const next =
    recurrence === "daily" ? addDays(d, 1)
    : recurrence === "weekly" ? addWeeks(d, 1)
    : recurrence === "monthly" ? addMonths(d, 1)
    : d;
  return format(next, "yyyy-MM-dd");
}

export function TaskList({
  tasks: serverTasks,
  members,
  currentUserId,
  homeId,
}: { tasks: Task[]; members: Member[]; currentUserId: string; homeId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tasks, setTasks] = useState<Task[]>(serverTasks);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  // Re-sync local state on server refresh (after router.refresh)
  useEffect(() => setTasks(serverTasks), [serverTasks]);

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const counts = useMemo(
    () => ({
      all: tasks.length,
      mine: tasks.filter((t) => t.assigned_to === currentUserId).length,
      pending: tasks.filter((t) => t.status === "pending").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks, currentUserId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filter === "mine" && t.assigned_to !== currentUserId) return false;
      if (filter === "pending" && t.status !== "pending") return false;
      if (filter === "done" && t.status !== "done") return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, filter, query, currentUserId]);

  async function toggle(task: Task) {
    const newStatus = task.status === "pending" ? "done" : "pending";
    const completed_at = newStatus === "done" ? new Date().toISOString() : null;
    const completed_by = newStatus === "done" ? currentUserId : null;

    // Optimistic
    setTasks((arr) =>
      arr.map((t) =>
        t.id === task.id ? { ...t, status: newStatus, completed_at } : t,
      ),
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus, completed_at, completed_by })
      .eq("id", task.id);

    if (error) {
      // Rollback
      setTasks((arr) => arr.map((t) => (t.id === task.id ? task : t)));
      toast.error("No se pudo actualizar");
      return;
    }

    // Tareas recurrentes: al completarlas, crear la próxima ocurrencia.
    if (newStatus === "done" && task.recurrence !== "once") {
      const base = task.due_date ?? format(new Date(), "yyyy-MM-dd");
      const nextDue = advanceDate(base, task.recurrence);
      const { error: recErr } = await supabase.from("tasks").insert({
        home_id: homeId,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        recurrence: task.recurrence,
        assigned_to: task.assigned_to,
        due_date: nextDue,
        status: "pending",
      });
      if (!recErr) {
        toast.success("Tarea completada", {
          description: `Se repite ${{ daily: "mañana", weekly: "la semana próxima", monthly: "el mes próximo" }[task.recurrence]}`,
        });
      }
    }

    startTransition(() => router.refresh());
  }

  async function remove(task: Task) {
    // Optimistic
    setTasks((arr) => arr.filter((t) => t.id !== task.id));

    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      setTasks((arr) => [task, ...arr]);
      toast.error("No se pudo eliminar");
      return;
    }

    toast({
      title: `"${task.title}" eliminada`,
      action: {
        label: "Deshacer",
        onClick: async () => {
          const { error: insErr } = await supabase.from("tasks").insert({
            id: task.id,
            home_id: (await supabase.from("profiles").select("home_id").eq("id", currentUserId).single()).data?.home_id,
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
            recurrence: task.recurrence,
            status: task.status,
            due_date: task.due_date,
            assigned_to: task.assigned_to,
            completed_at: task.completed_at,
          });
          if (!insErr) {
            setTasks((arr) => [task, ...arr]);
            startTransition(() => router.refresh());
          }
        },
      },
    });
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Todas", count: counts.all },
            { value: "mine", label: "Mías", count: counts.mine },
            { value: "pending", label: "Pendientes", count: counts.pending },
            { value: "done", label: "Hechas", count: counts.done },
          ]}
        />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar tarea…"
          className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-line bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-muted text-center py-12">
          {query ? "Nada coincide con la búsqueda." : "No hay tareas en esta vista."}
        </p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((t) => {
              const assignee = t.assigned_to ? memberById[t.assigned_to] : null;
              const done = t.status === "done";
              const CatIcon = getCategoryIcon(t.category);
              return (
                <motion.li
                  key={t.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className={cn(
                    "rounded-2xl bg-bg-card border border-line p-4 flex items-center gap-3 shadow-warm",
                    done && "opacity-60",
                  )}
                >
                  <button
                    onClick={() => toggle(t)}
                    aria-label={done ? "Marcar pendiente" : "Marcar hecha"}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0",
                      done
                        ? "bg-accent-secondary border-accent-secondary text-bg-card"
                        : "border-line hover:border-accent-primary",
                    )}
                  >
                    {done && <Check className="w-4 h-4" strokeWidth={3} />}
                  </button>

                  <span
                    className="w-9 h-9 rounded-xl bg-accent-soft/25 text-accent-primary flex items-center justify-center shrink-0"
                    aria-hidden
                  >
                    <CatIcon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium truncate", done && "line-through")}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {t.due_date && (
                        <span className="text-xs text-ink-muted font-mono">{t.due_date}</span>
                      )}
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", PRIORITY_COLOR[t.priority])}>
                        {{ low: "baja", medium: "media", high: "alta" }[t.priority]}
                      </span>
                      {t.recurrence !== "once" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-soft/30 text-ink-muted">
                          {{ daily: "diaria", weekly: "semanal", monthly: "mensual" }[t.recurrence]}
                        </span>
                      )}
                    </div>
                  </div>

                  {assignee && (
                    <span
                      className="text-xl leading-none shrink-0"
                      title={assignee.name}
                      aria-label={`Asignada a ${assignee.name}`}
                    >
                      {assignee.avatar_emoji}
                    </span>
                  )}

                  <button
                    onClick={() => remove(t)}
                    className="text-ink-muted hover:text-accent-primary shrink-0"
                    aria-label="Eliminar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
