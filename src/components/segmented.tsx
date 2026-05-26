"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full bg-bg-main border border-line p-1 gap-0.5 relative",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="relative px-4 py-1.5 text-sm font-medium rounded-full"
          >
            {active && (
              <motion.span
                layoutId="segmented-active"
                className="absolute inset-0 rounded-full bg-accent-primary shadow-warm"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            )}
            <span
              className={cn(
                "relative z-10",
                active ? "text-bg-card" : "text-ink-muted",
              )}
            >
              {o.label}
              {o.count != null && (
                <span className={cn("ml-1.5 font-mono text-xs", active ? "opacity-80" : "opacity-60")}>
                  {o.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
