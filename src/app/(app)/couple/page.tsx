import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CoupleClient } from "./couple-client";

export default async function CouplePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_id")
    .eq("id", user!.id)
    .single();
  const homeId = profile!.home_id as string;

  const [
    { data: notes },
    { data: plans },
    { data: wishes },
    { data: dates },
    { data: members },
  ] = await Promise.all([
    supabase
      .from("love_notes")
      .select("id, body, from_user, to_user, read_at, created_at")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("date_plans")
      .select("id, title, planned_at, location, notes, done, created_at")
      .eq("home_id", homeId)
      .order("planned_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("wishes")
      .select("id, title, description, url, granted, created_by, created_at")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("important_dates")
      .select("id, title, date, recurring_yearly, created_at")
      .eq("home_id", homeId)
      .order("date", { ascending: true }),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId),
  ]);

  const partner = (members ?? []).find((m) => m.id !== user!.id) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tiempo en pareja"
        subtitle="Notas, planes, deseos y las fechas que importan."
      />
      <CoupleClient
        notes={notes ?? []}
        plans={plans ?? []}
        wishes={wishes ?? []}
        dates={dates ?? []}
        members={members ?? []}
        partner={partner}
        currentUserId={user!.id}
      />
    </div>
  );
}
