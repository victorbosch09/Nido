import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <div className="text-7xl mb-6 animate-pulse" aria-hidden>🪺</div>
        <h1 className="font-display text-5xl sm:text-6xl text-ink leading-tight">
          Bienvenidos a <span className="text-accent-primary">Nido</span>
        </h1>
        <p className="mt-6 text-lg text-ink-muted">
          Su hogar compartido, organizado con amor. Tareas, presupuesto, despensa y momentos juntos — todo en un solo lugar cálido.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="rounded-full bg-accent-primary text-bg-card font-medium px-8 py-3 shadow-warm hover:shadow-warm-lg transition-shadow"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-line bg-bg-card text-ink font-medium px-8 py-3 hover:bg-accent-soft/20 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-4 text-sm text-ink-muted">
          <Feature emoji="✅" label="Tareas justas" />
          <Feature emoji="💰" label="Presupuesto en pareja" />
          <Feature emoji="🛒" label="Lista inteligente" />
        </div>
      </div>
    </main>
  );
}

function Feature({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg-card p-4 shadow-warm">
      <div className="text-2xl mb-1">{emoji}</div>
      <div>{label}</div>
    </div>
  );
}
