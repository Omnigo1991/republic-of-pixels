// Kuratierte Quellen der News-Pipeline, nach Verlässlichkeit gewichtet.
// weight: Multiplikator im Relevanz-Scoring (1 = neutral).
// Bilder: Feed-Bild bzw. og:image der Quelle wird mit Bildnachweis übernommen
// (Betreiber-Entscheidung 04.08.2026, siehe pipeline/lib/images.mjs).
export const FEEDS = [
  // Englischsprachige Primärquellen (schnell, verlässlich, breit)
  { id: "ign", name: "IGN", url: "https://feeds.ign.com/ign/games-all", lang: "en", weight: 1.0 },
  { id: "eurogamer", name: "Eurogamer", url: "https://www.eurogamer.net/feed", lang: "en", weight: 1.1 },
  { id: "vgc", name: "VGC", url: "https://www.videogameschronicle.com/feed/", lang: "en", weight: 1.2 },
  { id: "gematsu", name: "Gematsu", url: "https://www.gematsu.com/feed", lang: "en", weight: 1.1 },
  { id: "pcgamer", name: "PC Gamer", url: "https://www.pcgamer.com/rss/", lang: "en", weight: 0.9 },
  { id: "insidergaming", name: "Insider Gaming", url: "https://insider-gaming.com/feed/", lang: "en", weight: 1.0 },
  { id: "nintendolife", name: "Nintendo Life", url: "https://www.nintendolife.com/feeds/latest", lang: "en", weight: 0.9 },
  { id: "pushsquare", name: "Push Square", url: "https://www.pushsquare.com/feeds/latest", lang: "en", weight: 0.9 },
  { id: "purexbox", name: "Pure Xbox", url: "https://www.purexbox.com/feeds/latest", lang: "en", weight: 0.9 },
  // Deutschsprachige Quellen (Markt- und Themennähe)
  { id: "gamestar", name: "GameStar", url: "https://www.gamestar.de/news/rss/news.rss", lang: "de", weight: 1.0 },
  { id: "play3", name: "play3.de", url: "https://www.play3.de/feed/", lang: "de", weight: 0.9 },
  // GamePro blockt Bot-Abrufe serverseitig (HTTP 403, geprüft 04.08.2026) — entfernt.
];
