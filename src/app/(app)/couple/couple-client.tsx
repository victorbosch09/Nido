"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Send, X, Plus, MapPin, Calendar as CalIcon, Gift, ExternalLink, Check, Cake,
} from "lucide-react";
import { format, differenceInCalendarDays, setYear } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; avatar_emoji: string };
type Note = { id: string; body: string; from_user: string; to_user: string | null; read_at: string | null; created_at: string };
type Plan = { id: string; title: string; planned_at: string | null; location: string | null; notes: string | null; done: boolean; created_at: string };
type Wish = { id: string; title: string; description: string | null; url: string | null; granted: boolean; created_by: string | null; created_at: string };
type ImportantDate = { id: string; title: string; date: string; recurring_yearly: boolean; created_at: string };

type Tab = "notes" | "plans" | "wishes" | "dates";

export function CoupleClient({
  notes, plans, wishes, dates, members, partner, currentUserId,
}: {
  notes: Note[];
  plans: Plan[];
  wishes: Wish[];
  dates: ImportantDate[];
  members: Member[];
  partner: Member | null;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>("notes");

  const tabs: { value: Tab; label: string }[] = [
    { value: "notes", label: "Notas" },
    { value: "plans", label: "Planes" },
    { value: "wishes", label: "Deseos" },
    { value: "dates", label: "Fechas" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto pb-1">
        <div className="inline-flex rounded-full bg-bg-main border border-line p-1 gap-0.5">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap",
                tab === t.value ? "bg-accent-primary text-bg-card shadow-warm" : "text-ink-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "notes" && <NotesTab notes={notes} members={members} partner={partner} currentUserId={currentUserId} />}
      {tab === "plans" && <PlansTab plans={plans} currentUserId={currentUserId} />}
      {tab === "wishes" && <WishesTab wishes={wishes} members={members} currentUserId={currentUserId} />}
      {tab === "dates" && <DatesTab dates={dates} currentUserId={currentUserId} />}
    </div>
  );
}

/* ----------------------------- NOTES ----------------------------- */
function NotesTab({
  notes, members, partner, currentUserId,
}: { notes: Note[]; members: Member[]; partner: Member | null; currentUserId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  useEffect(() => {
    const unread = notes.filter((n) => n.to_user === currentUserId && !n.read_at).map((n) => n.id);
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
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", currentUserId).single();
    const { error } = await supabase.from("love_notes").insert({
      home_id: profile!.home_id, body: body.trim(), from_user: currentUserId, to_user: partner?.id ?? null,
    });
    setSending(false);
    if (error) { toast.error("No se pudo enviar"); return; }
    setBody("");
    toast.success("Nota enviada");
    startTransition(() => router.refresh());
  }

  async function remove(note: Note) {
    const supabase = createClient();
    const { error } = await supabase.from("love_notes").delete().eq("id", note.id);
    if (error) { toast.error("No se pudo eliminar"); return; }
    toast({ title: "Nota eliminada" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <form onSubmit={send} className="rounded-3xl border border-line bg-bg-card shadow-warm p-5">
        <div className="flex items-center gap-2.5 mb-3 text-accent-primary">
          <Heart className="w-5 h-5" strokeWidth={1.8} />
          <p className="font-medium text-ink">{partner ? `Una nota para ${partner.name}` : "Una nota para tu pareja"}</p>
        </div>
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)} rows={3}
          placeholder="Pensé en vos cuando…"
          className="w-full rounded-2xl border border-line bg-bg-main px-4 py-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
        <div className="flex justify-end mt-3">
          <button type="submit" disabled={sending || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card font-medium px-5 py-2 text-sm shadow-warm disabled:opacity-50">
            <Send className="w-4 h-4" />{sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <Empty icon={Heart} title="Aún no hay notas" text="Mandale la primera. Las cosas chiquitas se acumulan en grande." />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {notes.map((n) => {
              const mine = n.from_user === currentUserId;
              const author = memberById[n.from_user];
              return (
                <motion.li key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}
                  className={cn("rounded-2xl border p-4 shadow-warm", mine ? "bg-accent-soft/20 border-accent-soft ml-6" : "bg-bg-card border-line mr-6")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl leading-none shrink-0">{author?.avatar_emoji ?? "·"}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{mine ? "Vos" : author?.name ?? "Pareja"}</p>
                        <p className="text-[10px] uppercase tracking-wider text-ink-muted">
                          {new Date(n.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {mine && n.read_at && " · leído"}
                        </p>
                      </div>
                    </div>
                    {mine && <button onClick={() => remove(n)} className="text-ink-muted hover:text-accent-primary shrink-0" aria-label="Eliminar"><X className="w-4 h-4" /></button>}
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

/* ----------------------------- PLANS ----------------------------- */
function PlansTab({ plans, currentUserId }: { plans: Plan[]; currentUserId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", currentUserId).single();
    const { error } = await supabase.from("date_plans").insert({
      home_id: profile!.home_id, title: title.trim(),
      planned_at: when ? new Date(when).toISOString() : null,
      location: location.trim() || null, notes: notes.trim() || null, created_by: currentUserId,
    });
    setSaving(false);
    if (error) { toast.error("No se pudo crear"); return; }
    setTitle(""); setWhen(""); setLocation(""); setNotes(""); setShow(false);
    toast.success("Plan agregado");
    startTransition(() => router.refresh());
  }

  async function toggleDone(p: Plan) {
    const supabase = createClient();
    await supabase.from("date_plans").update({ done: !p.done }).eq("id", p.id);
    startTransition(() => router.refresh());
  }
  async function remove(p: Plan) {
    const supabase = createClient();
    await supabase.from("date_plans").delete().eq("id", p.id);
    toast({ title: "Plan eliminado" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card px-5 py-2 text-sm font-medium shadow-warm">
          <Plus className="w-4 h-4" />{show ? "Cerrar" : "Nuevo plan"}
        </button>
      </div>
      <AnimatePresence>
        {show && (
          <motion.form onSubmit={add} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="p-4 rounded-2xl bg-bg-main border border-line space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Ej: cena en el centro" required className="w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block"><span className="text-xs text-ink-muted">Cuándo</span>
                  <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" /></label>
                <label className="block"><span className="text-xs text-ink-muted">Lugar</span>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="opcional" className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" /></label>
              </div>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" className="w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShow(false)} className="rounded-full border border-line bg-bg-card px-5 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={saving || !title.trim()} className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50">{saving ? "Guardando…" : "Agregar"}</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {plans.length === 0 ? (
        <Empty icon={CalIcon} title="Sin planes todavía" text="Propongan la próxima salida o cita." />
      ) : (
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.id} className={cn("rounded-2xl bg-bg-card border border-line p-4 shadow-warm flex items-start gap-3", p.done && "opacity-60")}>
              <button onClick={() => toggleDone(p)} aria-label="Marcar hecho"
                className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5", p.done ? "bg-accent-secondary border-accent-secondary text-bg-card" : "border-line hover:border-accent-primary")}>
                {p.done && <Check className="w-4 h-4" strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium", p.done && "line-through")}>{p.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted flex-wrap">
                  {p.planned_at && <span className="inline-flex items-center gap-1"><CalIcon className="w-3 h-3" />{format(new Date(p.planned_at), "EEE d MMM, HH:mm", { locale: es })}</span>}
                  {p.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</span>}
                </div>
                {p.notes && <p className="text-xs text-ink-muted mt-1 leading-relaxed">{p.notes}</p>}
              </div>
              <button onClick={() => remove(p)} className="text-ink-muted hover:text-accent-primary shrink-0" aria-label="Eliminar"><X className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- WISHES ----------------------------- */
function WishesTab({ wishes, members, currentUserId }: { wishes: Wish[]; members: Member[]; currentUserId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", currentUserId).single();
    const { error } = await supabase.from("wishes").insert({
      home_id: profile!.home_id, title: title.trim(), description: description.trim() || null, url: url.trim() || null, created_by: currentUserId,
    });
    setSaving(false);
    if (error) { toast.error("No se pudo crear"); return; }
    setTitle(""); setDescription(""); setUrl(""); setShow(false);
    toast.success("Deseo agregado");
    startTransition(() => router.refresh());
  }
  async function toggleGranted(w: Wish) {
    const supabase = createClient();
    await supabase.from("wishes").update({ granted: !w.granted }).eq("id", w.id);
    if (!w.granted) toast.success("¡Cumplido! 🎉");
    startTransition(() => router.refresh());
  }
  async function remove(w: Wish) {
    const supabase = createClient();
    await supabase.from("wishes").delete().eq("id", w.id);
    toast({ title: "Deseo eliminado" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card px-5 py-2 text-sm font-medium shadow-warm">
          <Plus className="w-4 h-4" />{show ? "Cerrar" : "Nuevo deseo"}
        </button>
      </div>
      <AnimatePresence>
        {show && (
          <motion.form onSubmit={add} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="p-4 rounded-2xl bg-bg-main border border-line space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Ej: escapada a la montaña" required className="w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle (opcional)" className="w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (opcional)" inputMode="url" className="w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShow(false)} className="rounded-full border border-line bg-bg-card px-5 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={saving || !title.trim()} className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50">{saving ? "Guardando…" : "Agregar"}</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {wishes.length === 0 ? (
        <Empty icon={Gift} title="Wishlist vacía" text="Anoten lo que sueñan hacer o tener juntos." />
      ) : (
        <ul className="space-y-2">
          {wishes.map((w) => {
            const by = w.created_by ? memberById[w.created_by] : null;
            return (
              <li key={w.id} className={cn("rounded-2xl bg-bg-card border border-line p-4 shadow-warm flex items-start gap-3", w.granted && "opacity-60")}>
                <button onClick={() => toggleGranted(w)} aria-label="Marcar cumplido"
                  className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5", w.granted ? "bg-accent-secondary border-accent-secondary text-bg-card" : "border-line hover:border-accent-primary")}>
                  {w.granted ? <Check className="w-4 h-4" strokeWidth={3} /> : <Gift className="w-3.5 h-3.5 text-ink-muted" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium", w.granted && "line-through")}>{w.title}</p>
                  {w.description && <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{w.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted flex-wrap">
                    {by && <span>{by.avatar_emoji} {by.name}</span>}
                    {w.url && <a href={w.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-primary"><ExternalLink className="w-3 h-3" />ver</a>}
                  </div>
                </div>
                <button onClick={() => remove(w)} className="text-ink-muted hover:text-accent-primary shrink-0" aria-label="Eliminar"><X className="w-4 h-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- DATES ----------------------------- */
function nextOccurrence(dateStr: string, yearly: boolean): Date {
  const d = new Date(dateStr + "T00:00:00");
  if (!yearly) return d;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = setYear(d, today.getFullYear());
  if (next < today) next = setYear(d, today.getFullYear() + 1);
  return next;
}

function DatesTab({ dates, currentUserId }: { dates: ImportantDate[]; currentUserId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [yearly, setYearly] = useState(true);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => [...dates].sort((a, b) => nextOccurrence(a.date, a.recurring_yearly).getTime() - nextOccurrence(b.date, b.recurring_yearly).getTime()),
    [dates],
  );

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", currentUserId).single();
    const { error } = await supabase.from("important_dates").insert({
      home_id: profile!.home_id, title: title.trim(), date, recurring_yearly: yearly, created_by: currentUserId,
    });
    setSaving(false);
    if (error) { toast.error("No se pudo crear"); return; }
    setTitle(""); setDate(""); setShow(false);
    toast.success("Fecha agregada");
    startTransition(() => router.refresh());
  }
  async function remove(d: ImportantDate) {
    const supabase = createClient();
    await supabase.from("important_dates").delete().eq("id", d.id);
    toast({ title: "Fecha eliminada" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card px-5 py-2 text-sm font-medium shadow-warm">
          <Plus className="w-4 h-4" />{show ? "Cerrar" : "Nueva fecha"}
        </button>
      </div>
      <AnimatePresence>
        {show && (
          <motion.form onSubmit={add} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="p-4 rounded-2xl bg-bg-main border border-line space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Ej: nuestro aniversario" required className="w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" />
              <label className="block"><span className="text-xs text-ink-muted">Fecha</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1 w-full rounded-xl border border-line bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40" /></label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} />
                <span>Se repite cada año</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShow(false)} className="rounded-full border border-line bg-bg-card px-5 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={saving || !title.trim() || !date} className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50">{saving ? "Guardando…" : "Agregar"}</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {sorted.length === 0 ? (
        <Empty icon={Cake} title="Sin fechas todavía" text="Aniversarios, cumpleaños, el día que se conocieron…" />
      ) : (
        <ul className="space-y-2">
          {sorted.map((d) => {
            const next = nextOccurrence(d.date, d.recurring_yearly);
            const days = differenceInCalendarDays(next, new Date());
            const isToday = days === 0;
            return (
              <li key={d.id} className="rounded-2xl bg-bg-card border border-line p-4 shadow-warm flex items-center gap-3">
                <span className={cn("w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0", isToday ? "bg-accent-primary text-bg-card" : "bg-accent-soft/30 text-accent-primary")}>
                  <span className="text-lg font-display leading-none">{format(next, "d")}</span>
                  <span className="text-[9px] uppercase">{format(next, "MMM", { locale: es })}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{d.title}</p>
                  <p className="text-xs text-ink-muted">
                    {isToday ? "¡Es hoy!" : days === 1 ? "Mañana" : `En ${days} días`}
                    {d.recurring_yearly && " · cada año"}
                  </p>
                </div>
                <button onClick={() => remove(d)} className="text-ink-muted hover:text-accent-primary shrink-0" aria-label="Eliminar"><X className="w-4 h-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Empty({ icon: Icon, title, text }: { icon: typeof Heart; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
      <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
        <Icon className="w-8 h-8" strokeWidth={1.6} />
      </div>
      <p className="font-display text-2xl">{title}</p>
      <p className="text-ink-muted mt-2 leading-relaxed">{text}</p>
    </div>
  );
}
