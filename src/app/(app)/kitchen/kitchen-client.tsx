"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Clock, Users, Utensils, ChevronDown, ChevronUp, Search, ChefHat } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";

type Recipe = {
  id: string;
  title: string;
  prep_minutes: number | null;
  servings: number | null;
  ingredients: string | null;
  steps: string | null;
  tags: string[] | null;
  created_at: string;
  last_cooked_at: string | null;
};

export function KitchenClient({ recipes: serverRecipes }: { recipes: Recipe[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [recipes, setRecipes] = useState<Recipe[]>(serverRecipes);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => setRecipes(serverRecipes), [serverRecipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
        (r.ingredients ?? "").toLowerCase().includes(q),
    );
  }, [recipes, query]);

  async function remove(r: Recipe) {
    setRecipes((arr) => arr.filter((x) => x.id !== r.id));
    const supabase = createClient();
    const { error } = await supabase.from("recipes").delete().eq("id", r.id);
    if (error) {
      setRecipes((arr) => [r, ...arr]);
      toast.error("No se pudo eliminar");
      return;
    }
    toast({
      title: `"${r.title}" eliminada`,
      action: {
        label: "Deshacer",
        onClick: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from("profiles")
            .select("home_id")
            .eq("id", user!.id)
            .single();
          await supabase.from("recipes").insert({
            id: r.id,
            home_id: profile!.home_id,
            title: r.title,
            prep_minutes: r.prep_minutes,
            servings: r.servings,
            ingredients: r.ingredients,
            steps: r.steps,
            tags: r.tags,
            last_cooked_at: r.last_cooked_at,
          });
          startTransition(() => router.refresh());
        },
      },
    });
    startTransition(() => router.refresh());
  }

  async function markCooked(r: Recipe) {
    const now = new Date().toISOString();
    setRecipes((arr) =>
      arr.map((x) => (x.id === r.id ? { ...x, last_cooked_at: now } : x)),
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("recipes")
      .update({ last_cooked_at: now })
      .eq("id", r.id);
    if (error) {
      setRecipes((arr) => arr.map((x) => (x.id === r.id ? r : x)));
      toast.error("No se pudo marcar");
      return;
    }
    toast.success(`"${r.title}" cocinada hoy`);
    startTransition(() => router.refresh());
  }

  async function addIngredientsToList(r: Recipe) {
    if (!r.ingredients?.trim()) {
      toast.error("Esta receta no tiene ingredientes cargados");
      return;
    }
    const lines = r.ingredients
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error("Sin ingredientes válidos");
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", user!.id)
      .single();
    const { error } = await supabase.from("grocery_items").insert(
      lines.map((line) => ({
        home_id: profile!.home_id,
        name: line,
        category: "general",
        added_by: user!.id,
      })),
    );
    if (error) {
      toast.error("No se pudo agregar a la despensa");
      return;
    }
    toast.success(`${lines.length} ${lines.length === 1 ? "item" : "items"} en despensa`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar receta…"
            className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-line bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          />
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card px-5 py-2.5 text-sm font-medium shadow-warm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cerrar" : "Nueva"}
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

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
            <Utensils className="w-8 h-8" strokeWidth={1.6} />
          </div>
          <p className="font-display text-2xl">
            {query ? "Nada coincide" : "Sin recetas todavía"}
          </p>
          <p className="text-ink-muted mt-2 leading-relaxed">
            {query
              ? "Probá con otra palabra."
              : "Guardá la primera para no olvidarla."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((r) => {
              const open = expanded === r.id;
              const lastCooked = r.last_cooked_at
                ? formatDistanceToNow(new Date(r.last_cooked_at), {
                    locale: es,
                    addSuffix: true,
                  })
                : null;
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
                    <button
                      onClick={() => setExpanded(open ? null : r.id)}
                      className="text-left flex-1 min-w-0"
                    >
                      <p className="font-display text-xl leading-tight">{r.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted flex-wrap">
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
                        {lastCooked && (
                          <span className="inline-flex items-center gap-1 text-accent-secondary">
                            <ChefHat className="w-3 h-3" />
                            {lastCooked}
                          </span>
                        )}
                        {r.tags && r.tags.length > 0 && (
                          <span className="truncate">{r.tags.join(" · ")}</span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => setExpanded(open ? null : r.id)}
                      className="text-ink-muted shrink-0"
                      aria-label={open ? "Cerrar" : "Abrir"}
                    >
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => remove(r)}
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
                        <div className="px-4 pb-4 flex gap-2 flex-wrap">
                          <button
                            onClick={() => markCooked(r)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent-secondary text-bg-card px-4 py-2 text-sm font-medium shadow-warm"
                          >
                            <ChefHat className="w-4 h-4" />
                            Cocinada hoy
                          </button>
                          <button
                            onClick={() => addIngredientsToList(r)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-main px-4 py-2 text-sm text-ink-muted"
                          >
                            <Plus className="w-4 h-4" />
                            Ingredientes a despensa
                          </button>
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
    const { error } = await supabase.from("recipes").insert({
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
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success("Receta guardada");
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
