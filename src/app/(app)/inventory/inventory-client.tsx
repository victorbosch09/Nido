"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, ShoppingBasket, Boxes, Wallet, Minus, History, Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/toast";
import { cn, formatCurrency } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  category: string;
  unit: string | null;
  quantity: number;
  unit_cost: number;
  is_bulk: boolean;
  updated_at: string;
};
type Movement = {
  id: string;
  item_name: string;
  type: "purchase" | "consumption" | "adjustment";
  quantity: number;
  unit: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

// Valor actual: discreto = qty × costo unitario; a granel = (nivel%/100) × precio del lote
function itemValue(i: Item): number {
  return i.is_bulk
    ? (Number(i.quantity) / 100) * Number(i.unit_cost)
    : Number(i.quantity) * Number(i.unit_cost);
}

export function InventoryClient({
  items: serverItems,
  movements: serverMovements,
  currentUserId,
  spentThisMonth,
}: {
  items: Item[];
  movements: Movement[];
  currentUserId: string;
  spentThisMonth: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<Item[]>(serverItems);
  const [tab, setTab] = useState<"stock" | "history">("stock");
  const [showBuy, setShowBuy] = useState(false);

  useEffect(() => setItems(serverItems), [serverItems]);

  const inventoryValue = useMemo(
    () => items.reduce((s, i) => s + itemValue(i), 0),
    [items],
  );
  const lastPurchaseTotal = useMemo(() => {
    const purchases = serverMovements.filter((m) => m.type === "purchase");
    if (purchases.length === 0) return 0;
    // Agrupar la compra más reciente por timestamp cercano (mismo minuto)
    const latest = purchases[0].created_at.slice(0, 16);
    return purchases
      .filter((m) => m.created_at.slice(0, 16) === latest)
      .reduce((s, m) => s + Number(m.total_cost ?? 0), 0);
  }, [serverMovements]);

  async function consume(item: Item, qty: number) {
    if (qty <= 0 || qty > Number(item.quantity)) {
      toast.error("Cantidad inválida");
      return;
    }
    const newQty = Number(item.quantity) - qty;
    setItems((arr) =>
      arr.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)),
    );
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", currentUserId)
      .single();
    const homeId = profile!.home_id;

    const { error } = await supabase
      .from("pantry_items")
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) {
      setItems((arr) => arr.map((i) => (i.id === item.id ? item : i)));
      toast.error("No se pudo descontar");
      return;
    }
    await supabase.from("pantry_movements").insert({
      home_id: homeId,
      item_id: item.id,
      item_name: item.name,
      type: "consumption",
      quantity: qty,
      unit: item.unit,
      unit_cost: item.unit_cost,
      total_cost: Number((qty * Number(item.unit_cost)).toFixed(2)),
      created_by: currentUserId,
    });
    toast.success(`Usaste ${qty}${item.unit ? " " + item.unit : ""} de ${item.name}`);
    startTransition(() => router.refresh());
  }

  async function setBulkLevel(item: Item, newPct: number) {
    const clamped = Math.max(0, Math.min(100, newPct));
    const oldPct = Number(item.quantity);
    if (clamped === oldPct) return;
    setItems((arr) =>
      arr.map((i) => (i.id === item.id ? { ...i, quantity: clamped } : i)),
    );
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", currentUserId)
      .single();
    const homeId = profile!.home_id;

    const { error } = await supabase
      .from("pantry_items")
      .update({ quantity: clamped, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) {
      setItems((arr) => arr.map((i) => (i.id === item.id ? item : i)));
      toast.error("No se pudo actualizar");
      return;
    }
    const deltaPct = oldPct - clamped; // positivo = consumo
    await supabase.from("pantry_movements").insert({
      home_id: homeId,
      item_id: item.id,
      item_name: item.name,
      type: deltaPct >= 0 ? "consumption" : "adjustment",
      quantity: Math.abs(deltaPct),
      unit: "%",
      unit_cost: item.unit_cost,
      total_cost: Number(((Math.abs(deltaPct) / 100) * Number(item.unit_cost)).toFixed(2)),
      created_by: currentUserId,
    });
    if (deltaPct > 0) {
      toast.success(
        `${item.name}: ${clamped}% restante`,
        { description: `Consumiste ~${formatCurrency((deltaPct / 100) * Number(item.unit_cost))}` },
      );
    }
    startTransition(() => router.refresh());
  }

  async function removeItem(item: Item) {
    setItems((arr) => arr.filter((i) => i.id !== item.id));
    const supabase = createClient();
    const { error } = await supabase.from("pantry_items").delete().eq("id", item.id);
    if (error) {
      setItems((arr) => [item, ...arr]);
      toast.error("No se pudo eliminar");
      return;
    }
    toast({ title: `"${item.name}" quitado del inventario` });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Valor en casa" value={formatCurrency(inventoryValue)} icon={Boxes} />
        <StatCard label="Última compra" value={formatCurrency(lastPurchaseTotal)} icon={ShoppingBasket} />
        <StatCard label="Súper este mes" value={formatCurrency(spentThisMonth)} icon={Wallet} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-bg-main border border-line p-1 gap-0.5">
          {(["stock", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full",
                tab === t ? "bg-accent-primary text-bg-card shadow-warm" : "text-ink-muted",
              )}
            >
              {t === "stock" ? "Stock" : "Historial"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowBuy((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary text-bg-card px-5 py-2 text-sm font-medium shadow-warm"
        >
          <Plus className="w-4 h-4" />
          {showBuy ? "Cerrar" : "Registrar compra"}
        </button>
      </div>

      <AnimatePresence>
        {showBuy && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <PurchaseForm
              currentUserId={currentUserId}
              existing={items}
              onDone={() => {
                setShowBuy(false);
                startTransition(() => router.refresh());
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {tab === "stock" ? (
        items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <StockRow
                  key={item.id}
                  item={item}
                  onConsume={(qty) => consume(item, qty)}
                  onSetLevel={(pct) => setBulkLevel(item, pct)}
                  onRemove={() => removeItem(item)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )
      ) : (
        <HistoryList movements={serverMovements} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
      <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
        <Boxes className="w-8 h-8" strokeWidth={1.6} />
      </div>
      <p className="font-display text-2xl">Inventario vacío</p>
      <p className="text-ink-muted mt-2 leading-relaxed">
        Registrá tu próxima compra del súper y empezá a llevar la cuenta.
      </p>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon,
}: { label: string; value: string; icon: typeof Boxes }) {
  return (
    <div className="rounded-3xl border border-line bg-bg-card p-5 shadow-warm">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wider text-ink-muted">{label}</p>
        <Icon className="w-5 h-5 text-accent-primary" strokeWidth={1.6} />
      </div>
      <p className="font-display text-3xl mt-2 font-mono">{value}</p>
    </div>
  );
}

function StockRow({
  item, onConsume, onSetLevel, onRemove,
}: {
  item: Item;
  onConsume: (qty: number) => void;
  onSetLevel: (pct: number) => void;
  onRemove: () => void;
}) {
  const [consuming, setConsuming] = useState(false);
  const [qty, setQty] = useState("1");
  const value = itemValue(item);
  const level = Number(item.quantity);
  const low = level <= 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.12 }}
      className="rounded-2xl bg-bg-card border border-line p-4 shadow-warm"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium truncate", low && "text-ink-muted line-through")}>
            {item.name}
            {item.is_bulk && (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-muted">granel</span>
            )}
          </p>
          {item.is_bulk ? (
            <p className="text-xs text-ink-muted font-mono">
              {level}% · {formatCurrency(value)} de {formatCurrency(Number(item.unit_cost))}
            </p>
          ) : (
            <p className="text-xs text-ink-muted font-mono">
              {level}{item.unit ? ` ${item.unit}` : ""} · {formatCurrency(Number(item.unit_cost))}
              {item.unit ? `/${item.unit}` : " c/u"} · {formatCurrency(value)}
            </p>
          )}
        </div>
        {!item.is_bulk && !consuming && (
          <>
            <button
              onClick={() => setConsuming(true)}
              disabled={low}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-main px-3 py-1.5 text-xs text-ink-muted disabled:opacity-40"
            >
              <Minus className="w-3.5 h-3.5" />
              Usar
            </button>
            <button onClick={onRemove} className="text-ink-muted hover:text-accent-primary" aria-label="Eliminar">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        {!item.is_bulk && consuming && (
          <div className="flex items-center gap-2">
            <input
              type="number" step="0.01" min="0" max={level} inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              autoFocus
              className="w-20 rounded-xl border border-line bg-bg-main px-2 py-1.5 font-mono text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            />
            <button
              onClick={() => { onConsume(Number(qty)); setConsuming(false); setQty("1"); }}
              className="rounded-full bg-accent-secondary text-bg-card px-3 py-1.5 text-xs font-medium"
            >
              OK
            </button>
            <button onClick={() => setConsuming(false)} className="text-ink-muted" aria-label="Cancelar">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {item.is_bulk && (
          <button onClick={onRemove} className="text-ink-muted hover:text-accent-primary shrink-0" aria-label="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bulk: barra de nivel + chips para ajustar "a ojo" */}
      {item.is_bulk && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-bg-main overflow-hidden">
            <div
              className="h-full bg-accent-primary"
              style={{ width: `${Math.max(0, Math.min(100, level))}%`, transition: "width 240ms ease-out" }}
            />
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-ink-muted mr-1">¿Cuánto queda?</span>
            {[100, 75, 50, 25, 0].map((p) => (
              <button
                key={p}
                onClick={() => onSetLevel(p)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-mono border",
                  level === p
                    ? "bg-accent-primary text-bg-card border-accent-primary"
                    : "bg-bg-main border-line text-ink-muted hover:border-accent-soft",
                )}
              >
                {p === 0 ? "Vacío" : `${p}%`}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.li>
  );
}

function HistoryList({ movements }: { movements: Movement[] }) {
  if (movements.length === 0) {
    return <p className="text-ink-muted text-center py-12">Sin movimientos todavía.</p>;
  }
  return (
    <ul className="space-y-2">
      {movements.map((m) => {
        const isPurchase = m.type === "purchase";
        return (
          <li
            key={m.id}
            className="rounded-2xl bg-bg-card border border-line p-3 flex items-center gap-3 shadow-warm"
          >
            <span
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                isPurchase ? "bg-accent-secondary/15 text-accent-secondary" : "bg-accent-soft/30 text-accent-primary",
              )}
            >
              {isPurchase ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{m.item_name}</p>
              <p className="text-xs text-ink-muted font-mono">
                {isPurchase ? "Compra" : m.type === "consumption" ? "Consumo" : "Ajuste"} ·{" "}
                {m.note ? `${m.note}` : `${Number(m.quantity)}${m.unit ? ` ${m.unit}` : ""}`} ·{" "}
                {formatDistanceToNow(new Date(m.created_at), { locale: es, addSuffix: true })}
              </p>
            </div>
            {m.total_cost != null && (
              <span className={cn("font-mono text-sm", isPurchase ? "text-accent-secondary" : "text-ink-muted")}>
                {isPurchase ? "+" : "−"}{formatCurrency(Number(m.total_cost))}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type Line = { name: string; packs: string; content: string; unit: string; price: string; bulk: boolean };

function lineBaseQty(l: Line): number {
  const packs = Number(l.packs) || 0;
  const content = Number(l.content) || 0;
  return content > 0 ? packs * content : packs;
}

const emptyLine = (): Line => ({ name: "", packs: "1", content: "", unit: "", price: "", bulk: false });

function PurchaseForm({
  currentUserId, existing, onDone,
}: { currentUserId: string; existing: Item[]; onDone: () => void }) {
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [loading, setLoading] = useState(false);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.price) || 0), 0),
    [lines],
  );

  function update(i: number, patch: Partial<Line>) {
    setLines((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((arr) => [...arr, emptyLine()]);
  }
  function removeLine(i: number) {
    setLines((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = lines.filter(
      (l) => l.name.trim() && (l.bulk ? Number(l.price) >= 0 : lineBaseQty(l) > 0 && Number(l.price) >= 0),
    );
    if (valid.length === 0) {
      toast.error("Agregá al menos un item válido");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_id")
      .eq("id", currentUserId)
      .single();
    const homeId = profile!.home_id;
    const existingByName = new Map(existing.map((i) => [i.name.toLowerCase(), i]));

    for (const l of valid) {
      const price = Number(l.price);
      const prev = existingByName.get(l.name.trim().toLowerCase());

      if (l.bulk) {
        // A granel: el lote queda al 100%, unit_cost = precio del lote completo.
        if (prev) {
          await supabase
            .from("pantry_items")
            .update({
              quantity: 100,
              unit_cost: Number(price.toFixed(2)),
              is_bulk: true,
              unit: l.unit.trim() || prev.unit,
              updated_at: new Date().toISOString(),
            })
            .eq("id", prev.id);
        } else {
          await supabase.from("pantry_items").insert({
            home_id: homeId,
            name: l.name.trim(),
            unit: l.unit.trim() || null,
            quantity: 100,
            unit_cost: Number(price.toFixed(2)),
            is_bulk: true,
          });
        }
        await supabase.from("pantry_movements").insert({
          home_id: homeId,
          item_id: prev?.id ?? null,
          item_name: l.name.trim(),
          type: "purchase",
          quantity: 1,
          unit: l.unit.trim() || "lote",
          unit_cost: Number(price.toFixed(2)),
          total_cost: Number(price.toFixed(2)),
          note: "lote completo",
          created_by: currentUserId,
        });
        continue;
      }

      const baseQty = lineBaseQty(l); // unidades consumibles totales (paquetes × contenido)
      const unitCost = baseQty > 0 ? price / baseQty : 0;

      let itemId: string;
      if (prev) {
        const prevQty = Number(prev.quantity);
        const prevCost = Number(prev.unit_cost);
        const newQty = prevQty + baseQty;
        const newUnitCost = newQty > 0 ? (prevQty * prevCost + baseQty * unitCost) / newQty : unitCost;
        await supabase
          .from("pantry_items")
          .update({
            quantity: newQty,
            unit_cost: Number(newUnitCost.toFixed(4)),
            unit: l.unit.trim() || prev.unit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prev.id);
        itemId = prev.id;
      } else {
        const { data: inserted } = await supabase
          .from("pantry_items")
          .insert({
            home_id: homeId,
            name: l.name.trim(),
            unit: l.unit.trim() || null,
            quantity: baseQty,
            unit_cost: Number(unitCost.toFixed(4)),
          })
          .select("id")
          .single();
        itemId = inserted!.id;
      }

      const packs = Number(l.packs) || 0;
      const content = Number(l.content) || 0;
      const note =
        content > 0
          ? `${packs} × ${content}${l.unit.trim() ? " " + l.unit.trim() : ""}`
          : null;

      await supabase.from("pantry_movements").insert({
        home_id: homeId,
        item_id: itemId,
        item_name: l.name.trim(),
        type: "purchase",
        quantity: baseQty,
        unit: l.unit.trim() || null,
        unit_cost: Number(unitCost.toFixed(4)),
        total_cost: Number(price.toFixed(2)),
        note,
        created_by: currentUserId,
      });
    }

    if (total > 0) {
      await supabase.from("expenses").insert({
        home_id: homeId,
        amount: Number(total.toFixed(2)),
        category: "groceries",
        date: new Date().toISOString().slice(0, 10),
        paid_by: currentUserId,
        is_shared: true,
        notes: `Súper · ${valid.length} ${valid.length === 1 ? "item" : "items"}`,
      });
    }

    setLoading(false);
    toast.success(`Compra registrada · ${formatCurrency(total)}`, {
      description: "Sumada al inventario y al presupuesto",
    });
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4 rounded-2xl bg-bg-main border border-line">
      <p className="text-xs uppercase tracking-wider text-ink-muted">Items de la compra</p>
      <div className="space-y-3">
        {lines.map((l, i) => {
          const baseQty = lineBaseQty(l);
          const price = Number(l.price) || 0;
          const unitCost = baseQty > 0 ? price / baseQty : 0;
          const showPreview = !l.bulk && baseQty > 0 && (Number(l.content) || 0) > 0;
          return (
            <div key={i} className="rounded-2xl border border-line bg-bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={l.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder={l.bulk ? "Item a granel (ej: azúcar)" : "Item (ej: tortillas)"}
                  className="flex-1 min-w-0 rounded-xl border border-line bg-bg-main px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                />
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-ink-muted hover:text-accent-primary shrink-0"
                    aria-label="Quitar línea"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {l.bulk ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wide text-ink-muted">Etiqueta (opcional)</span>
                    <input
                      value={l.unit}
                      onChange={(e) => update(i, { unit: e.target.value })}
                      placeholder="bolsa, paquete…"
                      className="mt-0.5 w-full rounded-xl border border-line bg-bg-main px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wide text-ink-muted">$ del lote</span>
                    <input
                      type="number" step="0.01" min="0" inputMode="decimal"
                      value={l.price}
                      onChange={(e) => update(i, { price: e.target.value })}
                      placeholder="2.00"
                      className="mt-0.5 w-full rounded-xl border border-line bg-bg-main px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wide text-ink-muted">Paquetes</span>
                    <input
                      type="number" step="1" min="0" inputMode="numeric"
                      value={l.packs}
                      onChange={(e) => update(i, { packs: e.target.value })}
                      className="mt-0.5 w-full rounded-xl border border-line bg-bg-main px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wide text-ink-muted">Contenido</span>
                    <input
                      type="number" step="0.01" min="0" inputMode="decimal"
                      value={l.content}
                      onChange={(e) => update(i, { content: e.target.value })}
                      placeholder="ej: 8"
                      className="mt-0.5 w-full rounded-xl border border-line bg-bg-main px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wide text-ink-muted">Unidad</span>
                    <input
                      value={l.unit}
                      onChange={(e) => update(i, { unit: e.target.value })}
                      placeholder="tortilla"
                      className="mt-0.5 w-full rounded-xl border border-line bg-bg-main px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wide text-ink-muted">$ total</span>
                    <input
                      type="number" step="0.01" min="0" inputMode="decimal"
                      value={l.price}
                      onChange={(e) => update(i, { price: e.target.value })}
                      placeholder="1.30"
                      className="mt-0.5 w-full rounded-xl border border-line bg-bg-main px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    />
                  </label>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={l.bulk}
                    onChange={(e) => update(i, { bulk: e.target.checked })}
                  />
                  A granel (bolsa/paquete sin unidades)
                </label>
                {showPreview && (
                  <p className="text-xs text-accent-secondary font-mono">
                    = {baseQty} {l.unit.trim() || "u"} · {formatCurrency(unitCost)}/{l.unit.trim() || "u"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={addLine}
        className="inline-flex items-center gap-1.5 text-sm text-accent-primary font-medium"
      >
        <Plus className="w-4 h-4" />
        Agregar item
      </button>

      <div className="flex items-center justify-between pt-2 border-t border-line">
        <span className="text-sm text-ink-muted">Total de la compra</span>
        <span className="font-mono font-medium text-lg">{formatCurrency(total)}</span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-line bg-bg-card px-5 py-2 text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-full bg-accent-primary text-bg-card font-medium py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Registrar compra"}
        </button>
      </div>
    </form>
  );
}
