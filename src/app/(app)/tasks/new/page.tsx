import { createClient } from "@/lib/supabase/server";
import { NewTaskForm } from "./form";

export default async function NewTaskPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user!.id).single();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, name, avatar_emoji")
    .eq("home_id", profile!.home_id);

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl">Nueva tarea ✨</h1>
      <p className="text-ink-muted mt-1">Sumá una tarea al hogar.</p>
      <div className="mt-6">
        <NewTaskForm members={members ?? []} />
      </div>
    </div>
  );
}
