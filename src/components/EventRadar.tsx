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

// Kalendertag-Differenz in Zürich (UTC-Mitternacht-Fallen vermeiden -
// Lektion aus dem Zeitzonen-Bug vom 08.08.2026).
function tageBis(iso: string): number {
  const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());
  return Math.round(
    (new Date(iso + "T12:00:00Z").getTime() - new Date(heute + "T12:00:00Z").getTime()) / 86400000
  );
}

export function EventRadar() {
  const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());
  // STATUS AUS DEN DATEN ABLEITEN (Tim, 12.08.2026): Der Status war ein
  // eigenes Feld, das man beim Eintragen eines bestätigten Termins vergessen
  // konnte - genau das war bei den Game Awards passiert: Termin am 11.08.
  // von Geoff Keighley bestätigt, bei uns stand weiter "ERWARTET". Ein
  // konkretes Startdatum IST die Bestätigung; steht eines da, gilt der
  // Termin als fixiert, egal was im Statusfeld steht. Damit kann die Pille
  // dem Datum nicht mehr widersprechen. "Gerücht" bleibt eine bewusste
  // redaktionelle Einschätzung und wird nicht überschrieben.
  const events = (eventsData.events as RadarEvent[])
    .filter((e) => !e.dateEnd || e.dateEnd >= heute)
    .map((e) =>
      e.dateStart && e.status !== "geruecht" ? { ...e, status: "fixiert" as const } : e
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
        <h2 id="events-heading" className="text-[20px] font-semibold tracking-tight text-text-primary">
          Event-Radar
        </h2>
      </div>
      <SectionDivider />
      {/* Grosse Event-Buehne links, Karten rechts (Tim, 15.08.2026 -
          das Layout aus dem abgenommenen Entwurf): Das naechste Event
          bekommt eine stehende Cyan-Flaeche mit grossem Navy-Countdown
          (Navy-Umbau 17.08.2026 - vorher umgekehrt). */}
      <div className={hero ? "grid gap-4 lg:grid-cols-[400px_1fr]" : ""}>
      {hero && (
        <div className="relative flex flex-col overflow-hidden rounded-2xl bg-accent p-6 sm:p-7">
          {/* Volle dunkle Pille mit Cyan-Schrift - dieselbe Loesung wie
              beim Anmelden-Knopf im Kopf (Tim, 19.08.2026). Die blosse
              Kontur ging auf dem Verlauf fast unter. */}
          <span className={`${PILL_REZEPT} self-start border-transparent bg-navy text-accent`}>
            NÄCHSTES EVENT
          </span>
          {countdown !== null && (
            <>
              <div className="mt-5 text-[68px] font-black leading-none tracking-tight text-navy sm:text-[76px]">
                {countdown === 0 ? "Heute" : countdown}
              </div>
              <div className="mt-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-navy/70">
                {countdown === 0 ? "Es geht los" : countdown === 1 ? "Tag bis zum Start" : "Tage bis zum Start"}
              </div>
            </>
          )}
          <p className="mt-6 text-[28px] font-black tracking-tight text-navy">
            {hero.name}
          </p>
          <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-navy/75">
            <span className="font-semibold text-navy">{hero.dateLabel}</span> ·{" "}
            {hero.beschreibung}
          </p>
          {heroHub && (
            <Link
              href={`/thema/${heroHub.slug}`}
              className="mt-3 inline-block text-sm font-semibold text-navy underline decoration-navy/40 underline-offset-4 hover:decoration-navy"
            >
              Unsere {hero.name}-Berichterstattung →
            </Link>
          )}
        </div>
      )}
      <div className="grid content-start gap-4 sm:grid-cols-2">
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
      </div>
      <p className="mt-3 text-[11px] text-text-tertiary">
        Status: FIXIERT = offiziell bestätigt · ERWARTET = Branchen-Routine ohne Termin · GERÜCHT =
        unbestätigte Berichte
      </p>
    </section>
  );
}
