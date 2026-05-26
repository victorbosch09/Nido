import { createClient } from "@/lib/supabase/server";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { MeClient } from "./me-client";

export default async function MePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_id, name, avatar_emoji")
    .eq("id", user!.id)
    .single();
  const homeId = profile!.home_id as string;

  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const recentStart = format(subDays(new Date(), 13), "yyyy-MM-dd");

  const [
    { data: myMoodToday },
    { data: recentMoods },
    { count: myPendingCount },
    { data: monthDoneByMe, count: doneByMeCount },
    { data: myExpenses },
  ] = await Promise.all([
    supabase
      .from("moods")
      .select("score, notes")
      .eq("profile_id", user!.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("moods")
      .select("date, score")
      .eq("profile_id", user!.id)
      .gte("date", recentStart)
      .order("date", { ascending: true }),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("assigned_to", user!.id)
      .eq("status", "pending"),
    supabase
      .from("tasks")
      .select("id, completed_at", { count: "exact" })
      .eq("home_id", homeId)
      .eq("completed_by", user!.id)
      .gte("completed_at", monthStart + "T00:00:00")
      .lte("completed_at", monthEnd + "T23:59:59"),
    supabase
      .from("expenses")
      .select("amount, is_shared")
      .eq("home_id", homeId)
      .eq("paid_by", user!.id)
      .gte("date", monthStart)
      .lte("date", monthEnd),
  ]);

  const totalSpent = (myExpenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const personalSpent = (myExpenses ?? [])
    .filter((e) => !e.is_shared)
    .reduce((s, e) => s + Number(e.amount), 0);

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: es });

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <span className="text-4xl leading-none">{profile!.avatar_emoji}</span>
          <h1 className="font-display text-4xl">{profile!.name}</h1>
        </div>
        <p className="text-ink-muted mt-1 capitalize">{monthLabel}</p>
      </header>

      <MeClient
        homeId={homeId}
        currentUserId={user!.id}
        todayMood={myMoodToday ?? null}
        recentMoods={recentMoods ?? []}
        pendingCount={myPendingCount ?? 0}
        doneCount={doneByMeCount ?? 0}
        monthTotalSpent={totalSpent}
        monthPersonalSpent={personalSpent}
      />
    </div>
  );
}
