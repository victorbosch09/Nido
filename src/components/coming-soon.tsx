export function ComingSoon({ title, emoji, description }: { title: string; emoji: string; description: string }) {
  return (
    <div className="rounded-3xl border border-line bg-bg-card shadow-warm p-10 text-center">
      <div className="text-6xl mb-4" aria-hidden>{emoji}</div>
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="text-ink-muted mt-3 max-w-md mx-auto">{description}</p>
      <p className="mt-6 text-xs uppercase tracking-widest text-accent-primary">Próximamente · MVP iterativo</p>
    </div>
  );
}
