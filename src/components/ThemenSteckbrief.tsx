import steckbriefe from "@/content/themen-steckbriefe.json";

// Themen-Steckbrief (Tim, 21.08.2026, Vorbild GameStar): Die wichtigsten
// Fakten zum Thema als Kopf der Themenseite - macht die Seite zum
// Nachschlagewerk statt zur blossen Artikelliste. Gepflegt in
// themen-steckbriefe.json; NUR Fakten eintragen, die durch unsere
// Artikel oder offizielle Quellen belegt sind (Faktentreue-Regel).
// Themen ohne Eintrag zeigen schlicht keinen Steckbrief.

interface Steckbrief {
  fakten: { k: string; v: string }[];
}

export function ThemenSteckbrief({ slug }: { slug: string }) {
  const eintrag = (steckbriefe as Record<string, Steckbrief>)[slug];
  if (!eintrag || eintrag.fakten.length === 0) return null;
  return (
    <div className="mt-6 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-border-subtle bg-surface-card p-6 sm:grid-cols-4">
      {eintrag.fakten.map((f) => (
        <div key={f.k}>
          <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-accent">
            {f.k}
          </div>
          <div className="text-[15px] font-bold leading-snug text-text-primary">{f.v}</div>
        </div>
      ))}
    </div>
  );
}
