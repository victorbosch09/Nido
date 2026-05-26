import { createClient } from "@/lib/supabase/server";
import { GroceriesClient } from "./groceries-client";

export default async function GroceriesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_id")
    .eq("id", user!.id)
    .single();
  const homeId = profile!.home_id as string;

  const [{ data: items }, { data: members }] = await Promise.all([
    supabase
      .from("grocery_items")
      .select("id, name, qty, unit, category, is_done, notes, added_by, added_at, done_by, done_at")
      .eq("home_id", homeId)
      .order("is_done", { ascending: true })
      .order("added_at", { ascending: false }),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Despensa</h1>
        <p className="text-ink-muted mt-1 leading-relaxed">
          Lista compartida — agregá y marcá en tiempo real.
        </p>
      </header>
      <GroceriesClient
        items={items ?? []}
        members={members ?? []}
        currentUserId={user!.id}
      />
    </div>
  );
}
