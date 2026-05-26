import { createClient } from "@/lib/supabase/server";
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

  const [{ data: notes }, { data: members }] = await Promise.all([
    supabase
      .from("love_notes")
      .select("id, body, from_user, to_user, read_at, created_at")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId),
  ]);

  const partner = (members ?? []).find((m) => m.id !== user!.id) ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Tiempo en pareja</h1>
        <p className="text-ink-muted mt-1 leading-relaxed">
          Notas para tu pareja — pequeñas chispas en su día.
        </p>
      </header>
      <CoupleClient
        notes={notes ?? []}
        members={members ?? []}
        partner={partner}
        currentUserId={user!.id}
      />
    </div>
  );
}
