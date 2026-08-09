import Link from "next/link";
import { SectionDivider } from "./SectionDivider";
import eventsData from "@/content/events.json";
import { getThema } from "@/lib/themen";

type EventStatus = "fixiert" | "erwartet" | "geruecht";

interface RadarEvent {
  name: string;
  status: EventStatus;
  hero?: boolean;
  dateStart: string | null;
  dateEnd: string | null;
  dateLabel: string;
  beschreibung: string;
  thema?: string;
}

// Event-Radar: Messen, Showcases und Directs mit Countdown und Status
// (Tim-Freigabe 09.08.2026, Skizze VORSCHAU-event-radar). Datenquelle:
// src/content/events.json, redaktionell gepflegt; vergangene Events fallen
// über dateEnd automatisch raus.
// Status-Pills tragen EXAKT die CategoryPill-Rezeptur aus Badges.tsx
// (Tims Konsistenz-Vorgabe 09.08.2026: eine Pillen-Bauart auf der ganzen
// Seite). Töne: FIXIERT = Accent wie Breaking, ERWARTET = neutral wie
// News, GERÜCHT = Warning wie die Leaks-Pille (gleiche Bedeutung).
const PILL_REZEPT =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide";
const PILL: Record<EventStatus, { label: string; klasse: string }> = {
  fixiert: { label: "FIXIERT", klasse: "text-accent border-accent/40 bg-accent/10" },
  erwartet: { label: "ERWARTET", klasse: "text-text-secondary border-border-default bg-text-primary/[0.03]" },
  geruecht: { label: "GERÜCHT", klasse: "text-warning border-warning/40 bg-warning/10" },
};

// Kalendertag-Differenz in Zürich (UTC-Mitternacht-Fallen vermeiden —
// Lektion aus dem Zeitzonen-Bug vom 08.08.2026).
function tageBis(iso: string): number {
  const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());
  return Math.round(
    (new Date(iso + "T12:00:00Z").getTime() - new Date(heute + "T12:00:00Z").getTime()) / 86400000
  );
}

export function EventRadar() {
  const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());
  const events = (eventsData.events as RadarEvent[]).filter(
    (e) => !e.dateEnd || e.dateEnd >= heute
  );
  if (events.length === 0) return null;

  const hero =
    events.find((e) => e.hero && e.dateStart && e.dateStart >= heute) ??
    events.find((e) => e.status === "fixiert" && e.dateStart && e.dateStart >= heute);
  const karten = events.filter((e) => e !== hero).slice(0, 6);
  const countdown = hero?.dateStart ? tageBis(hero.dateStart) : null;
  const heroHub = hero?.thema ? getThema(hero.thema) : undefined;

  const pill = (status: EventStatus) => (
    <span className={`${PILL_REZEPT} ${PILL[status].klasse}`}>{PILL[status].label}</span>
  );

  return (
    <section aria-labelledby="events-heading" className="py-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="events-heading" className="text-xl font-semibold tracking-tight text-text-primary">
          Event-Radar
        </h2>
        <span className="text-xs text-text-tertiary">Die nächsten grossen Momente</span>
      </div>
      <SectionDivider />
      {hero && (
        <div className="mb-4 flex flex-col items-start gap-5 rounded-2xl border border-accent/30 bg-accent/[0.05] p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-6">
          {countdown !== null && (
            <div className="shrink-0 text-center sm:min-w-[130px]">
              <div className="text-5xl font-bold leading-none tracking-tight text-accent">
                {countdown === 0 ? "Heute" : countdown}
              </div>
              <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                {countdown === 0 ? "Es geht los" : countdown === 1 ? "Tag bis zum Start" : "Tage bis zum Start"}
              </div>
            </div>
          )}
          <div className="min-w-0">
            <span className={`${PILL_REZEPT} text-accent border-accent/40 bg-accent/10`}>
              NÄCHSTES EVENT
            </span>
            <p className="mt-2.5 text-2xl font-semibold tracking-tight text-text-primary">
              {hero.name}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{hero.dateLabel}</span> ·{" "}
              {hero.beschreibung}
            </p>
            {heroHub && (
              <Link
                href={`/thema/${heroHub.slug}`}
                className="mt-2.5 inline-block text-sm font-semibold text-accent hover:underline"
              >
                Unsere {hero.name}-Berichterstattung →
              </Link>
            )}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {karten.map((e) => (
          <div
            key={e.name}
            className="flex h-full min-w-0 flex-col rounded-2xl border border-border-subtle bg-surface-card p-4 transition-all duration-300 hover:bg-surface-hover"
          >
            <p
              className={`text-[12px] font-bold uppercase tracking-wider ${e.status === "fixiert" ? "text-accent" : "text-text-tertiary"}`}
            >
              {e.dateLabel}
            </p>
            <p className="mt-1.5 text-[15px] font-semibold text-text-primary">{e.name}</p>
            <p className="mb-3.5 mt-1 flex-1 text-xs leading-relaxed text-text-tertiary">
              {e.beschreibung}
            </p>
            <div>{pill(e.status)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-text-tertiary">
        Status: FIXIERT = offiziell bestätigt · ERWARTET = Branchen-Routine ohne Termin · GERÜCHT =
        unbestätigte Berichte
      </p>
    </section>
  );
}
