"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

type Variant = "default" | "success" | "error";

type ToastInput = {
  id?: string;
  title: string;
  description?: string;
  variant?: Variant;
  action?: { label: string; onClick: () => void };
  duration?: number;
};

type Toast = ToastInput & { id: string; createdAt: number };

const EVENT_NAME = "nido:toast";

export function toast(input: ToastInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastInput>(EVENT_NAME, { detail: input }));
}

toast.success = (title: string, opts?: Partial<ToastInput>) =>
  toast({ title, variant: "success", ...opts });
toast.error = (title: string, opts?: Partial<ToastInput>) =>
  toast({ title, variant: "error", ...opts });

const VARIANT_STYLES: Record<Variant, { bg: string; icon: typeof Info; iconColor: string }> = {
  default: { bg: "bg-bg-card border-line", icon: Info, iconColor: "text-accent-primary" },
  success: { bg: "bg-bg-card border-line", icon: CheckCircle2, iconColor: "text-accent-secondary" },
  error: { bg: "bg-red-50 border-red-200", icon: AlertCircle, iconColor: "text-red-700" },
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<ToastInput>).detail;
      const id = detail.id ?? Math.random().toString(36).slice(2);
      const t: Toast = { ...detail, id, createdAt: Date.now() };
      setToasts((arr) => [...arr.slice(-2), t]); // keep at most 3
      const duration = detail.duration ?? 4500;
      window.setTimeout(() => {
        setToasts((arr) => arr.filter((x) => x.id !== id));
      }, duration);
    }
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  function dismiss(id: string) {
    setToasts((arr) => arr.filter((x) => x.id !== id));
  }

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none w-[calc(100%-2rem)] max-w-[400px]">
      <AnimatePresence>
        {toasts.map((t) => {
          const variant = VARIANT_STYLES[t.variant ?? "default"];
          const Icon = variant.icon;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto w-full rounded-2xl border shadow-warm-lg px-4 py-3 flex items-center gap-3 ${variant.bg}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${variant.iconColor}`} strokeWidth={1.8} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-ink-muted truncate">{t.description}</p>
                )}
              </div>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="text-sm font-medium text-accent-primary shrink-0"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(t.id)}
                className="text-ink-muted shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
