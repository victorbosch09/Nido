import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_emoji, role_tag, homes(name, invite_code)")
    .eq("id", user!.id)
    .single();

  // @ts-expect-error nested type
  const homeName: string = profile?.homes?.name ?? "Nuestro nido";
  // @ts-expect-error nested type
  const inviteCode: string = profile?.homes?.invite_code ?? "—";

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <h1 className="font-display text-4xl">Ajustes</h1>
        <p className="text-ink-muted mt-1">Tu perfil y tu nido.</p>
      </header>

      <section className="rounded-3xl border border-line bg-bg-card shadow-warm p-6">
        <h2 className="font-display text-2xl mb-4">Tu perfil</h2>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{profile?.avatar_emoji}</span>
          <div>
            <p className="font-medium text-lg">{profile?.name}</p>
            <p className="text-sm text-ink-muted">{user?.email}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-bg-card shadow-warm p-6">
        <h2 className="font-display text-2xl mb-2">{homeName}</h2>
        <p className="text-sm text-ink-muted">Código de invitación para tu pareja:</p>
        <p className="mt-3 font-mono text-3xl tracking-widest text-accent-primary">{inviteCode}</p>
      </section>
    </div>
  );
}
