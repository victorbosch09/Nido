"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Table =
  | "tasks"
  | "expenses"
  | "budgets"
  | "grocery_items"
  | "love_notes"
  | "todos"
  | "recipes"
  | "moods"
  | "pantry_items"
  | "pantry_movements"
  | "profiles"
  | "homes";

export function RealtimeSync({
  homeId,
  tables,
}: {
  homeId: string;
  tables: readonly Table[];
}) {
  const router = useRouter();

  useEffect(() => {
    if (!homeId) return;
    const supabase = createClient();
    const channel = supabase.channel(`home:${homeId}`);

    for (const table of tables) {
      // homes / profiles don't have home_id but might still need refreshes
      const filter =
        table === "homes"
          ? `id=eq.${homeId}`
          : table === "profiles"
          ? `home_id=eq.${homeId}`
          : `home_id=eq.${homeId}`;
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        () => router.refresh(),
      );
    }

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [homeId, tables, router]);

  return null;
}
