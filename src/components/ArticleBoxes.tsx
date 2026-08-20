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
    // Cyan statt Navy (Tim, 17.08.2026): EINE Kachelfarbe auf der ganzen
    // Seite - wie Event-Buehne, Newsletter und Radar-Karten. Auf
    // Navy-Grund ginge eine Navy-Box unter.
    <div className="my-8 rounded-2xl bg-accent p-6">
      <p className="mb-2 text-[13px] font-semibold tracking-wide text-navy/70">
        WARUM DAS WICHTIG IST
      </p>
      <p className="text-[15px] leading-relaxed text-navy">{text}</p>
    </div>
  );
}

export function ReviewBox({ review }: { review: Review }) {
  return (
    <div className="my-10 rounded-2xl border border-border-default bg-surface-card p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* "DAS SAGT DIE FACHPRESSE" statt "URTEIL VON REPUBLIC OF PIXELS"
            (Tim-Freigabe 14.08.2026): Unsere Tests fassen die Tests der
            Fachpresse zusammen - wir spielen die Spiele nicht selbst. Der
            Fliesstext sagt das ehrlich ("laut PC Gamer"), aber die alte
            Überschrift behauptete ein eigenes Urteil. Die Box verspricht
            jetzt genau das, was drinsteckt. */}
        <p className="text-[13px] font-semibold tracking-wide text-text-tertiary">
          DAS SAGT DIE FACHPRESSE
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
                <span className="text-error">-</span>
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
  // Doppelte Quellen ausfiltern (gleiche URL): ältere Artikel enthalten
  // teils zweimal denselben Eintrag, wenn zwei Feed-Items desselben
  // Clusters auf denselben Beitrag zeigten.
  const unique = sources.filter(
    (s, i) => sources.findIndex((o) => o.url === s.url) === i
  );
  // Eingeklappt statt offener Block (Betreiber-Wunsch 07.08.2026): Die
  // Quellen bleiben einen Klick entfernt transparent, ziehen aber keine
  // Aufmerksamkeit mehr vom Artikel ab.
  return (
    <details className="group my-8 rounded-2xl border border-border-subtle">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[13px] font-semibold tracking-wide text-text-tertiary transition-colors hover:text-text-secondary [&::-webkit-details-marker]:hidden">
        <span>QUELLEN ({unique.length})</span>
        <ChevronIcon className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <ul className="flex flex-col gap-2 px-5 pb-4">
        {unique.map((s, i) => (
          <li key={i} className="text-sm">
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text-secondary hover:text-accent transition-colors underline decoration-border-default underline-offset-4"
            >
              {s.title}
            </a>
            {s.publisher && <span className="text-text-tertiary"> - {s.publisher}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}
