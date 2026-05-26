import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TaskList } from "./task-list";

export default async function TasksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user!.id).single();
  const homeId = profile!.home_id as string;

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, category, priority, status, due_date, recurrence, assigned_to, completed_at")
      .eq("home_id", homeId)
      .order("status")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId),
  ]);

  // Métrica de equidad: % de tareas completadas en el mes por mí.
  const myId = user!.id;
  const completed = (tasks ?? []).filter((t) => t.status === "done");
  const mine = completed.filter((t) => t.assigned_to === myId).length;
  const total = completed.length;
  const myPct = total > 0 ? Math.round((mine / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Tareas del hogar</h1>
          <p className="text-ink-muted mt-1">Distribución y rutina compartida.</p>
        </div>
        <Link
          href="/tasks/new"
          prefetch
          className="rounded-full bg-accent-primary text-bg-card font-medium px-5 py-2.5 shadow-warm hover:shadow-warm-lg"
        >
          + Nueva
        </Link>
      </header>

      <div className="rounded-3xl border border-line bg-bg-card p-5 shadow-warm">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Balance del mes</p>
        <p className="font-display text-3xl mt-1">
          {total === 0 ? "Sin completadas todavía" : `Has hecho el ${myPct}%`}
        </p>
        <div className="mt-3 h-2 rounded-full bg-bg-main overflow-hidden flex">
          <div className="h-full bg-accent-secondary" style={{ width: `${myPct}%` }} />
          <div className="h-full bg-accent-soft" style={{ width: `${100 - myPct}%` }} />
        </div>
      </div>

      <TaskList tasks={tasks ?? []} members={members ?? []} currentUserId={myId} />
    </div>
  );
}
