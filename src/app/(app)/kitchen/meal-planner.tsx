"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarRange, X, ChevronDown, ChevronUp } from "lucide-react";
import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

type Meal = { id: string; date: string; slot: "lunch" | "dinner"; recipe_id: string | null; title: string | null };
type RecipeRef = { id: string; title: string };

const SLOTS: { value: "lunch" | "dinner"; label: string }[] = [
  { value: "lunch", label: "Almuerzo" },
  { value: "dinner", label: "Cena" },
];

export function MealPlanner({
  meals: serverMeals,
  recipes,
  weekStart,
  currentUserId,
}: {
  meals: Meal[];
  recipes: RecipeRef[];
  weekStart: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<{ date: string; slot: "lunch" | "dinner" } | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(new Date(weekStart + "T00:00:00"), i)),
    [weekStart],
  );

  function mealAt(date: string, slot: "lunch" | "dinner"): Meal | undefined {
    return serverMeals.find((m) => m.date === date && m.slot === slot);
  }

  async function setMeal(date: string, slot: "lunch" | "dinner", recipeId: string | null, title: string | null) {
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", currentUserId).single();
    if (!recipeId && !title) {
      await supabase.from("meal_plans").delete().eq("home_id", profile!.home_id).eq("date", date).eq("slot", slot);
    } else {
      const { error } = await supabase.from("meal_plans").upsert(
        { home_id: profile!.home_id, date, slot, recipe_id: recipeId, title, created_by: currentUserId },
        { onConflict: "home_id,date,slot" },
      );
      if (error) { toast.error("No se pudo guardar"); return; }
    }
    setEditing(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-5">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
            <CalendarRange className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </span>
          <div className="text-left">
            <p className="font-medium">Plan de comidas</p>
            <p className="text-xs text-ink-muted">Semana del {format(new Date(weekStart + "T00:00:00"), "d 'de' MMM", { locale: es })}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-2">
              {days.map((d) => {
                const dateStr = format(d, "yyyy-MM-dd");
                const isToday = isSameDay(d, new Date());
                return (
                  <div key={dateStr} className={cn("rounded-2xl border p-3", isToday ? "border-accent-primary bg-bg-main" : "border-line bg-bg-main")}>
                    <p className={cn("text-xs uppercase tracking-wider mb-2", isToday ? "text-accent-primary" : "text-ink-muted")}>
                      {format(d, "EEEE d", { locale: es })}{isToday && " · hoy"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {SLOTS.map((s) => {
                        const meal = mealAt(dateStr, s.value);
                        const label = meal?.recipe_id ? recipes.find((r) => r.id === meal.recipe_id)?.title ?? meal.title : meal?.title;
                        const isEditing = editing?.date === dateStr && editing?.slot === s.value;
                        return (
                          <div key={s.value}>
                            <p className="text-[10px] text-ink-muted mb-1">{s.label}</p>
                            {isEditing ? (
                              <SlotEditor
                                recipes={recipes}
                                onPick={(rid, title) => setMeal(dateStr, s.value, rid, title)}
                                onCancel={() => setEditing(null)}
                              />
                            ) : label ? (
                              <button
                                onClick={() => setEditing({ date: dateStr, slot: s.value })}
                                className="w-full text-left rounded-xl bg-bg-card border border-line px-2.5 py-1.5 text-sm flex items-center justify-between gap-1 group"
                              >
                                <span className="truncate">{label}</span>
                                <X className="w-3.5 h-3.5 text-ink-muted shrink-0" onClick={(e) => { e.stopPropagation(); setMeal(dateStr, s.value, null, null); }} />
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditing({ date: dateStr, slot: s.value })}
                                className="w-full rounded-xl border border-dashed border-line px-2.5 py-1.5 text-sm text-ink-muted hover:border-accent-soft"
                              >
                                + agregar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlotEditor({
  recipes, onPick, onCancel,
}: {
  recipes: RecipeRef[];
  onPick: (recipeId: string | null, title: string | null) => void;
  onCancel: () => void;
}) {
  const [free, setFree] = useState("");
  return (
    <div className="space-y-1.5">
      {recipes.length > 0 && (
        <select
          autoFocus
          defaultValue=""
          onChange={(e) => { if (e.target.value) onPick(e.target.value, null); }}
          className="w-full rounded-xl border border-line bg-bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        >
          <option value="">Elegir receta…</option>
          {recipes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); if (free.trim()) onPick(null, free.trim()); }}
        className="flex gap-1"
      >
        <input
          value={free}
          onChange={(e) => setFree(e.target.value)}
          placeholder="o escribí…"
          className="flex-1 min-w-0 rounded-xl border border-line bg-bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
        <button type="button" onClick={onCancel} className="text-ink-muted px-1" aria-label="Cancelar"><X className="w-4 h-4" /></button>
      </form>
    </div>
  );
}
