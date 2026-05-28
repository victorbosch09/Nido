import { createClient } from "@/lib/supabase/server";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { KitchenClient } from "./kitchen-client";
import { MealPlanner } from "./meal-planner";

export default async function KitchenPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_id")
    .eq("id", user!.id)
    .single();
  const homeId = profile!.home_id as string;

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [{ data: recipes }, { data: pantryItems }, { data: meals }] = await Promise.all([
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
    supabase
      .from("meal_plans")
      .select("id, date, slot, recipe_id, title")
      .eq("home_id", homeId)
      .gte("date", weekStart)
      .lte("date", weekEnd),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cocina"
        subtitle="Plan semanal, recetas y cocción que descuenta del inventario."
      />
      <MealPlanner
        meals={meals ?? []}
        recipes={(recipes ?? []).map((r) => ({ id: r.id, title: r.title }))}
        weekStart={weekStart}
        currentUserId={user!.id}
      />
      <KitchenClient
        recipes={recipes ?? []}
        pantryItems={pantryItems ?? []}
        currentUserId={user!.id}
      />
    </div>
  );
}
