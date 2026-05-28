import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { format, differenceInCalendarDays, setYear, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { ListTodo, Wrench, Heart, Cake, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type Ev = {
  key: string;
  date: Date;
  title: string;
  kind: "task" | "todo" | "plan" | "date";
  href: string;
};

const KIND_META = {
  task: { icon: ListTodo, label: "Tarea", color: "var(--accent-primary)" },
  todo: { icon: Wrench, label: "Pendiente", color: "#8A7A6A" },
  plan: { icon: Heart, label: "Plan", color: "#C96A3B" },
  date: { icon: Cake, label: "Fecha", color: "#8B5CA6" },
} as const;

function nextOccurrence(dateStr: string, yearly: boolean): Date {
  const d = new Date(dateStr + "T00:00:00");
  if (!yearly) return d;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = setYear(d, today.getFullYear());
  if (next < today) next = setYear(d, today.getFullYear() + 1);
  return next;
}

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user!.id).single();
  const homeId = profile!.home_id as string;

  const [{ data: tasks }, { data: todos }, { data: plans }, { data: dates }] = await Promise.all([
    supabase.from("tasks").select("id, title, due_date, status").eq("home_id", homeId).eq("status", "pending").not("due_date", "is", null),
    supabase.from("todos").select("id, title, due_date, status").eq("home_id", homeId).neq("status", "done").not("due_date", "is", null),
    supabase.from("date_plans").select("id, title, planned_at, done").eq("home_id", homeId).eq("done", false).not("planned_at", "is", null),
    supabase.from("important_dates").select("id, title, date, recurring_yearly").eq("home_id", homeId),
  ]);

  const events: Ev[] = [];
  for (const t of tasks ?? []) {
    const d = parseISO(t.due_date as string);
    if (isValid(d)) events.push({ key: `task-${t.id}`, date: d, title: t.title, kind: "task", href: "/tasks" });
  }
  for (const t of todos ?? []) {
    const d = parseISO(t.due_date as string);
    if (isValid(d)) events.push({ key: `todo-${t.id}`, date: d, title: t.title, kind: "todo", href: "/pending" });
  }
  for (const p of plans ?? []) {
    const d = new Date(p.planned_at as string);
    if (isValid(d)) events.push({ key: `plan-${p.id}`, date: d, title: p.title, kind: "plan", href: "/couple" });
  }
  for (const dt of dates ?? []) {
    const d = nextOccurrence(dt.date as string, dt.recurring_yearly as boolean);
    events.push({ key: `date-${dt.id}`, date: d, title: dt.title, kind: "date", href: "/couple" });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = events.filter((e) => differenceInCalendarDays(e.date, today) < 0 && (e.kind === "task" || e.kind === "todo" || e.kind === "plan"));
  const upcoming = events.filter((e) => differenceInCalendarDays(e.date, today) >= 0);

  // Agrupar upcoming por fecha
  const groups = new Map<string, Ev[]>();
  for (const e of upcoming) {
    const key = format(e.date, "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario" subtitle="Todo lo que tiene fecha, en un solo lugar." />

      {events.length === 0 && (
        <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
            <CalendarDays className="w-8 h-8" strokeWidth={1.6} />
          </div>
          <p className="font-display text-2xl">Agenda despejada</p>
          <p className="text-ink-muted mt-2 leading-relaxed">
            Las tareas con fecha, pendientes, planes y aniversarios aparecen acá.
          </p>
        </div>
      )}

      {overdue.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-wider text-red-700 mb-2">Atrasado</p>
          <ul className="space-y-2">
            {overdue.map((e) => <EventRow key={e.key} ev={e} overdue />)}
          </ul>
        </section>
      )}

      {Array.from(groups.entries()).map(([key, evs]) => {
        const d = parseISO(key);
        const days = differenceInCalendarDays(d, today);
        const rel = days === 0 ? "Hoy" : days === 1 ? "Mañana" : `En ${days} días`;
        return (
          <section key={key}>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-ink-muted capitalize">
                {format(d, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <span className="text-[10px] text-accent-primary">{rel}</span>
            </div>
            <ul className="space-y-2">
              {evs.map((e) => <EventRow key={e.key} ev={e} />)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function EventRow({ ev, overdue }: { ev: Ev; overdue?: boolean }) {
  const meta = KIND_META[ev.kind];
  const Icon = meta.icon;
  return (
    <li>
      <Link
        href={ev.href}
        prefetch
        className="flex items-center gap-3 rounded-2xl bg-bg-card border border-line p-3 shadow-warm hover:shadow-warm-lg"
      >
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: meta.color + "22", color: meta.color }}
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{ev.title}</p>
          <p className="text-xs text-ink-muted">
            {meta.label}
            {ev.kind === "plan" && ` · ${format(ev.date, "HH:mm")}`}
          </p>
        </div>
        {overdue && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">vencido</span>}
      </Link>
    </li>
  );
}
