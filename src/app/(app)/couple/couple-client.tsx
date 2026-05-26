"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  body: string;
  from_user: string;
  to_user: string | null;
  read_at: string | null;
  created_at: string;
};
type Member = { id: string; name: string; avatar_emoji: string };

export function CoupleClient({
  notes,
  members,
  partner,
  currentUserId,
}: {
  notes: Note[];
  members: Member[];
  partner: Member | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  // Marcar como leídas las notas recibidas (al abrir la pantalla)
  useEffect(() => {
    const unread = notes
      .filter((n) => n.to_user === currentUserId && !n.read_at)
      .map((n) => n.id);
    if (unread.length === 0) return;
    const supabase = createClient();
    supabase
      .from("love_notes")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread)
      .then(() => startTransition(() => router.refresh()));
  }, [notes, currentUserId, router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", user!.id)
      .single();
    const { error } = await supabase.from("love_notes").insert({
      home_id: profile!.home_id,
      body: body.trim(),
      from_user: currentUserId,
      to_user: partner?.id ?? null,
    });
    setSending(false);
    if (error) {
      toast.error("No se pudo enviar");
      return;
    }
    setBody("");
    toast.success("Nota enviada");
    startTransition(() => router.refresh());
  }

  async function remove(note: Note) {
    const supabase = createClient();
    const { error } = await supabase.from("love_notes").delete().eq("id", note.id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    toast({
      title: "Nota eliminada",
      action: {
        label: "Deshacer",
        onClick: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from("profiles")
            .select("home_id")
            .eq("id", user!.id)
            .single();
          await supabase.from("love_notes").insert({
            id: note.id,
            home_id: profile!.home_id,
            body: note.body,
            from_user: note.from_user,
            to_user: note.to_user,
            read_at: note.read_at,
          });
          startTransition(() => router.refresh());
        },
      },
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {/* Composer */}
      <form
        onSubmit={send}
        className="rounded-3xl border border-line bg-bg-card shadow-warm p-5"
      >
        <div className="flex items-center gap-2.5 mb-3 text-accent-primary">
          <Heart className="w-5 h-5" strokeWidth={1.8} />
          <p className="font-medium text-ink">
            {partner ? `Una nota para ${partner.name}` : "Una nota para tu pareja"}
          </p>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Pensé en vos cuando…"
          className="w-full rounded-2xl border border-line bg-bg-main px-4 py-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card font-medium px-5 py-2 text-sm shadow-warm disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>

      {/* Feed */}
      {notes.length === 0 ? (
        <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
            <Heart className="w-8 h-8" strokeWidth={1.6} />
          </div>
          <p className="font-display text-2xl">Aún no hay notas</p>
          <p className="text-ink-muted mt-2 leading-relaxed">
            Mandale la primera. Las cosas chiquitas se acumulan en grande.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {notes.map((n) => {
              const mine = n.from_user === currentUserId;
              const author = memberById[n.from_user];
              return (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.14 }}
                  className={cn(
                    "rounded-2xl border p-4 shadow-warm",
                    mine
                      ? "bg-accent-soft/20 border-accent-soft ml-6"
                      : "bg-bg-card border-line mr-6",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl leading-none shrink-0">
                        {author?.avatar_emoji ?? "·"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {mine ? "Vos" : author?.name ?? "Pareja"}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-ink-muted">
                          {new Date(n.created_at).toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {mine && n.read_at && " · leído"}
                        </p>
                      </div>
                    </div>
                    {mine && (
                      <button
                        onClick={() => remove(n)}
                        className="text-ink-muted hover:text-accent-primary shrink-0"
                        aria-label="Eliminar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
