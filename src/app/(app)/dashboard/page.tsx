import Link from "next/link";
import {
  ListTodo, Wallet, ShoppingCart, Heart, Boxes, TrendingUp, CheckCircle2, Bell, Cake, type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NestLogo } from "@/components/logo";
import { dailyQuote, formatCurrency, greetingByTime } from "@/lib/utils";
import { startOfMonth, endOfMonth, format, getDate, getDaysInMonth, setYear, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";

function nextOccurrence(dateStr: string, yearly: boolean): Date {
  const d = new Date(dateStr + "T00:00:00");
  if (!yearly) return d;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = setYear(d, today.getFullYear());
  if (next < today) next = setYear(d, today.getFullYear() + 1);
  return next;
}

const CAT_LABEL: Record<string, string> = {
  groceries: "Mercado", home: "Hogar", personal_care: "Cuidado", eating_out: "Restaurantes",
  fun: "Diversión", health: "Salud", repairs: "Arreglos", other: "Otro",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_emoji, home_id, homes(name, invite_code)")
    .eq("id", user.id)
    .single();

  const homeId = profile!.home_id as string;
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [
    { data: todayTasks, count: pendingCount },
    { data: monthExpenses },
    { data: budgets },
    { data: partner },
    { data: pantry },
    { count: groceriesPending },
    { data: nextPlan },
    { count: doneThisMonth },
    { data: dashExtra1 },
    { count: overdueTodosCount },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, category, priority, status, assigned_to", { count: "exact" })
      .eq("home_id", homeId)
      .eq("status", "pending")
      .or(`due_date.is.null,due_date.lte.${today}`)
      .order("priority", { ascending: false })
      .limit(5),
    supabase.from("expenses").select("amount, category").eq("home_id", homeId).gte("date", monthStart).lte("date", monthEnd),
    supabase.from("budgets").select("category, monthly_limit").eq("home_id", homeId),
    supabase.from("profiles").select("id, name, avatar_emoji").eq("home_id", homeId).neq("id", user.id).maybeSingle(),
    supabase.from("pantry_items").select("quantity, unit_cost, is_bulk").eq("home_id", homeId),
    supabase.from("grocery_items").select("id", { count: "exact", head: true }).eq("home_id", homeId).eq("is_done", false),
    supabase.from("date_plans").select("title, planned_at").eq("home_id", homeId).eq("done", false).not("planned_at", "is", null).order("planned_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("home_id", homeId).eq("completed_by", user.id).gte("completed_at", monthStart + "T00:00:00").lte("completed_at", monthEnd + "T23:59:59"),
    supabase.from("important_dates").select("title, date, recurring_yearly").eq("home_id", homeId),
    supabase.from("todos").select("id", { count: "exact", head: true }).eq("home_id", homeId).neq("status", "done").not("due_date", "is", null).lt("due_date", today),
  ]);

  const importantDates = dashExtra1 ?? [];
  const overdueTodos = overdueTodosCount ?? 0;

  const totalSpent = (monthExpenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget = (budgets ?? []).reduce((s, b) => s + Number(b.monthly_limit), 0);
  const pct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  // Proyección de fin de mes según ritmo de gasto actual
  const dayOfMonth = getDate(new Date());
  const daysInMonth = getDaysInMonth(new Date());
  const projected = dayOfMonth > 0 ? (totalSpent / dayOfMonth) * daysInMonth : totalSpent;

  // Valor del inventario
  const inventoryValue = (pantry ?? []).reduce(
    (s, i) => s + (i.is_bulk ? (Number(i.quantity) / 100) * Number(i.unit_cost) : Number(i.quantity) * Number(i.unit_cost)),
    0,
  );

  // Gasto por categoría (top 4)
  const byCat = new Map<string, number>();
  for (const e of monthExpenses ?? []) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
  const topCats = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxCat = topCats.length > 0 ? topCats[0][1] : 1;

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: es });

  // Recordatorios: aniversarios próximos (≤3 días), pendientes vencidos, plan de hoy
  const alerts: { icon: LucideIcon; text: string; href: string }[] = [];
  for (const d of importantDates) {
    const next = nextOccurrence(d.date as string, d.recurring_yearly as boolean);
    const days = differenceInCalendarDays(next, new Date());
    if (days >= 0 && days <= 3) {
      alerts.push({
        icon: Cake,
        text: days === 0 ? `Hoy: ${d.title}` : days === 1 ? `Mañana: ${d.title}` : `En ${days} días: ${d.title}`,
        href: "/couple",
      });
    }
  }
  if (nextPlan?.planned_at && differenceInCalendarDays(new Date(nextPlan.planned_at), new Date()) === 0) {
    alerts.push({ icon: Heart, text: `Hoy tienen un plan: ${nextPlan.title}`, href: "/couple" });
  }
  if (overdueTodos > 0) {
    alerts.push({ icon: ListTodo, text: `${overdueTodos} ${overdueTodos === 1 ? "pendiente vencido" : "pendientes vencidos"}`, href: "/pending" });
  }

  // @ts-expect-error nested type from supabase
  const homeName = profile?.homes?.name ?? "Nuestro nido";
  // @ts-expect-error nested type from supabase
  const inviteCode = profile?.homes?.invite_code ?? "";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-ink-muted text-sm capitalize">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</p>
        <h1 className="font-display text-4xl sm:text-5xl mt-1">{greetingByTime(profile!.name)}</h1>
        <p className="text-ink-muted mt-2 italic leading-relaxed">{dailyQuote()}</p>
      </header>

      {!partner && (
        <div className="rounded-2xl border border-accent-soft bg-accent-soft/20 p-5">
          <div className="flex items-center gap-2.5 text-accent-primary">
            <NestLogo size={22} />
            <p className="font-medium text-ink">Invitá a tu pareja a {homeName}</p>
          </div>
          <p className="text-sm text-ink-muted mt-2">Compartile este código para que se una al nido:</p>
          <p className="mt-3 font-mono text-3xl tracking-widest text-accent-primary">{inviteCode}</p>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-accent-soft bg-accent-soft/15 p-4">
          <div className="flex items-center gap-2 text-accent-primary mb-2">
            <Bell className="w-4 h-4" strokeWidth={1.9} />
            <p className="text-sm font-medium text-ink">Recordatorios</p>
          </div>
          <ul className="space-y-1.5">
            {alerts.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i}>
                  <Link href={a.href} prefetch className="flex items-center gap-2 text-sm text-ink hover:text-accent-primary">
                    <Icon className="w-4 h-4 shrink-0 text-accent-primary" strokeWidth={1.8} />
                    <span>{a.text}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Widgets de análisis */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Widget label={`Gastado · ${monthLabel}`} value={formatCurrency(totalSpent)} icon={Wallet} />
        <Widget
          label="Proyección fin de mes"
          value={formatCurrency(projected)}
          icon={TrendingUp}
          hint={totalBudget > 0 ? (projected > totalBudget ? "sobre presupuesto" : "dentro del presupuesto") : undefined}
          danger={totalBudget > 0 && projected > totalBudget}
        />
        <Widget label="Inventario en casa" value={formatCurrency(inventoryValue)} icon={Boxes} />
        <Widget label="Tareas hechas (vos)" value={String(doneThisMonth ?? 0)} icon={CheckCircle2} />
      </div>

      {/* Análisis de gasto por categoría */}
      {topCats.length > 0 && (
        <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-ink-muted">En qué se va el mes</p>
            <Link href="/budget" prefetch className="text-xs text-accent-primary">Ver presupuesto</Link>
          </div>
          <div className="space-y-2.5">
            {topCats.map(([cat, amt]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm">
                  <span>{CAT_LABEL[cat] ?? cat}</span>
                  <span className="font-mono text-ink-muted">{formatCurrency(amt)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-bg-main overflow-hidden">
                  <div className="h-full bg-accent-primary" style={{ width: `${(amt / maxCat) * 100}%`, transition: "width 240ms ease-out" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card href="/tasks" title="Tareas de hoy" icon={ListTodo} subtitle={`${pendingCount ?? 0} pendientes`}>
          {todayTasks && todayTasks.length > 0 ? (
            <ul className="space-y-2 mt-2">
              {todayTasks.map((t) => (
                <li key={t.id} className="text-sm flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                  <span className="truncate">{t.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted mt-2">Sin tareas pendientes hoy.</p>
          )}
        </Card>

        <Card href="/budget" title={`Presupuesto · ${monthLabel}`} icon={Wallet} subtitle={`${pct}% gastado`}>
          <div className="mt-3 h-2 rounded-full bg-bg-main overflow-hidden">
            <div className="h-full" style={{ width: `${pct}%`, background: pct < 80 ? "var(--accent-secondary)" : pct < 100 ? "#D4A04A" : "#C9543B", transition: "width 240ms ease-out" }} />
          </div>
          <p className="text-xs text-ink-muted mt-2 font-mono">
            {formatCurrency(totalSpent)} / {totalBudget > 0 ? formatCurrency(totalBudget) : "—"}
          </p>
        </Card>

        <Card href="/groceries" title="Próxima compra" icon={ShoppingCart} subtitle={`${groceriesPending ?? 0} ${(groceriesPending ?? 0) === 1 ? "item" : "items"}`}>
          <p className="text-sm text-ink-muted mt-2">
            {(groceriesPending ?? 0) > 0 ? "Pendientes en la lista de compras." : "La lista está vacía."}
          </p>
        </Card>

        <Card href="/couple" title="Próximo plan" icon={Heart} subtitle={nextPlan?.title ?? "Sin planes"}>
          <p className="text-sm text-ink-muted mt-2">
            {nextPlan?.planned_at
              ? format(new Date(nextPlan.planned_at), "EEE d 'de' MMM, HH:mm", { locale: es })
              : "Programá su próxima cita en Pareja."}
          </p>
        </Card>
      </div>

      <Link
        href="/tasks/new"
        prefetch
        className="md:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-accent-primary text-bg-card text-2xl shadow-warm-lg flex items-center justify-center"
        aria-label="Agregar"
      >
        +
      </Link>
    </div>
  );
}

function Widget({
  label, value, icon: Icon, hint, danger,
}: { label: string; value: string; icon: LucideIcon; hint?: string; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-bg-card p-4 shadow-warm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-ink-muted leading-tight">{label}</p>
        <Icon className="w-4 h-4 text-accent-primary shrink-0" strokeWidth={1.7} />
      </div>
      <p className="font-display text-2xl mt-1.5 font-mono">{value}</p>
      {hint && <p className={`text-[10px] mt-0.5 ${danger ? "text-red-700" : "text-accent-secondary"}`}>{hint}</p>}
    </div>
  );
}

function Card({
  href, title, icon: Icon, subtitle, children,
}: { href: string; title: string; icon: LucideIcon; subtitle: string; children: React.ReactNode }) {
  return (
    <Link href={href} prefetch className="block rounded-3xl bg-bg-card border border-line shadow-warm p-5 hover:shadow-warm-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-ink-muted">{title}</p>
          <p className="font-display text-2xl mt-1 truncate">{subtitle}</p>
        </div>
        <Icon className="w-7 h-7 text-accent-primary shrink-0" strokeWidth={1.6} aria-hidden />
      </div>
      <div>{children}</div>
    </Link>
  );
}
