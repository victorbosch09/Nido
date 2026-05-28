import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KitchenClient } from "./kitchen-client";

export default async function KitchenPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_id")
    .eq("id", user!.id)
    .single();
  const homeId = profile!.home_id as string;

  const [{ data: recipes }, { data: pantryItems }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, title, prep_minutes, servings, ingredients, steps, tags, created_at, last_cooked_at")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("pantry_items")
      .select("id, name, unit, quantity, unit_cost, is_bulk")
      .eq("home_id", homeId)
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cocina"
        subtitle="Recetas y cocción — registrá lo que cocinás y descontá del inventario."
      />
      <KitchenClient
        recipes={recipes ?? []}
        pantryItems={pantryItems ?? []}
        currentUserId={user!.id}
      />
    </div>
  );
}
