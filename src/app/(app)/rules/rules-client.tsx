"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Plus, Flame, Handshake } from "lucide-react";
import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

type Rule = { id: string; text: string; active: boolean; created_at: string };
type Log = { rule_id: string; date: string; followed: boolean };

export function RulesClient({
  rules: serverRules,
  logs: serverLogs,
  currentUserId,
  today,
}: {
  rules: Rule[];
  logs: Log[];
  currentUserId: string;
  today: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [rules, setRules] = useState<Rule[]>(serverRules);
  const [logs, setLogs] = useState<Log[]>(serverLogs);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const last7 = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd")),
    [],
  );

  function logFor(ruleId: string, date: string): Log | undefined {
    return logs.find((l) => l.rule_id === ruleId && l.date === date);
  }

  function streak(ruleId: string): number {
    // días consecutivos hacia atrás desde hoy con followed=true
    let count = 0;
    for (let i = 0; i < 60; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const log = logFor(ruleId, d);
      if (log?.followed) count++;
      else break;
    }
    return count;
  }

  async function mark(rule: Rule, followed: boolean) {
    const existing = logFor(rule.id, today);
    // toggle: si ya estaba en ese estado, quitar la marca
    const shouldRemove = existing && existing.followed === followed;

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", currentUserId)
      .single();
    const homeId = profile!.home_id;

    if (shouldRemove) {
      setLogs((arr) => arr.filter((l) => !(l.rule_id === rule.id && l.date === today)));
      await supabase.from("rule_logs").delete().eq("rule_id", rule.id).eq("date", today);
    } else {
      setLogs((arr) => [
        ...arr.filter((l) => !(l.rule_id === rule.id && l.date === today)),
        { rule_id: rule.id, date: today, followed },
      ]);
      const { error } = await supabase
        .from("rule_logs")
        .upsert(
          { home_id: homeId, rule_id: rule.id, date: today, followed, marked_by: currentUserId },
          { onConflict: "rule_id,date" },
        );
      if (error) {
        toast.error("No se pudo guardar");
        return;
      }
    }
    startTransition(() => router.refresh());
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", currentUserId)
      .single();
    const { error } = await supabase.from("rules").insert({
      home_id: profile!.home_id,
      text: text.trim(),
      created_by: currentUserId,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo crear");
      return;
    }
    setText("");
    setShowForm(false);
    toast.success("Regla agregada");
    startTransition(() => router.refresh());
  }

  async function removeRule(rule: Rule) {
    if (!confirm(`¿Quitar la regla "${rule.text}"?`)) return;
    setRules((arr) => arr.filter((r) => r.id !== rule.id));
    const supabase = createClient();
    // Soft-delete: marcar inactiva
    const { error } = await supabase.from("rules").update({ active: false }).eq("id", rule.id);
    if (error) {
      setRules((arr) => [...arr, rule]);
      toast.error("No se pudo quitar");
      return;
    }
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
          {showForm ? "Cerrar" : "Nueva regla"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={addRule}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-bg-main border border-line space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                autoFocus
                placeholder="Ej: Nada de celulares durante la cena"
                className="w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-line bg-bg-card px-5 py-2 text-sm">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !text.trim()}
                  className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Agregar regla"}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {rules.length === 0 ? (
        <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
            <Handshake className="w-8 h-8" strokeWidth={1.6} />
          </div>
          <p className="font-display text-2xl">Sin reglas todavía</p>
          <p className="text-ink-muted mt-2 leading-relaxed">
            Escriban juntos los acuerdos que quieren cumplir.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {rules.map((rule) => {
              const todayLog = logFor(rule.id, today);
              const s = streak(rule.id);
              return (
                <motion.li
                  key={rule.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="rounded-2xl bg-bg-card border border-line p-4 shadow-warm"
                >
                  <div className="flex items-start gap-3">
                    <p className="flex-1 min-w-0 font-medium leading-relaxed">{rule.text}</p>
                    <button
                      onClick={() => removeRule(rule)}
                      className="text-ink-muted hover:text-accent-primary shrink-0"
                      aria-label="Quitar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-muted">Hoy:</span>
                      <button
                        onClick={() => mark(rule, true)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border",
                          todayLog?.followed
                            ? "bg-accent-secondary text-bg-card border-accent-secondary"
                            : "bg-bg-main border-line text-ink-muted",
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Sí
                      </button>
                      <button
                        onClick={() => mark(rule, false)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border",
                          todayLog && !todayLog.followed
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-bg-main border-line text-ink-muted",
                        )}
                      >
                        <X className="w-3.5 h-3.5" />
                        No
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {s > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-accent-primary font-medium">
                          <Flame className="w-3.5 h-3.5" />
                          {s} {s === 1 ? "día" : "días"}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        {last7.map((d) => {
                          const log = logFor(rule.id, d);
                          return (
                            <span
                              key={d}
                              title={d}
                              className={cn(
                                "w-2.5 h-2.5 rounded-sm",
                                log == null
                                  ? "bg-bg-main border border-line"
                                  : log.followed
                                  ? "bg-accent-secondary"
                                  : "bg-red-300",
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
