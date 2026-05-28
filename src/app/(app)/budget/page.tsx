import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, format, addMonths, subMonths, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { BudgetClient } from "./budget-client";
import { SettlementCard } from "./settlement-card";
import { RecurringExpenses } from "./recurring-expenses";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user!.id).single();
  const homeId = profile!.home_id as string;

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

  const [
    { data: expenses },
    { data: budgets },
    { data: members },
    { data: sharedAll },
    { data: settlements },
    { data: recurring },
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount, category, paid_by, date, is_shared, notes, recurring_id")
      .eq("home_id", homeId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false }),
    supabase.from("budgets").select("category, monthly_limit").eq("home_id", homeId),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId),
    supabase.from("expenses").select("amount, paid_by").eq("home_id", homeId).eq("is_shared", true),
    supabase.from("settlements").select("from_user, to_user, amount").eq("home_id", homeId),
    supabase.from("recurring_expenses").select("id, title, amount, category, day_of_month, paid_by, is_shared").eq("home_id", homeId).eq("active", true).order("day_of_month", { ascending: true }),
  ]);

  const memberList = members ?? [];

  // Saldo entre la pareja (2 personas): net[m] = (paid - fairShare) + settlementsFrom - settlementsTo
  const numMembers = memberList.length || 1;
  const totalShared = (sharedAll ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const fairShare = totalShared / numMembers;
  const net: Record<string, number> = {};
  for (const m of memberList) net[m.id] = -fairShare;
  for (const e of sharedAll ?? []) if (e.paid_by) net[e.paid_by] = (net[e.paid_by] ?? -fairShare) + Number(e.amount);
  for (const s of settlements ?? []) {
    net[s.from_user] = (net[s.from_user] ?? 0) + Number(s.amount);
    net[s.to_user] = (net[s.to_user] ?? 0) - Number(s.amount);
  }

  // Determinar deudor/acreedor (solo si hay exactamente 2 miembros)
  let settlement: {
    even: boolean;
    amount: number;
    fromId?: string; fromName?: string;
    toId?: string; toName?: string;
  } = { even: true, amount: 0 };
  if (memberList.length === 2) {
    const [a, b] = memberList;
    const netA = net[a.id] ?? 0;
    if (Math.abs(netA) < 0.01) {
      settlement = { even: true, amount: 0 };
    } else if (netA > 0) {
      // a está a favor → b le debe a a
      settlement = { even: false, amount: netA, fromId: b.id, fromName: b.name, toId: a.id, toName: a.name };
    } else {
      settlement = { even: false, amount: -netA, fromId: a.id, fromName: a.name, toId: b.id, toName: b.name };
    }
  }

  // Gastos fijos: marcar cuáles ya se registraron este mes
  const materialized = new Set((expenses ?? []).map((e) => e.recurring_id).filter(Boolean) as string[]);
  const recurringWithStatus = (recurring ?? []).map((r) => ({
    ...r,
    registered: materialized.has(r.id),
  }));
  const recurringTotal = (recurring ?? []).reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Presupuesto" subtitle={monthLabel} />

      {memberList.length === 2 && (
        <SettlementCard
          settlement={settlement}
          currentUserId={user!.id}
          members={memberList}
        />
      )}

      <RecurringExpenses
        items={recurringWithStatus}
        total={recurringTotal}
        members={memberList}
        currentUserId={user!.id}
        monthKey={monthKey}
      />

      <BudgetClient
        expenses={expenses ?? []}
        budgets={budgets ?? []}
        members={memberList}
        currentUserId={user!.id}
        monthKey={monthKey}
        prevMonthKey={prevMonthKey}
        nextMonthKey={nextMonthKey}
      />
    </div>
  );
}
