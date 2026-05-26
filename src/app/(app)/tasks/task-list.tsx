"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

export function TaskList({
  tasks, members, currentUserId,
}: { tasks: Task[]; members: Member[]; currentUserId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "mine" | "pending" | "done">("all");

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const filtered = tasks.filter((t) => {
    if (filter === "mine") return t.assigned_to === currentUserId;
    if (filter === "pending") return t.status === "pending";
    if (filter === "done") return t.status === "done";
    return true;
  });

  async function toggle(task: Task) {
    const supabase = createClient();
    if (task.status === "pending") {
      await supabase
        .from("tasks")
        .update({ status: "done", completed_at: new Date().toISOString(), completed_by: currentUserId })
        .eq("id", task.id);
    } else {
      await supabase
        .from("tasks")
        .update({ status: "pending", completed_at: null, completed_by: null })
        .eq("id", task.id);
    }
    startTransition(() => router.refresh());
  }

  async function remove(task: Task) {
    if (!confirm(`¿Eliminar "${task.title}"?`)) return;
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", task.id);
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "mine", "pending", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm border",
              filter === f
                ? "bg-accent-primary text-bg-card border-accent-primary"
                : "bg-bg-card border-line text-ink-muted hover:border-accent-soft",
            )}
          >
            {{ all: "Todas", mine: "Mías", pending: "Pendientes", done: "Hechas" }[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-muted text-center py-12">No hay tareas en esta vista.</p>
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
                    disabled={isPending}
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
