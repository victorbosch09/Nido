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

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title, prep_minutes, servings, ingredients, steps, tags, created_at, last_cooked_at")
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cocina"
        subtitle="Recetas favoritas — los platos que valen la pena recordar."
      />
      <KitchenClient recipes={recipes ?? []} />
    </div>
  );
}
