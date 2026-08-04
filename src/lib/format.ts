export function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
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
