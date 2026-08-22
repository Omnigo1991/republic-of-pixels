import Link from "next/link";
import type { Article } from "@/lib/types";
import { GLAS } from "./Bausteine";
import { NewsletterKachel } from "./SchlussKacheln";
import charts from "@/content/charts.json";
import deals from "@/content/deals.json";
import releases from "@/content/releases.json";
import events from "@/content/events.json";

// Radare im Entwurfs-Aufbau (Tim, 22.08.2026: "genau so wie der Entwurf"):
// links die Charts als Balken, rechts Release- und Wertungs-Radar
// gestapelt, darunter der Deal-Radar in eigener Box.

type ChartsEintrag = { rank: number; name: string; peak: number };
type DealEintrag = { title: string; discountPercent: number; finalPrice: number; url?: string };
type ReleaseEintrag = { title: string; date: string };
type EventEintrag = { name: string; status?: string; dateStart?: string; dateLabel?: string };

const KARTE = `${GLAS} rounded-[22px] p-6 sm:p-7`;

function Kopf({ titel, rechts }: { titel: string; rechts?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="text-[19px] font-bold text-[#F2F8FF] sm:text-[21px]">{titel}</div>
      {rechts && <div className="hidden text-[12px] text-[#86868b] sm:block">{rechts}</div>}
    </div>
  );
}

/** Fachpresse-Urteil als Ring - gespeist aus unseren echten Tests. */
function WertungsRing({ wert, farbe }: { wert: number; farbe: string }) {
  return (
    <div
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${farbe} ${wert * 3.6}deg, #2c2c3e 0deg)` }}
    >
      <span className="absolute inset-[4px] grid place-items-center rounded-full bg-[#191731] text-[14px] font-bold" style={{ color: farbe }}>
        {wert}
      </span>
    </div>
  );
}

const URTEIL_WERT: Record<string, { wert: number; farbe: string }> = {
  "Klare Empfehlung": { wert: 88, farbe: "#4CC98A" },
  Empfehlenswert: { wert: 78, farbe: "#4CC98A" },
  "Mit Abstrichen": { wert: 66, farbe: "#FF6BC0" },
  Durchwachsen: { wert: 58, farbe: "#D9756F" },
  Enttäuschend: { wert: 42, farbe: "#D9756F" },
};

export function RadarBento({ getestete }: { getestete: Article[] }) {
  const top = ((charts as { games?: ChartsEintrag[] }).games ?? []).slice(0, 5);
  const maxSpieler = top[0]?.peak || 1;
  const dealListe = ((deals as { deals?: DealEintrag[] }).deals ?? []).slice(0, 3);
  const heute = new Date().toISOString().slice(0, 10);
  const termine = (((events as { events?: EventEintrag[] }).events) ?? [])
    .filter((e) => !e.dateStart || e.dateStart >= heute)
    .slice(0, 6);
  const naechste = ((releases as ReleaseEintrag[]) ?? [])
    .filter((r) => new Date(r.date).getTime() >= Date.now() - 86400000)
    .slice(0, 3);

  return (
    <div className="flaechen-glas mt-8">
      {/* Event-Radar wie im Entwurf: Termine zweispaltig, Geruechte
          tragen einen Magenta-Chip. */}
      {termine.length > 0 && (
        <div className={`${KARTE} mb-4`}>
          <Kopf titel="Event-Radar" rechts="Messen, Shows und Termine" />
          <div className="grid gap-3 sm:grid-cols-2">
            {termine.map((e) => (
              <div key={e.name} className="flex items-center gap-3.5 rounded-[14px] bg-white/[0.06] px-4 py-3.5">
                <span className="shrink-0 whitespace-nowrap text-[11px] font-extrabold tracking-[0.03em] text-accent">
                  {(e.dateLabel ?? e.dateStart ?? "").replace(/\s*\((Gerücht|erwartet)\)\s*$/i, "")}
                </span>
                <span className="text-[14.5px] font-semibold text-[#F2F8FF]">{e.name}</span>
                {(e.status === "geruecht" || e.status === "erwartet") && (
                  <span className="ml-auto shrink-0 rounded-full border border-magenta/40 bg-magenta/[0.16] px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#FF6BC0]">
                    {e.status === "geruecht" ? "Gerücht" : "Erwartet"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Charts als Balken */}
        <div className={KARTE}>
          <Kopf titel="Charts-Radar" rechts="Steam · Spitze der Woche" />
          {top.map((e) => (
            <div key={e.rank} className="mb-4 last:mb-0">
              <div className="mb-1.5 flex justify-between text-[14px]">
                <span className="font-semibold text-[#F2F8FF]">
                  {e.rank} &nbsp; {e.name}
                </span>
                <span className="text-[#a1a1a6] [font-variant-numeric:tabular-nums]">
                  {e.peak.toLocaleString("de-CH").replace(/,/g, "'")}
                </span>
              </div>
              <div className="h-[9px] overflow-hidden rounded-[5px] bg-white/[0.08]">
                <div
                  className="h-full rounded-[5px] bg-[linear-gradient(90deg,rgba(2,240,209,0.84),rgba(255,46,151,0.84))]"
                  style={{ width: `${Math.round((e.peak / maxSpieler) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4">
          {/* Release-Radar */}
          <div className={KARTE}>
            <Kopf titel="Release-Radar" rechts="Die nächsten Termine" />
            <div className="grid gap-3 sm:grid-cols-3">
              {naechste.map((r) => {
                const d = new Date(r.date);
                return (
                  <div key={r.title} className="rounded-[16px] bg-white/[0.06] px-4 py-3.5">
                    <div className="text-[12px] font-bold text-accent">
                      {d.toLocaleDateString("de-CH", { day: "2-digit", month: "short", timeZone: "Europe/Zurich" })}
                    </div>
                    <div className="mt-1.5 text-[13.5px] font-semibold leading-[1.25] text-[#F2F8FF]">
                      {r.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wertungs-Radar aus unseren eigenen Tests */}
          {getestete.length > 0 && (
            <div className={KARTE}>
              <Kopf titel="Wertungs-Radar" rechts="Fachpresse, von uns gebündelt" />
              <div className="grid gap-3 sm:grid-cols-3">
                {getestete.slice(0, 3).map((a) => {
                  const u = URTEIL_WERT[a.review?.label ?? ""] ?? { wert: 70, farbe: "#FF6BC0" };
                  return (
                    <Link
                      key={a.slug}
                      href={`/artikel/${a.slug}`}
                      className="flex items-center gap-3 rounded-[16px] bg-white/[0.06] px-4 py-3.5"
                    >
                      <WertungsRing wert={u.wert} farbe={u.farbe} />
                      <span className="text-[13px] font-semibold leading-[1.25] text-[#F2F8FF]">
                        {a.tags?.[0] ?? a.title.split(" - ")[0]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deal-Radar neben dem Newsletter - Pixel-Raten ist vorerst raus */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
      {dealListe.length > 0 && (
        <div className={KARTE}>
          <Kopf titel="Deal-Radar" rechts="Steam · echte Rabatte, keine Fake-Streichpreise" />
          <div className="grid gap-3 sm:grid-cols-3">
            {dealListe.map((d) => (
              <a
                key={d.title}
                href={d.url ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-[16px] bg-white/[0.06] px-4 py-3.5"
              >
                <span className="block truncate text-[14.5px] font-semibold text-[#F2F8FF]">{d.title}</span>
                <span className="mt-1.5 flex items-baseline gap-2.5">
                  <span className="text-[17px] font-bold text-[#F2F8FF]">
                    {(d.finalPrice / 100).toFixed(2).replace(".", ",")} €
                  </span>
                  <span className="text-[13px] font-semibold text-[#FF6BC0]">-{d.discountPercent}%</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
        <NewsletterKachel />
      </div>
    </div>
  );
}
