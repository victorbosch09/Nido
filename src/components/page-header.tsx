"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backHref,
  right,
}: {
  title: string;
  subtitle?: string;
  /** If provided, on mobile a back arrow appears. Defaults to router.back(). */
  backHref?: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();

  function goBack() {
    if (backHref) router.push(backHref);
    else router.back();
  }

  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0 flex items-start gap-2">
        <button
          onClick={goBack}
          className="md:hidden mt-1 -ml-1 text-ink-muted hover:text-accent-primary shrink-0"
          aria-label="Volver"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={1.8} />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-4xl truncate">{title}</h1>
          {subtitle && <p className="text-ink-muted mt-1 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
