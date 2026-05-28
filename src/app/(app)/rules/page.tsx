import { createClient } from "@/lib/supabase/server";
import { format, subDays } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { RulesClient } from "./rules-client";

export default async function RulesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("home_id")
    .eq("id", user!.id)
    .single();
  const homeId = profile!.home_id as string;

  const since = format(subDays(new Date(), 13), "yyyy-MM-dd");

  const [{ data: rules }, { data: logs }] = await Promise.all([
    supabase
      .from("rules")
      .select("id, text, active, created_at")
      .eq("home_id", homeId)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("rule_logs")
      .select("rule_id, date, followed")
      .eq("home_id", homeId)
      .gte("date", since)
      .order("date", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuestras reglas"
        subtitle="Los acuerdos de la relación. Marquen cada día si los cumplieron."
      />
      <RulesClient
        rules={rules ?? []}
        logs={logs ?? []}
        currentUserId={user!.id}
        today={format(new Date(), "yyyy-MM-dd")}
      />
    </div>
  );
}
