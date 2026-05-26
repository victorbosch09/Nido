import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "./settings-client";

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
      <PageHeader title="Ajustes" subtitle="Tu perfil y tu nido." />
      <SettingsClient
        currentUserId={user!.id}
        email={user!.email ?? ""}
        name={profile!.name}
        avatarEmoji={profile!.avatar_emoji}
        homeName={homeName}
        inviteCode={inviteCode}
      />
    </div>
  );
}
