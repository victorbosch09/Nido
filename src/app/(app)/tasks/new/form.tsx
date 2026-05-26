"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = { id: string; name: string; avatar_emoji: string };

const CATEGORIES = [
  { value: "cleaning", label: "Limpieza 🧹" },
  { value: "laundry", label: "Lavandería 👕" },
  { value: "kitchen", label: "Cocina 🍳" },
  { value: "general", label: "General 🏠" },
];

export function NewTaskForm({ members }: { members: Member[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [recurrence, setRecurrence] = useState<"once" | "daily" | "weekly" | "monthly">("once");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(members[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user!.id).single();

    const { error } = await supabase.from("tasks").insert({
      home_id: profile!.home_id,
      title,
      description: description || null,
      category,
      priority,
      recurrence,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/tasks");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Título" value={title} onChange={setTitle} required />
      <label className="block">
        <span className="text-sm text-ink-muted">Descripción</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-line bg-bg-main px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Categoría" value={category} onChange={setCategory} options={CATEGORIES} />
        <Select
          label="Prioridad"
          value={priority}
          onChange={(v) => setPriority(v as typeof priority)}
          options={[
            { value: "low", label: "Baja" },
            { value: "medium", label: "Media" },
            { value: "high", label: "Alta" },
          ]}
        />
        <Select
          label="Repetición"
          value={recurrence}
          onChange={(v) => setRecurrence(v as typeof recurrence)}
          options={[
            { value: "once", label: "Una vez" },
            { value: "daily", label: "Diaria" },
            { value: "weekly", label: "Semanal" },
            { value: "monthly", label: "Mensual" },
          ]}
        />
        <Field label="Fecha" type="date" value={dueDate} onChange={setDueDate} />
      </div>

      <label className="block">
        <span className="text-sm text-ink-muted">Asignar a</span>
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-bg-main px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        >
          <option value="">Sin asignar</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.avatar_emoji} {m.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-line bg-bg-card px-6 py-3 text-ink-muted"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-3 shadow-warm disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Crear tarea"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label, type = "text", value, onChange, required,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-xl border border-line bg-bg-main px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
      />
    </label>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="text-sm text-ink-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-bg-main px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
