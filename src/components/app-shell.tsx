"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings as SettingsIcon, MoreHorizontal, X, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NestLogo } from "@/components/logo";
import { SECTION_ICON } from "@/lib/icons";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Hogar", icon: SECTION_ICON.dashboard },
  { href: "/tasks", label: "Tareas", icon: SECTION_ICON.tasks },
  { href: "/budget", label: "Presupuesto", icon: SECTION_ICON.budget },
  { href: "/groceries", label: "Despensa", icon: SECTION_ICON.groceries },
];

const SECONDARY: NavItem[] = [
  { href: "/kitchen", label: "Cocina", icon: SECTION_ICON.kitchen },
  { href: "/pending", label: "Pendientes", icon: SECTION_ICON.pending },
  { href: "/couple", label: "Pareja", icon: SECTION_ICON.couple },
  { href: "/me", label: "Yo", icon: SECTION_ICON.me },
];

const NAV = [...PRIMARY, ...SECONDARY];

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: { name: string; avatar_emoji: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const moreActive = SECONDARY.some(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
  );

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-line bg-bg-card/60 backdrop-blur sticky top-0 h-screen">
        <Link href="/dashboard" prefetch className="px-6 py-6 flex items-center gap-2.5 text-accent-primary">
          <NestLogo size={30} />
          <span className="font-display text-2xl text-ink">Nido</span>
        </Link>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl",
                  active
                    ? "bg-accent-primary text-bg-card shadow-warm"
                    : "text-ink hover:bg-accent-soft/20",
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-line">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl leading-none">{profile.avatar_emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.name}</p>
              <Link
                href="/settings"
                prefetch
                className="text-xs text-ink-muted hover:text-accent-primary"
              >
                Ajustes
              </Link>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 text-sm rounded-lg border border-line py-2 text-ink-muted hover:bg-accent-soft/20"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-0">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-10"
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-card/95 backdrop-blur border-t border-line">
        <div className="grid grid-cols-5 px-2 py-2">
          {PRIMARY.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex flex-col items-center gap-1 py-1 rounded-xl text-[10px] font-medium",
                  active ? "text-accent-primary" : "text-ink-muted",
                )}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 py-1 rounded-xl text-[10px] font-medium",
              moreActive ? "text-accent-primary" : "text-ink-muted",
            )}
            aria-label="Más secciones"
          >
            <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={moreActive ? 2.2 : 1.8} />
            <span>Más</span>
          </button>
        </div>
      </nav>

      {/* More drawer (mobile) */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMoreOpen(false)}
              className="md:hidden fixed inset-0 bg-black/40 z-40"
              aria-label="Cerrar"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-bg-card border-t border-line rounded-t-3xl shadow-warm-lg pb-safe"
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="w-10 h-1 rounded-full bg-line" />
              </div>
              <div className="px-5 pt-2 pb-3 flex items-center justify-between">
                <p className="font-display text-2xl">Más</p>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="text-ink-muted"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-3 pb-2 grid grid-cols-2 gap-2">
                {SECONDARY.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border",
                        active
                          ? "bg-accent-primary text-bg-card border-accent-primary"
                          : "bg-bg-main border-line text-ink",
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="px-3 py-3 border-t border-line space-y-2">
                <Link
                  href="/settings"
                  prefetch
                  onClick={() => setMoreOpen(false)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-main border border-line text-ink"
                >
                  <SettingsIcon className="w-5 h-5 shrink-0" strokeWidth={1.8} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Ajustes</p>
                    <p className="text-xs text-ink-muted truncate">{profile.name}</p>
                  </div>
                </Link>
                <button
                  onClick={async () => {
                    setMoreOpen(false);
                    await handleSignOut();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm text-ink-muted"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
