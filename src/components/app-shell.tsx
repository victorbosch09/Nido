"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; emoji: string };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Hogar", emoji: "🏠" },
  { href: "/tasks", label: "Tareas", emoji: "✅" },
  { href: "/budget", label: "Presupuesto", emoji: "💰" },
  { href: "/groceries", label: "Despensa", emoji: "🛒" },
  { href: "/kitchen", label: "Cocina", emoji: "🍳" },
  { href: "/pending", label: "Pendientes", emoji: "🔧" },
  { href: "/couple", label: "Pareja", emoji: "💑" },
  { href: "/me", label: "Yo", emoji: "👤" },
];

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: { name: string; avatar_emoji: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-line bg-bg-card/60 backdrop-blur sticky top-0 h-screen">
        <div className="px-6 py-6 flex items-center gap-2">
          <span className="text-3xl">🪺</span>
          <span className="font-display text-2xl text-ink">Nido</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition",
                  active
                    ? "bg-accent-primary text-bg-card shadow-warm"
                    : "text-ink hover:bg-accent-soft/20",
                )}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-line">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{profile.avatar_emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.name}</p>
              <Link href="/settings" className="text-xs text-ink-muted hover:text-accent-primary">
                Ajustes
              </Link>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-sm rounded-lg border border-line py-2 text-ink-muted hover:bg-accent-soft/20"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-0">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-10"
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-card/95 backdrop-blur border-t border-line">
        <div className="grid grid-cols-5 px-2 py-2">
          {NAV.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 rounded-xl text-[10px] font-medium",
                  active ? "text-accent-primary" : "text-ink-muted",
                )}
              >
                <span className="text-xl">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
