import { createClient } from "@/lib/supabase/server";
import { startOfMonth, format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: { add?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_id")
    .eq("id", user!.id)
    .single();
  const homeId = profile!.home_id as string;

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [{ data: items }, { data: movements }] = await Promise.all([
    supabase
      .from("pantry_items")
      .select("id, name, category, unit, quantity, unit_cost, is_bulk, updated_at")
      .eq("home_id", homeId)
      .order("name", { ascending: true }),
    supabase
      .from("pantry_movements")
      .select("id, item_name, type, quantity, unit, unit_cost, total_cost, note, created_by, created_at")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  // Gastado en súper este mes (suma de compras del mes)
  const purchasesThisMonth = (movements ?? []).filter(
    (m) => m.type === "purchase" && m.created_at >= monthStart + "T00:00:00",
  );
  const spentThisMonth = purchasesThisMonth.reduce(
    (s, m) => s + Number(m.total_cost ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nevera y despensa"
        subtitle="Lo que tenés en casa, con su valor. Comprá, cociná, y mirá cuánto queda."
      />
      <InventoryClient
        items={items ?? []}
        movements={movements ?? []}
        currentUserId={user!.id}
        spentThisMonth={spentThisMonth}
        prefillName={searchParams?.add}
      />
    </div>
  );
}
