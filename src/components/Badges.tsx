import type { ReactNode } from "react";
import type { Category, ReviewLabel } from "@/lib/types";
import { CATEGORY_LABELS, REVIEW_LABEL_META } from "@/lib/types";

const CATEGORY_TONE: Record<Category, string> = {
  breaking: "text-accent border-accent/40 bg-accent/10",
  news: "text-text-secondary border-border-default bg-white/[0.03]",
  leaks: "text-warning border-warning/40 bg-warning/10",
  reviews: "text-text-secondary border-border-default bg-white/[0.03]",
};

export function CategoryPill({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${CATEGORY_TONE[category]}`}
    >
      {CATEGORY_LABELS[category].toUpperCase()}
    </span>
  );
}

export function LeakBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/[0.08] px-4 py-3">
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
    <span className="inline-flex items-center rounded-full border border-border-subtle bg-surface-card px-3 py-1 text-xs text-text-tertiary">
      {children}
    </span>
  );
}
