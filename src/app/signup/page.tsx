"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AVATARS = ["🌿", "🌸", "🌻", "🦊", "🐝", "🪴", "☕", "🍯", "🌙", "⭐", "🐢", "🦔"];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🌿");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, avatar_emoji: avatar } },
    });
    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Revisá tu email para confirmar la cuenta.");
      setLoading(false);
      return;
    }

    // Crear perfil
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: data.user.id,
      name,
      avatar_emoji: avatar,
    });
    if (profileErr && profileErr.code !== "23505") {
      setError(profileErr.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding/home");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl bg-bg-card border border-line shadow-warm p-8">
        <Link href="/" className="text-sm text-ink-muted hover:text-accent-primary">← Volver</Link>
        <h1 className="font-display text-4xl mt-4">Crear tu cuenta</h1>
        <p className="text-ink-muted mt-2 leading-relaxed">El primer paso para construir su nido.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Tu nombre" value={name} onChange={setName} required />

          <div>
            <span className="text-sm text-ink-muted">Elegí tu avatar</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-2xl w-11 h-11 rounded-full border transition ${
                    avatar === a
                      ? "border-accent-primary bg-accent-soft/30 scale-110"
                      : "border-line bg-bg-main hover:bg-accent-soft/20"
                  }`}
                  aria-label={`Avatar ${a}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Contraseña (mín. 6)" type="password" value={password} onChange={setPassword} required />

          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent-primary text-bg-card font-medium py-3 shadow-warm hover:shadow-warm-lg transition disabled:opacity-50"
          >
            {loading ? "Creando…" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-muted text-center">
          ¿Ya tenés cuenta? <Link href="/login" className="text-accent-primary font-medium">Iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label, type = "text", value, onChange, required,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
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
