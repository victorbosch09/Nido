import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { TaskList } from "./task-list";
import { startOfMonth, format } from "date-fns";

export default async function TasksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user!.id).single();
  const homeId = profile!.home_id as string;

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, category, priority, status, due_date, recurrence, assigned_to, completed_at, completed_by")
      .eq("home_id", homeId)
      .order("status")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId),
  ]);

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const myId = user!.id;

  // Equidad del mes: por cada miembro, cuántas tareas COMPLETÓ este mes
  // (se cuenta a quien la marcó hecha, no a quien estaba asignada).
  const completedThisMonth = (tasks ?? []).filter(
    (t) => t.completed_at && t.completed_at.slice(0, 10) >= monthStart,
  );
  const totalDone = completedThisMonth.length;
  const perMember = (members ?? []).map((m) => {
    const count = completedThisMonth.filter((t) => t.completed_by === m.id).length;
    const pct = totalDone > 0 ? Math.round((count / totalDone) * 100) : 0;
    return { ...m, count, pct };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tareas del hogar"
        subtitle="Distribución y rutina compartida."
        right={
          <Link
            href="/tasks/new"
            prefetch
            className="rounded-full bg-accent-primary text-bg-card font-medium px-5 py-2.5 shadow-warm hover:shadow-warm-lg whitespace-nowrap"
          >
            + Nueva
          </Link>
        }
      />

      <div className="rounded-3xl border border-line bg-bg-card p-5 shadow-warm">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Equidad del mes</p>
        {totalDone === 0 ? (
          <p className="font-display text-2xl mt-1">Sin completadas todavía</p>
        ) : (
          <>
            <p className="font-display text-2xl mt-1">
              {totalDone} {totalDone === 1 ? "tarea completada" : "tareas completadas"}
            </p>
            <div className="mt-3 h-2.5 rounded-full bg-bg-main overflow-hidden flex">
              {perMember.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.id === myId ? "bg-accent-primary" : "bg-accent-secondary"
                  }
                  style={{ width: `${m.pct}%` }}
                  title={`${m.name}: ${m.count} (${m.pct}%)`}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 flex-wrap text-sm">
              {perMember.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="text-lg leading-none">{m.avatar_emoji}</span>
                  <span className="text-ink-muted">
                    {m.id === myId ? "Vos" : m.name}
                  </span>
                  <span className="font-mono">
                    {m.count}
                    <span className="text-ink-muted">·{m.pct}%</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <TaskList tasks={tasks ?? []} members={members ?? []} currentUserId={myId} homeId={homeId} />
    </div>
  );
}
