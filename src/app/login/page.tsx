"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl bg-bg-card border border-line shadow-warm p-8">
        <Link href="/" className="text-sm text-ink-muted hover:text-accent-primary">← Volver</Link>
        <h1 className="font-display text-4xl mt-4">Bienvenidos de vuelta 🪺</h1>
        <p className="text-ink-muted mt-2">Iniciá sesión para entrar a tu nido.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Contraseña" type="password" value={password} onChange={setPassword} required />

          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent-primary text-bg-card font-medium py-3 shadow-warm hover:shadow-warm-lg transition disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-muted text-center">
          ¿Aún no tenés cuenta? <Link href="/signup" className="text-accent-primary font-medium">Crear una</Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label, type, value, onChange, required,
}: { label: string; type: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-xl border border-line bg-bg-main px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
      />
    </label>
  );
}
