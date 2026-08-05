// Ranking-System der Community (Betreiber-Vorgabe 05.08.2026):
// Punkte belohnen Aktivität — Kommentare zählen 3, erhaltene Upvotes 2,
// vergebene Upvotes 1. Ränge werden als Badges verliehen.
// Der Master-Account (MASTER_NICKNAME) trägt den exklusiven REDAKTION-Badge
// und wird überall hervorgehoben.

export const MASTER_NICKNAME = "republicofpixels";

export function punkteBerechnen(stats: {
  kommentare: number;
  erhalteneVotes: number;
  vergebeneVotes: number;
}): number {
  return stats.kommentare * 3 + stats.erhalteneVotes * 2 + stats.vergebeneVotes;
}

export interface Rang {
  name: string;
  ab: number;
  /** Tailwind-Klassen für den Badge-Pill */
  klasse: string;
  beschreibung: string;
  /** Icon im Badge (Emoji; die Redaktion nutzt das R-Logo als Bild) */
  icon: string;
}

export const RAENGE: Rang[] = [
  {
    name: "Neuankömmling",
    ab: 0,
    icon: "🌱",
    klasse: "border-border-default text-text-secondary bg-text-primary/[0.04]",
    beschreibung: "Frisch in der Republic — willkommen!",
  },
  {
    name: "Bürger:in",
    ab: 10,
    icon: "🎮",
    klasse: "border-accent/40 text-accent bg-accent/10",
    beschreibung: "Aktives Mitglied der Republic of Pixels.",
  },
  {
    name: "Ratsmitglied",
    ab: 40,
    icon: "🛡️",
    klasse: "border-accent text-[#0F0D2C] bg-accent font-bold",
    beschreibung: "Prägt die Diskussionen sichtbar mit.",
  },
  {
    name: "Senator:in",
    ab: 120,
    icon: "🏛️",
    klasse: "border-warning/60 text-warning bg-warning/10 font-bold",
    beschreibung: "Eine tragende Stimme der Community.",
  },
  {
    name: "Pixel-Legende",
    ab: 300,
    icon: "👑",
    klasse:
      "border-transparent text-[#0F0D2C] bg-gradient-to-r from-accent via-[#7DF3E1] to-warning font-bold",
    beschreibung: "Der höchste Rang der Republic — legendär.",
  },
];

export const MASTER_RANG: Rang = {
  name: "REDAKTION",
  ab: 0,
  icon: "R",
  klasse: "border-accent bg-accent text-[#0F0D2C] font-black tracking-wide",
  beschreibung: "Offizieller Account der Republic-of-Pixels-Redaktion.",
};

export function rangFuer(punkte: number, nickname: string): Rang {
  if (nickname === MASTER_NICKNAME) return MASTER_RANG;
  let aktuell = RAENGE[0];
  for (const r of RAENGE) if (punkte >= r.ab) aktuell = r;
  return aktuell;
}

/** Nächster Rang + Fortschritt (für die Profilseite), null bei Maximalrang/Master. */
export function naechsterRang(punkte: number, nickname: string): { rang: Rang; fehlend: number } | null {
  if (nickname === MASTER_NICKNAME) return null;
  const next = RAENGE.find((r) => r.ab > punkte);
  return next ? { rang: next, fehlend: next.ab - punkte } : null;
}
