import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dailyQuote, formatCurrency, greetingByTime } from "@/lib/utils";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";

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
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, category, priority, status, assigned_to", { count: "exact" })
      .eq("home_id", homeId)
      .eq("status", "pending")
      .or(`due_date.is.null,due_date.lte.${today}`)
      .order("priority", { ascending: false })
      .limit(5),
    supabase
      .from("expenses")
      .select("amount, category")
      .eq("home_id", homeId)
      .gte("date", monthStart)
      .lte("date", monthEnd),
    supabase.from("budgets").select("category, monthly_limit").eq("home_id", homeId),
    supabase
      .from("profiles")
      .select("id, name, avatar_emoji")
      .eq("home_id", homeId)
      .neq("id", user.id)
      .maybeSingle(),
  ]);

  const totalSpent = (monthExpenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget = (budgets ?? []).reduce((s, b) => s + Number(b.monthly_limit), 0);
  const pct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: es });

  // @ts-expect-error nested type from supabase
  const homeName = profile?.homes?.name ?? "Nuestro nido";
  // @ts-expect-error nested type from supabase
  const inviteCode = profile?.homes?.invite_code ?? "";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-ink-muted text-sm capitalize">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</p>
        <h1 className="font-display text-4xl sm:text-5xl mt-1">{greetingByTime(profile!.name)}</h1>
        <p className="text-ink-muted mt-2 italic">{dailyQuote()}</p>
      </header>

      {!partner && (
        <div className="rounded-2xl border border-accent-soft bg-accent-soft/20 p-5">
          <p className="font-medium">Invitá a tu pareja a {homeName} 🪺</p>
          <p className="text-sm text-ink-muted mt-1">Compartile este código para que se una al nido:</p>
          <p className="mt-3 font-mono text-3xl tracking-widest text-accent-primary">{inviteCode}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card href="/tasks" title="Tareas de hoy" emoji="✅" subtitle={`${pendingCount ?? 0} pendientes`}>
          {todayTasks && todayTasks.length > 0 ? (
            <ul className="space-y-2 mt-2">
              {todayTasks.map((t) => (
                <li key={t.id} className="text-sm flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-accent-primary" />
                  <span className="truncate">{t.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted mt-2">Sin tareas pendientes hoy. ✨</p>
          )}
        </Card>

        <Card href="/budget" title={`Presupuesto · ${monthLabel}`} emoji="💰" subtitle={`${pct}% gastado`}>
          <div className="mt-3 h-2 rounded-full bg-bg-main overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct < 80 ? "var(--accent-secondary)" : pct < 100 ? "#D4A04A" : "#C9543B",
              }}
            />
          </div>
          <p className="text-xs text-ink-muted mt-2 font-mono">
            {formatCurrency(totalSpent)} / {totalBudget > 0 ? formatCurrency(totalBudget) : "—"}
          </p>
        </Card>

        <Card href="/groceries" title="Próxima compra" emoji="🛒" subtitle="Lista lista para salir">
          <p className="text-sm text-ink-muted mt-2">Pronto activamos la despensa inteligente. 🌾</p>
        </Card>

        <Card href="/couple" title="Próximo plan" emoji="💑" subtitle="Tiempo juntos">
          <p className="text-sm text-ink-muted mt-2">Programá su próxima cita en el módulo Pareja. 💕</p>
        </Card>
      </div>

      <Link
        href="/tasks/new"
        className="md:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-accent-primary text-bg-card text-2xl shadow-warm-lg flex items-center justify-center"
        aria-label="Agregar"
      >
        ＋
      </Link>
    </div>
  );
}

function Card({
  href, title, emoji, subtitle, children,
}: { href: string; title: string; emoji: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-3xl bg-bg-card border border-line shadow-warm p-5 hover:shadow-warm-lg transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-muted">{title}</p>
          <p className="font-display text-2xl mt-1">{subtitle}</p>
        </div>
        <span className="text-3xl" aria-hidden>{emoji}</span>
      </div>
      <div>{children}</div>
    </Link>
  );
}
