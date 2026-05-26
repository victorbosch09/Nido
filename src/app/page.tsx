import Link from "next/link";
import { ListTodo, Wallet, ShoppingCart, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NestLogo } from "@/components/logo";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <div className="flex justify-center mb-8 text-accent-primary">
          <NestLogo size={88} strokeWidth={1.6} />
        </div>
        <h1 className="font-display text-5xl sm:text-6xl text-ink">
          Bienvenidos a <span className="text-accent-primary">Nido</span>
        </h1>
        <p className="mt-6 text-lg text-ink-muted leading-relaxed">
          Su hogar compartido, organizado con amor. Tareas, presupuesto, despensa y momentos juntos — todo en un solo lugar cálido.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            prefetch
            className="rounded-full bg-accent-primary text-bg-card font-medium px-8 py-3 shadow-warm hover:shadow-warm-lg"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            prefetch
            className="rounded-full border border-line bg-bg-card text-ink font-medium px-8 py-3 hover:bg-accent-soft/20"
          >
            Iniciar sesión
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-4 text-sm text-ink-muted">
          <Feature icon={ListTodo} label="Tareas justas" />
          <Feature icon={Wallet} label="Presupuesto en pareja" />
          <Feature icon={ShoppingCart} label="Lista inteligente" />
        </div>
      </div>
    </main>
  );
}

function Feature({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg-card p-4 shadow-warm">
      <Icon className="w-6 h-6 mx-auto mb-2 text-accent-primary" strokeWidth={1.8} />
      <div>{label}</div>
    </div>
  );
}
