import type { ReactNode } from "react";
import type { Category, ReviewLabel } from "@/lib/types";
import { CATEGORY_LABELS, REVIEW_LABEL_META } from "@/lib/types";

const CATEGORY_TONE: Record<Category, string> = {
  breaking: "text-accent border-accent/40 bg-accent/10",
  news: "text-text-secondary border-border-default bg-text-primary/[0.03]",
  leaks: "text-warning border-warning/40 bg-warning/10",
  reviews: "text-text-secondary border-border-default bg-text-primary/[0.03]",
  guides: "text-success border-success/40 bg-success/10",
};

// Varianten für Navy-Flächen (Hero, dunkle Bänder).
const CATEGORY_TONE_DARK: Record<Category, string> = {
  breaking: "text-accent border-accent/50 bg-accent/10",
  news: "text-navy-muted border-white/20 bg-white/[0.06]",
  leaks: "text-[#F5B942] border-[#F5B942]/40 bg-[#F5B942]/10",
  reviews: "text-navy-muted border-white/20 bg-white/[0.06]",
  guides: "text-success border-success/50 bg-success/10",
};

export function CategoryPill({ category, onDark = false }: { category: Category; onDark?: boolean }) {
  const tone = onDark ? CATEGORY_TONE_DARK[category] : CATEGORY_TONE[category];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tone}`}
    >
      {CATEGORY_LABELS[category].toUpperCase()}
    </span>
  );
}

export function LeakBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/[0.08] px-4 py-3">
      <span className="mt-0.5 text-warning">⚠</span>
      <p className="text-sm leading-relaxed text-text-primary">
        <strong className="text-warning">Gerücht / Leak:</strong> Dieser Artikel behandelt unbestätigte
        Informationen aus Leaks oder Insider-Quellen. Wir kennzeichnen das klar und ordnen ein, was
        gesichert ist und was Spekulation bleibt.
      </p>
    </div>
  );
}

const REVIEW_TONE: Record<string, string> = {
  success: "text-success border-success/40 bg-success/10",
  accent: "text-accent border-accent/40 bg-accent/10",
  warning: "text-warning border-warning/40 bg-warning/10",
  error: "text-error border-error/40 bg-error/10",
};

export function ReviewLabelBadge({ label, size = "md" }: { label: ReviewLabel; size?: "sm" | "md" }) {
  const meta = REVIEW_LABEL_META[label];
  return (
    <span
      title={meta.description}
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide ${REVIEW_TONE[meta.tone]} ${
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-4 py-1.5 text-sm"
      }`}
    >
      {label}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-subtle bg-surface-panel px-3 py-1 text-xs text-text-tertiary">
      {children}
    </span>
  );
}
