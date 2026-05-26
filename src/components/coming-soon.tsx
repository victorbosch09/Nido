import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  title,
  icon: Icon,
  description,
}: {
  title: string;
  icon: LucideIcon;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
      <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-accent-soft/30 text-accent-primary flex items-center justify-center">
        <Icon className="w-8 h-8" strokeWidth={1.6} />
      </div>
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="text-ink-muted mt-3 max-w-md mx-auto leading-relaxed">{description}</p>
      <p className="mt-6 text-xs uppercase tracking-widest text-accent-primary">Próximamente · MVP iterativo</p>
    </div>
  );
}
