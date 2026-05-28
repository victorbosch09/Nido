"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scale, Check, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { formatCurrency } from "@/lib/utils";

type Member = { id: string; name: string; avatar_emoji: string };
type Settlement = {
  even: boolean;
  amount: number;
  fromId?: string;
  fromName?: string;
  toId?: string;
  toName?: string;
};

export function SettlementCard({
  settlement,
  currentUserId,
  members,
}: {
  settlement: Settlement;
  currentUserId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  async function settle() {
    if (settlement.even || !settlement.fromId || !settlement.toId) return;
    setSaving(true);
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", currentUserId)
      .single();
    const { error } = await supabase.from("settlements").insert({
      home_id: profile!.home_id,
      from_user: settlement.fromId,
      to_user: settlement.toId,
      amount: Number(settlement.amount.toFixed(2)),
      created_by: currentUserId,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo saldar");
      return;
    }
    toast.success("¡Saldado! Quedaron a mano");
    startTransition(() => router.refresh());
  }

  if (settlement.even) {
    return (
      <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-accent-secondary/15 text-accent-secondary flex items-center justify-center shrink-0">
          <Scale className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div>
          <p className="font-medium">Están a mano</p>
          <p className="text-xs text-ink-muted">Nadie le debe nada al otro ahora mismo.</p>
        </div>
      </div>
    );
  }

  const fromMember = members.find((m) => m.id === settlement.fromId);
  const toMember = members.find((m) => m.id === settlement.toId);

  return (
    <div className="rounded-3xl border border-accent-soft bg-accent-soft/15 shadow-warm p-5">
      <div className="flex items-center gap-2 text-accent-primary mb-3">
        <Scale className="w-5 h-5" strokeWidth={1.8} />
        <p className="font-medium text-ink">Saldo entre ustedes</p>
      </div>
      <div className="flex items-center justify-center gap-3 py-2">
        <div className="text-center">
          <div className="text-3xl leading-none">{fromMember?.avatar_emoji}</div>
          <p className="text-xs text-ink-muted mt-1">{settlement.fromName}</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-mono font-medium text-lg text-accent-primary">
            {formatCurrency(settlement.amount)}
          </span>
          <ArrowRight className="w-5 h-5 text-ink-muted" />
        </div>
        <div className="text-center">
          <div className="text-3xl leading-none">{toMember?.avatar_emoji}</div>
          <p className="text-xs text-ink-muted mt-1">{settlement.toName}</p>
        </div>
      </div>
      <p className="text-sm text-center text-ink-muted mt-1">
        <span className="font-medium text-ink">{settlement.fromName}</span> le debe{" "}
        <span className="font-medium text-ink">{formatCurrency(settlement.amount)}</span> a{" "}
        <span className="font-medium text-ink">{settlement.toName}</span>
      </p>
      <button
        onClick={settle}
        disabled={saving}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-accent-primary text-bg-card font-medium py-2.5 text-sm shadow-warm disabled:opacity-50"
      >
        <Check className="w-4 h-4" />
        {saving ? "Saldando…" : "Marcar como saldado"}
      </button>
    </div>
  );
}
