"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NestLogo } from "@/components/logo";

export default function OnboardingHome() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("Nuestro nido");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_home", { p_name: name });
    if (error || !data) {
      setError(error?.message ?? "No se pudo crear el nido");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleJoin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_home_by_code", { p_code: code });
    if (error || !data) {
      setError(error?.message ?? "Código inválido");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl bg-bg-card border border-line shadow-warm p-8">
        <div className="flex justify-center text-accent-primary">
          <NestLogo size={56} strokeWidth={1.6} />
        </div>
        <h1 className="font-display text-4xl text-center mt-4">Su nido</h1>
        <p className="text-center text-ink-muted mt-2">
          Creá un nuevo hogar o unite al de tu pareja con un código.
        </p>

        <div className="mt-6 flex rounded-full bg-bg-main border border-line p-1">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              mode === "create" ? "bg-accent-primary text-bg-card" : "text-ink-muted"
            }`}
          >
            Crear
          </button>
          <button
            onClick={() => setMode("join")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              mode === "join" ? "bg-accent-primary text-bg-card" : "text-ink-muted"
            }`}
          >
            Unirme
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {mode === "create" ? (
            <label className="block">
              <span className="text-sm text-ink-muted">Nombre del hogar</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-main px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm text-ink-muted">Código de invitación</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="mt-1 w-full rounded-xl border border-line bg-bg-main px-4 py-3 font-mono text-2xl tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              />
            </label>
          )}

          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <button
            onClick={mode === "create" ? handleCreate : handleJoin}
            disabled={loading || (mode === "join" && code.length !== 6)}
            className="w-full rounded-full bg-accent-primary text-bg-card font-medium py-3 shadow-warm hover:shadow-warm-lg transition disabled:opacity-50"
          >
            {loading ? "Procesando…" : mode === "create" ? "Crear nido" : "Unirme al nido"}
          </button>
        </div>
      </div>
    </main>
  );
}
