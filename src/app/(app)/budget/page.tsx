import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { BudgetClient } from "./budget-client";

export default async function BudgetPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user!.id).single();
  const homeId = profile!.home_id as string;

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [{ data: expenses }, { data: budgets }, { data: members }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount, category, paid_by, date, is_shared, notes")
      .eq("home_id", homeId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false }),
    supabase.from("budgets").select("category, monthly_limit").eq("home_id", homeId),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId),
  ]);

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: es });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Presupuesto</h1>
        <p className="text-ink-muted mt-1 capitalize">{monthLabel}</p>
      </header>

      <BudgetClient
        expenses={expenses ?? []}
        budgets={budgets ?? []}
        members={members ?? []}
        currentUserId={user!.id}
      />
    </div>
  );
}
