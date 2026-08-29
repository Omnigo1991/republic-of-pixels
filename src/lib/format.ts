// Zeitzone IMMER explizit (08.08.2026): Der Vercel-Server rendert in UTC -
// ohne timeZone standen auf statisch gebauten Seiten UTC-Zeiten (2 Std.
// falsch), und in Client-Komponenten entstanden Hydration-Fehler, weil der
// Browser die Zeiten in Lokalzeit neu berechnete. Redaktionszeit ist
// Europe/Zurich - für alle Besucher einheitlich.
const ZEITZONE = "Europe/Zurich";

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: ZEITZONE,
  }).format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: ZEITZONE,
  }).format(d);
  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZEITZONE,
  }).format(d);
  return `${date} · ${time} Uhr`;
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - d;
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "gerade eben";
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.round(diffH / 24);
  return `vor ${diffD} Tag${diffD === 1 ? "" : "en"}`;
}

/**
 * Alter einer Meldung als kurze Angabe: "vor 20 Min.", "vor 3 Std.",
 * "gestern", "vor 2 Tagen", danach das Datum.
 *
 * WARUM NICHT formatRelative (Tim, 29.08.2026): Das gibt es zwar schon, ist
 * aber fürs Profil gebaut und rundet auf ganze Stunden - eine Meldung von vor
 * 20 Minuten hiesse dort "gerade eben", eine von vor 40 Minuten "vor 1 Std.".
 * Auf einer Nachrichtenstartseite ist genau diese erste Stunde die
 * interessanteste. Deshalb eine eigene Funktion, statt die bestehende
 * umzubauen und damit das Profil zu verändern.
 *
 * AB DREI TAGEN DAS DATUM: "vor 96 Stunden" hilft niemandem, und "vor 4
 * Tagen" ist auf einer Startseite ohnehin ein Signal, dass die Meldung nicht
 * mehr frisch ist. Dann ist das Datum die ehrlichere Angabe.
 */
export function zeitSeit(iso: string, jetzt: number = Date.now()): string {
  const min = Math.floor((jetzt - new Date(iso).getTime()) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const std = Math.floor(min / 60);
  if (std < 24) return `vor ${std} Std.`;
  const tage = Math.floor(std / 24);
  if (tage === 1) return "gestern";
  if (tage < 3) return `vor ${tage} Tagen`;
  return kurzDatum(iso);
}

/**
 * "29. Aug" - die Fassung, die der Server ausliefert.
 *
 * Sie ist bewusst NICHT relativ: Die Startseite wird zwar bei jedem Aufruf
 * gerendert, Vercel legt die Antwort aber bis zu 20 Minuten in den
 * Zwischenspeicher. Eine servergerechnete Minutenangabe wäre dann schlicht
 * falsch. Das Datum stimmt immer, und der Browser ersetzt es nach dem Laden
 * durch die genaue Angabe (siehe components/next/Zeitangabe.tsx).
 */
export function kurzDatum(iso: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "short",
    timeZone: ZEITZONE,
  }).format(new Date(iso));
}

// Zerlegt einen Artikeltitel in Kicker (Themenzeile, play3-Stil) und Headline:
// "Final Fantasy VII Revelation: Hamaguchi bekräftigt …" →
// Kicker "Final Fantasy VII Revelation", Headline "Hamaguchi bekräftigt …".
// Ohne Doppelpunkt dient der erste Tag als Themenzeile.
export function splitTitle(
  title: string,
  tags?: string[]
): { kicker: string | null; headline: string } {
  const idx = title.indexOf(": ");
  if (idx > 2 && idx < 60) {
    return { kicker: title.slice(0, idx), headline: title.slice(idx + 2) };
  }
  return { kicker: tags?.[0] ?? null, headline: title };
}
