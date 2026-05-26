"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function SettingsClient({
  currentUserId,
  email,
  name: initialName,
  avatarEmoji: initialAvatar,
  homeName,
  inviteCode,
}: {
  currentUserId: string;
  email: string;
  name: string;
  avatarEmoji: string;
  homeName: string;
  inviteCode: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), avatar_emoji: avatar })
      .eq("id", currentUserId);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success("Perfil actualizado");
    setEditing(false);
    startTransition(() => router.refresh());
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Código copiado");
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <section className="rounded-3xl border border-line bg-bg-card shadow-warm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Tu perfil</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-main px-4 py-1.5 text-xs text-ink-muted"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
        </div>

        {!editing ? (
          <div className="flex items-center gap-4">
            <span className="text-5xl leading-none">{avatar}</span>
            <div>
              <p className="font-medium text-lg">{name}</p>
              <p className="text-sm text-ink-muted">{email}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-ink-muted">Nombre</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg-main px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              />
            </label>
            <div>
              <p className="text-xs text-ink-muted mb-2">Avatar</p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                {AVATARS.map((a) => (
                  <button
                    type="button"
                    key={a.emoji}
                    onClick={() => setAvatar(a.emoji)}
                    aria-label={a.label}
                    className={cn(
                      "text-2xl w-11 h-11 rounded-full border leading-none",
                      avatar === a.emoji
                        ? "border-accent-primary bg-accent-soft/30 scale-110"
                        : "border-line bg-bg-main hover:bg-accent-soft/20",
                    )}
                  >
                    {a.emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setName(initialName);
                  setAvatar(initialAvatar);
                  setEditing(false);
                }}
                className="rounded-full border border-line bg-bg-main px-5 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !name.trim()}
                className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Home */}
      <section className="rounded-3xl border border-line bg-bg-card shadow-warm p-6">
        <h2 className="font-display text-2xl mb-2">{homeName}</h2>
        <p className="text-sm text-ink-muted">Código de invitación para tu pareja:</p>
        <div className="mt-3 flex items-center gap-3">
          <p className="font-mono text-3xl tracking-widest text-accent-primary">{inviteCode}</p>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-main px-3 py-1.5 text-xs text-ink-muted"
            aria-label="Copiar código"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-3xl border border-line bg-bg-card shadow-warm p-6">
        <h2 className="font-display text-2xl mb-2">Apariencia</h2>
        <p className="text-sm text-ink-muted mb-4">
          Auto sigue las preferencias del sistema.
        </p>
        <ThemeToggle />
      </section>
    </div>
  );
}
