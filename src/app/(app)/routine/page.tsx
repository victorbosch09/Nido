import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { RoutineClient } from "./routine-client";

export default async function RoutinePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_id")
    .eq("id", user!.id)
    .single();
  const homeId = profile!.home_id as string;

  const today = format(new Date(), "yyyy-MM-dd");

  const [{ data: chores }, { data: members }, { data: todayLogs }] = await Promise.all([
    supabase
      .from("chore_schedule")
      .select("id, title, category, day_of_week, assigned_to")
      .eq("home_id", homeId)
      .order("day_of_week", { ascending: true }),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId),
    supabase
      .from("chore_logs")
      .select("chore_id, completed_by, completed_at")
      .eq("home_id", homeId)
      .eq("date", today),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rutina semanal"
        subtitle="Tareas fijas por día. Cada uno marca lo suyo cuando lo hace."
      />
      <RoutineClient
        chores={chores ?? []}
        members={members ?? []}
        todayLogs={todayLogs ?? []}
        currentUserId={user!.id}
        todayDow={new Date().getDay()}
      />
    </div>
  );
}
