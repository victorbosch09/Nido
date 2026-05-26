"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronRight, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Status = "pending" | "in_progress" | "done";
type Urgency = "low" | "normal" | "urgent";

type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  urgency: Urgency;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};
type Member = { id: string; name: string; avatar_emoji: string };

const COLUMNS: { value: Status; label: string }[] = [
  { value: "pending", label: "Por hacer" },
  { value: "in_progress", label: "En curso" },
  { value: "done", label: "Listo" },
];

const URGENCY_COLOR: Record<Urgency, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  normal: "bg-amber-50 text-amber-800 border-amber-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  low: "tranqui",
  normal: "normal",
  urgent: "urgente",
};

const NEXT_STATUS: Record<Status, Status | null> = {
  pending: "in_progress",
  in_progress: "done",
  done: null,
};
const PREV_STATUS: Record<Status, Status | null> = {
  pending: null,
  in_progress: "pending",
  done: "in_progress",
};

export function PendingClient({
  todos,
  members,
  currentUserId,
}: {
  todos: Todo[];
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const byStatus = useMemo(() => {
    const map: Record<Status, Todo[]> = { pending: [], in_progress: [], done: [] };
    for (const t of todos) map[t.status].push(t);
    return map;
  }, [todos]);

  async function move(todo: Todo, dir: "prev" | "next") {
    const target = dir === "next" ? NEXT_STATUS[todo.status] : PREV_STATUS[todo.status];
    if (!target) return;
    const supabase = createClient();
    await supabase
      .from("todos")
      .update({
        status: target,
        completed_at: target === "done" ? new Date().toISOString() : null,
      })
      .eq("id", todo.id);
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("todos").delete().eq("id", id);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card px-5 py-2 text-sm font-medium shadow-warm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cerrar" : "Nuevo pendiente"}
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
            <NewTodoForm
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <section
            key={col.value}
            className="rounded-3xl border border-line bg-bg-card shadow-warm p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl">{col.label}</h2>
              <span className="text-xs text-ink-muted font-mono">
                {byStatus[col.value].length}
              </span>
            </div>
            {byStatus[col.value].length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-6">—</p>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {byStatus[col.value].map((t) => {
                    const assignee = t.assigned_to ? memberById[t.assigned_to] : null;
                    const next = NEXT_STATUS[t.status];
                    const prev = PREV_STATUS[t.status];
                    return (
                      <motion.li
                        key={t.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="rounded-2xl border border-line bg-bg-main p-3"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium leading-tight">{t.title}</p>
                            {t.description && (
                              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                                {t.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full border",
                                  URGENCY_COLOR[t.urgency],
                                )}
                              >
                                {URGENCY_LABEL[t.urgency]}
                              </span>
                              {assignee && (
                                <span
                                  className="text-xs text-ink-muted"
                                  title={assignee.name}
                                >
                                  {assignee.avatar_emoji} {assignee.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => remove(t.id)}
                            className="text-ink-muted hover:text-accent-primary shrink-0"
                            aria-label="Eliminar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => move(t, "prev")}
                            disabled={!prev}
                            className="flex-1 rounded-lg border border-line text-xs py-1 text-ink-muted disabled:opacity-30 hover:border-accent-soft"
                            aria-label="Mover atrás"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 mx-auto" />
                          </button>
                          <button
                            onClick={() => move(t, "next")}
                            disabled={!next}
                            className="flex-1 rounded-lg border border-line text-xs py-1 text-ink-muted disabled:opacity-30 hover:border-accent-soft"
                            aria-label="Avanzar"
                          >
                            <ChevronRight className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function NewTodoForm({
  members,
  currentUserId,
  onDone,
}: {
  members: Member[];
  currentUserId: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [assignedTo, setAssignedTo] = useState<string>(currentUserId);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", user!.id)
      .single();
    await supabase.from("todos").insert({
      home_id: profile!.home_id,
      title: title.trim(),
      description: description.trim() || null,
      urgency,
      assigned_to: assignedTo || null,
      created_by: currentUserId,
    });
    setTitle("");
    setDescription("");
    setLoading(false);
    onDone();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 p-4 rounded-2xl bg-bg-main border border-line"
    >
      <label className="block">
        <span className="text-xs text-ink-muted">Título</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          placeholder="Ej: renovar pasaporte"
          required
          className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </label>
      <label className="block">
        <span className="text-xs text-ink-muted">Detalle (opcional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-ink-muted">Urgencia</span>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as Urgency)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          >
            <option value="low">Tranqui</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgente</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Asignado</span>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          >
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.avatar_emoji} {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
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
          disabled={loading || !title.trim()}
          className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Crear"}
        </button>
      </div>
    </form>
  );
}
