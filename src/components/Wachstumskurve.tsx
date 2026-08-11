"use client";

import { useId, useState } from "react";

// Wachstumskurve fürs Redaktions-Cockpit (Tim, 11.08.2026).
//
// WARUM: Für ein Werbegespräch ist die wichtigste Grafik eine Linie, die nach
// oben zeigt. Das Cockpit zeigte bisher nur Momentaufnahmen (heute, 7 Tage,
// 30 Tage) — daraus liest niemand eine Entwicklung. Die Tagesdaten lagen
// bereits in page_views, sie wurden nur nie ausgewertet.
//
// Bewusst als eigenes SVG statt mit einer Diagramm-Bibliothek: Wir brauchen
// genau eine Kurvenart, dafür lohnt kein zusätzliches Paket im Seitengewicht
// — und so sitzen Cyan, Kurvenform und Typografie exakt in unserer Sprache.

export interface Tageswert {
  tag: string; // ISO-Datum (YYYY-MM-DD)
  aufrufe: number;
  besucher: number;
}

const BREITE = 760;
const HOEHE = 260;
const RAND = { oben: 24, rechts: 16, unten: 34, links: 46 };

function pfad(werte: number[], maxWert: number, flaeche: boolean) {
  const innenB = BREITE - RAND.links - RAND.rechts;
  const innenH = HOEHE - RAND.oben - RAND.unten;
  const schritt = werte.length > 1 ? innenB / (werte.length - 1) : 0;
  const x = (i: number) => RAND.links + i * schritt;
  const y = (v: number) => RAND.oben + innenH - (maxWert > 0 ? (v / maxWert) * innenH : 0);

  // Sanfte Kurve statt harter Ecken: horizontale Kontrollpunkte auf halber
  // Strecke — ergibt einen ruhigen Verlauf ohne über die Datenpunkte
  // hinauszuschiessen (was bei echten Zahlen irreführend wäre).
  let d = `M ${x(0)} ${y(werte[0] ?? 0)}`;
  for (let i = 1; i < werte.length; i++) {
    const xa = x(i - 1);
    const xb = x(i);
    const mitte = (xa + xb) / 2;
    d += ` C ${mitte} ${y(werte[i - 1])}, ${mitte} ${y(werte[i])}, ${xb} ${y(werte[i])}`;
  }
  if (flaeche) {
    d += ` L ${x(werte.length - 1)} ${RAND.oben + innenH} L ${x(0)} ${RAND.oben + innenH} Z`;
  }
  return d;
}

function kurzDatum(iso: string) {
  const [, m, t] = iso.split("-");
  return `${t}.${m}.`;
}

export function Wachstumskurve({ daten }: { daten: Tageswert[] }) {
  const id = useId();
  const [aktiv, setAktiv] = useState<number | null>(null);

  if (daten.length < 2) {
    return (
      <p className="rounded-2xl border border-border-subtle bg-surface-card p-5 text-sm text-text-tertiary">
        Noch zu wenig Daten für eine Kurve — ab dem zweiten Tag erscheint sie hier.
      </p>
    );
  }

  const aufrufe = daten.map((d) => d.aufrufe);
  const besucher = daten.map((d) => d.besucher);
  const maxWert = Math.max(1, ...aufrufe);
  const innenB = BREITE - RAND.links - RAND.rechts;
  const innenH = HOEHE - RAND.oben - RAND.unten;
  const schritt = innenB / (daten.length - 1);

  // Gitterlinien auf runden Werten statt auf Bruchteilen des Maximums.
  const stufe = Math.max(1, Math.ceil(maxWert / 4 / 10) * 10);
  const linien: number[] = [];
  for (let v = 0; v <= maxWert; v += stufe) linien.push(v);

  const summeAufrufe = aufrufe.reduce((s, v) => s + v, 0);
  const ersteHaelfte = aufrufe.slice(0, Math.floor(aufrufe.length / 2)).reduce((s, v) => s + v, 0);
  const zweiteHaelfte = aufrufe.slice(Math.floor(aufrufe.length / 2)).reduce((s, v) => s + v, 0);
  const trend =
    ersteHaelfte > 0 ? Math.round(((zweiteHaelfte - ersteHaelfte) / ersteHaelfte) * 100) : null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Aufrufe
          </span>
          <span className="inline-flex items-center gap-1.5 text-text-tertiary">
            <span className="h-2 w-2 rounded-full bg-text-tertiary" />
            Besucher
          </span>
        </div>
        {trend !== null && (
          <span className="text-xs text-text-tertiary">
            zweite Hälfte des Zeitraums{" "}
            <span className={trend >= 0 ? "font-semibold text-accent" : "font-semibold text-error"}>
              {trend >= 0 ? "+" : ""}
              {trend} %
            </span>{" "}
            gegenüber der ersten
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${BREITE} ${HOEHE}`}
        className="w-full"
        role="img"
        aria-label={`Verlauf der Aufrufe über ${daten.length} Tage, insgesamt ${summeAufrufe}`}
        onMouseLeave={() => setAktiv(null)}
      >
        <defs>
          <linearGradient id={`${id}-flaeche`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#02F0D1" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#02F0D1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {linien.map((v) => {
          const y = RAND.oben + innenH - (v / maxWert) * innenH;
          return (
            <g key={v}>
              <line
                x1={RAND.links}
                x2={BREITE - RAND.rechts}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-border-subtle"
                strokeWidth="1"
              />
              <text
                x={RAND.links - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-text-tertiary"
                style={{ fontSize: 11 }}
              >
                {v}
              </text>
            </g>
          );
        })}

        <path d={pfad(aufrufe, maxWert, true)} fill={`url(#${id}-flaeche)`} />
        <path
          d={pfad(besucher, maxWert, false)}
          fill="none"
          stroke="currentColor"
          className="text-text-tertiary"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <path
          d={pfad(aufrufe, maxWert, false)}
          fill="none"
          stroke="#02F0D1"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {daten.map((d, i) => {
          const x = RAND.links + i * schritt;
          const y = RAND.oben + innenH - (d.aufrufe / maxWert) * innenH;
          const zeigen = aktiv === i;
          return (
            <g key={d.tag}>
              {zeigen && (
                <>
                  <line
                    x1={x}
                    x2={x}
                    y1={RAND.oben}
                    y2={RAND.oben + innenH}
                    stroke="#02F0D1"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                  <circle cx={x} cy={y} r="5" fill="#02F0D1" />
                  <text
                    x={Math.min(Math.max(x, RAND.links + 46), BREITE - RAND.rechts - 46)}
                    y={Math.max(RAND.oben + 12, y - 14)}
                    textAnchor="middle"
                    className="fill-text-primary"
                    style={{ fontSize: 12, fontWeight: 700 }}
                  >
                    {d.aufrufe} Aufrufe · {d.besucher} Besucher
                  </text>
                </>
              )}
              {/* Grosszügige Trefferfläche, damit es auch mit dem Finger geht */}
              <rect
                x={x - schritt / 2}
                y={RAND.oben}
                width={schritt}
                height={innenH}
                fill="transparent"
                onMouseEnter={() => setAktiv(i)}
                onTouchStart={() => setAktiv(i)}
              />
            </g>
          );
        })}

        {daten.map((d, i) => {
          // Auf Mobile wären 30 Datumsangaben Brei — nur Anfang, Mitte, Ende.
          const zeigen = i === 0 || i === daten.length - 1 || i === Math.floor(daten.length / 2);
          if (!zeigen) return null;
          const x = RAND.links + i * schritt;
          return (
            <text
              key={d.tag}
              x={x}
              y={HOEHE - 12}
              textAnchor={i === 0 ? "start" : i === daten.length - 1 ? "end" : "middle"}
              className="fill-text-tertiary"
              style={{ fontSize: 11 }}
            >
              {kurzDatum(d.tag)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
