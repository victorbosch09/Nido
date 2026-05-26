import { createClient } from "@/lib/supabase/server";
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
    .select("id, title, prep_minutes, servings, ingredients, steps, tags, created_at")
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Cocina</h1>
        <p className="text-ink-muted mt-1 leading-relaxed">
          Recetas favoritas — los platos que valen la pena recordar.
        </p>
      </header>
      <KitchenClient recipes={recipes ?? []} />
    </div>
  );
}
