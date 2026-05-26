import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { PendingClient } from "./pending-client";

export default async function PendingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_id")
    .eq("id", user!.id)
    .single();
  const homeId = profile!.home_id as string;

  const [{ data: todos }, { data: members }] = await Promise.all([
    supabase
      .from("todos")
      .select("id, title, description, status, urgency, assigned_to, created_by, created_at, completed_at, due_date")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendientes"
        subtitle="Trámites, arreglos y cosas one-shot. Movélas por su flujo."
      />
      <PendingClient
        todos={todos ?? []}
        members={members ?? []}
        currentUserId={user!.id}
      />
    </div>
  );
}
