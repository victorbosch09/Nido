"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Clock, Users, Utensils, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Recipe = {
  id: string;
  title: string;
  prep_minutes: number | null;
  servings: number | null;
  ingredients: string | null;
  steps: string | null;
  tags: string[] | null;
  created_at: string;
};

export function KitchenClient({ recipes }: { recipes: Recipe[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta receta?")) return;
    const supabase = createClient();
    await supabase.from("recipes").delete().eq("id", id);
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
          {showForm ? "Cerrar" : "Nueva receta"}
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
            <NewRecipeForm
              onDone={() => {
                setShowForm(false);
                startTransition(() => router.refresh());
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {recipes.length === 0 ? (
        <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
            <Utensils className="w-8 h-8" strokeWidth={1.6} />
          </div>
          <p className="font-display text-2xl">Sin recetas todavía</p>
          <p className="text-ink-muted mt-2 leading-relaxed">
            Guardá la primera para no olvidarla.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {recipes.map((r) => {
              const open = expanded === r.id;
              return (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="rounded-2xl bg-bg-card border border-line shadow-warm overflow-hidden"
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-soft/25 text-accent-primary flex items-center justify-center shrink-0">
                      <Utensils className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setExpanded(open ? null : r.id)}
                        className="text-left w-full"
                      >
                        <p className="font-display text-xl leading-tight">{r.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted">
                          {r.prep_minutes != null && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {r.prep_minutes} min
                            </span>
                          )}
                          {r.servings != null && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {r.servings} porc.
                            </span>
                          )}
                          {r.tags && r.tags.length > 0 && (
                            <span className="truncate">{r.tags.join(" · ")}</span>
                          )}
                        </div>
                      </button>
                    </div>
                    <button
                      onClick={() => setExpanded(open ? null : r.id)}
                      className="text-ink-muted shrink-0"
                      aria-label={open ? "Cerrar" : "Abrir"}
                    >
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="text-ink-muted hover:text-accent-primary shrink-0"
                      aria-label="Eliminar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-line grid sm:grid-cols-2 gap-4 pt-4">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-ink-muted">Ingredientes</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                              {r.ingredients?.trim() || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wider text-ink-muted">Preparación</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                              {r.steps?.trim() || "—"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function NewRecipeForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [prepMinutes, setPrepMinutes] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [tagsInput, setTagsInput] = useState("");
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
    const tags = tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await supabase.from("recipes").insert({
      home_id: profile!.home_id,
      title: title.trim(),
      prep_minutes: prepMinutes.trim() ? Number(prepMinutes) : null,
      servings: servings.trim() ? Number(servings) : null,
      ingredients: ingredients.trim() || null,
      steps: steps.trim() || null,
      tags,
      created_by: user!.id,
    });
    setLoading(false);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4 rounded-2xl bg-bg-main border border-line">
      <label className="block">
        <span className="text-xs text-ink-muted">Título</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
          placeholder="Ej: pasta al pesto"
          className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-ink-muted">Minutos</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={prepMinutes}
            onChange={(e) => setPrepMinutes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Porciones</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted">Tags (coma)</span>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="rápida, veggie"
            className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-ink-muted">Ingredientes (uno por línea)</span>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
      </label>
      <label className="block">
        <span className="text-xs text-ink-muted">Preparación</span>
        <textarea
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
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
          disabled={loading || !title.trim()}
          className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar receta"}
        </button>
      </div>
    </form>
  );
}
