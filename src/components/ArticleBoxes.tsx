import type { Review, Source } from "@/lib/types";
import { ReviewLabelBadge } from "./Badges";

export function TldrBox({ items }: { items: string[] }) {
  return (
    <div className="my-8 rounded-2xl border border-border-default bg-surface-card p-6">
      <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-accent">
        <BoltIcon className="h-4 w-4" /> KURZFASSUNG
      </p>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-text-primary">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WhyItMattersBox({ text }: { text: string }) {
  return (
    // Dezenter, rundum gleich dicker Cyan-Rand (Betreiber-Vorgabe 05.08.2026).
    <div className="my-8 rounded-2xl border border-accent/35 bg-accent-wash/30 p-6">
      <p className="mb-2 text-[13px] font-semibold tracking-wide text-accent">
        WARUM DAS WICHTIG IST
      </p>
      <p className="text-[15px] leading-relaxed text-text-primary">{text}</p>
    </div>
  );
}

export function ReviewBox({ review }: { review: Review }) {
  return (
    <div className="my-10 rounded-2xl border border-border-default bg-surface-card p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-semibold tracking-wide text-text-tertiary">
          URTEIL VON REPUBLIC OF PIXELS
        </p>
        <ReviewLabelBadge label={review.label} />
      </div>
      <p className="text-[15px] leading-relaxed text-text-primary">{review.verdict}</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-success">STÄRKEN</p>
          <ul className="flex flex-col gap-2">
            {review.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-text-secondary">
                <span className="text-success">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-error">SCHWÄCHEN</p>
          <ul className="flex flex-col gap-2">
            {review.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-text-secondary">
                <span className="text-error">–</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-border-subtle pt-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-text-tertiary">FÜR WEN?</p>
          <p className="text-sm text-text-secondary">{review.forWhom}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-text-tertiary">KAUFEMPFEHLUNG</p>
          <p className="text-sm text-text-secondary">{review.recommendation}</p>
        </div>
      </div>
    </div>
  );
}

export function SourcesBox({ sources }: { sources: Source[] }) {
  return (
    <div className="my-8 rounded-2xl border border-border-subtle p-6">
      <p className="mb-3 text-[13px] font-semibold tracking-wide text-text-tertiary">QUELLEN</p>
      <ul className="flex flex-col gap-2">
        {sources.map((s, i) => (
          <li key={i} className="text-sm">
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text-secondary hover:text-accent transition-colors underline decoration-border-default underline-offset-4"
            >
              {s.title}
            </a>
            {s.publisher && <span className="text-text-tertiary"> — {s.publisher}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}
