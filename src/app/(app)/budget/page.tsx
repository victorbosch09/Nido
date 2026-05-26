import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, format, addMonths, subMonths, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { BudgetClient } from "./budget-client";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user!.id).single();
  const homeId = profile!.home_id as string;

  // Parse ?month=YYYY-MM (default current)
  let monthDate = new Date();
  if (searchParams?.month) {
    const parsed = parse(searchParams.month, "yyyy-MM", new Date());
    if (isValid(parsed)) monthDate = parsed;
  }

  const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const monthKey = format(monthDate, "yyyy-MM");
  const prevMonthKey = format(subMonths(monthDate, 1), "yyyy-MM");
  const nextMonthKey = format(addMonths(monthDate, 1), "yyyy-MM");
  const monthLabel = format(monthDate, "MMMM yyyy", { locale: es });

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

  return (
    <div className="space-y-6">
      <PageHeader title="Presupuesto" subtitle={monthLabel} />
      <BudgetClient
        expenses={expenses ?? []}
        budgets={budgets ?? []}
        members={members ?? []}
        currentUserId={user!.id}
        monthKey={monthKey}
        prevMonthKey={prevMonthKey}
        nextMonthKey={nextMonthKey}
      />
    </div>
  );
}
