import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { RealtimeSync } from "@/components/realtime-sync";

const REALTIME_TABLES = [
  "tasks",
  "expenses",
  "budgets",
  "grocery_items",
  "love_notes",
  "todos",
  "recipes",
  "moods",
  "pantry_items",
  "pantry_movements",
  "chore_schedule",
  "chore_logs",
  "rules",
  "rule_logs",
  "date_plans",
  "wishes",
  "important_dates",
  "settlements",
  "recurring_expenses",
  "meal_plans",
  "profiles",
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_emoji, home_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/signup");
  }

  if (!profile.home_id) {
    redirect("/onboarding/home");
  }

  return (
    <AppShell profile={{ name: profile.name, avatar_emoji: profile.avatar_emoji }}>
      <RealtimeSync homeId={profile.home_id} tables={REALTIME_TABLES} />
      {children}
    </AppShell>
  );
}
