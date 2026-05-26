"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "nido:theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#1E1610" : "#FDF6EE");
}

export function ThemeScript() {
  // Runs before paint via dangerouslySetInnerHTML to avoid FOUC
  const code = `
    (function(){try{
      var t = localStorage.getItem('${STORAGE_KEY}') || 'system';
      var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) document.documentElement.classList.add('dark');
    }catch(e){}})();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setTheme(stored);
    applyTheme(stored);

    if (stored === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme("system");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, []);

  function pick(t: Theme) {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }

  const opts: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "system", label: "Auto", icon: Monitor },
    { value: "dark", label: "Oscuro", icon: Moon },
  ];

  return (
    <div className="inline-flex rounded-full bg-bg-main border border-line p-1 gap-0.5">
      {opts.map((o) => {
        const active = theme === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            onClick={() => pick(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full",
              active ? "bg-accent-primary text-bg-card shadow-warm" : "text-ink-muted",
            )}
            aria-pressed={active}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
