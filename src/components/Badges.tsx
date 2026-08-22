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
  // Kompakte Zeile statt eigener Warnbox (Tim, 22.08.2026): Der Hinweis
  // nahm zu viel Platz, der Kicker oben nennt den Leak ohnehin schon.
  return (
    <p className="rounded-[18px] border border-white/[0.14] bg-white/[0.07] px-5 py-3.5 text-[13px] leading-[1.45] text-[#8F95A9] backdrop-blur-[18px]">
      <strong className="font-bold text-magenta">Gerücht / Leak:</strong> unbestätigte Informationen -
      wir kennzeichnen, was gesichert ist.
    </p>
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
