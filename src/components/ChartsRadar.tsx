import { PlatformIcon } from "./PlatformIcons";
import { SectionDivider } from "./SectionDivider";
import chartsData from "@/content/charts.json";

interface ChartGame {
  appId: number;
  rank: number;
  lastWeekRank: number;
  steamRank: number;
  peak: number;
  name: string;
  image: string | null;
  url: string;
}

// Charts-Radar: die meistgespielten Steam-Spiele der Woche (Tim-Freigabe
// 09.08.2026, Skizze VORSCHAU-charts-radar). Datenquelle: src/content/
// charts.json — von pipeline/charts.mjs jeden Montag aktualisiert.
// Aufbau analog Release-/Deal-Radar: Top 3 als Artwork-Podium, Plätze 4-8
// als kompakte Liste, Trend = Steams eigener Wochenvergleich.
export function ChartsRadar() {
  const games = (chartsData.games as ChartGame[]) ?? [];
  if (games.length < 4) return null;

  const zahl = (n: number) => new Intl.NumberFormat("de-CH").format(n);

  // Trend aus Steams Wochenvergleich: 0 = letzte Woche nicht in den Charts.
  const trend = (g: ChartGame) => {
    if (!g.lastWeekRank) return <span className="text-xs font-bold text-warning">NEU</span>;
    const delta = g.lastWeekRank - g.steamRank;
    if (delta > 0) return <span className="text-xs font-bold text-accent">▲ {delta}</span>;
    if (delta < 0) return <span className="text-xs font-bold text-error">▼ {-delta}</span>;
    return <span className="text-xs font-bold text-text-tertiary">—</span>;
  };

  const podium = games.slice(0, 3);
  const liste = games.slice(3, 8);

  return (
    <section aria-labelledby="charts-heading" className="py-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="charts-heading" className="text-[20px] font-semibold tracking-tight text-text-primary">
          Charts-Radar
        </h2>
      </div>
      <SectionDivider />
      <div className="grid gap-4 sm:grid-cols-3">
        {podium.map((g) => (
          <a
            key={g.appId}
            href={g.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group min-w-0 overflow-hidden rounded-2xl border border-border-subtle bg-surface-card transition-all duration-300 hover:bg-surface-hover"
          >
            {g.image && (
              <div className="relative h-24 w-full overflow-hidden border-b border-border-subtle sm:h-28">
                {/* Rang als Navy-Chip statt Schattenzahl (Tim, 15.08.2026):
                    gleiche Sprache wie die Zahlen-Kacheln — Navy-Flaeche,
                    Cyan-Zahl, kein Schlagschatten. */}
                <span className="absolute left-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-lg font-black text-accent">
                  {g.rank}
                </span>
                {/* Steam-Artwork vom offiziellen CDN — plain <img> wie im
                    Deal-Radar, damit keine next/image-Allowlist nötig ist. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
            <div className="relative p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {g.name}
                </p>
                <span className="mt-0.5 shrink-0">{trend(g)}</span>
              </div>
              <p className="mt-1 pl-9 text-xs text-text-tertiary">
                Spitze diese Woche: <span className="font-semibold text-text-secondary">{zahl(g.peak)}</span> Spieler
              </p>
            </div>
          </a>
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
        {liste.map((g, i) => (
          <a
            key={g.appId}
            href={g.url}
            target="_blank"
            rel="noreferrer noopener"
            className={`group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-hover ${i > 0 ? "border-t border-border-subtle" : ""}`}
          >
            <span className="w-6 text-[15px] font-bold text-text-tertiary">{g.rank}</span>
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors">
              {g.name}
            </p>
            <span className="text-sm tabular-nums text-text-secondary">
              {zahl(g.peak)}
              <span className="ml-1.5 hidden text-[10px] font-semibold uppercase tracking-wide text-text-tertiary sm:inline">
                Spitze
              </span>
            </span>
            <span className="w-10 text-right">{trend(g)}</span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-text-tertiary">
        Quelle: Steam · Spielerzahlen = höchster gleichzeitiger Wert der Woche · Trend im Vergleich
        zur Vorwoche
      </p>
    </section>
  );
}
