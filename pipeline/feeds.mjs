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
  // Hardware & Konsolen-Ökosystem (05.08.2026: PS6-/Xbox-Helix-Leaks, GPUs, Handhelds)
  { id: "computerbase", name: "ComputerBase", url: "https://www.computerbase.de/rss/news.xml", lang: "de", weight: 0.9 },
  { id: "tomshardware", name: "Tom's Hardware", url: "https://www.tomshardware.com/feeds/all", lang: "en", weight: 0.9 },
  { id: "wccftech", name: "Wccftech", url: "https://wccftech.com/feed/", lang: "en", weight: 0.8 },
  // Reichweiten-Ausbau (05.08.2026 abends): die grossen internationalen und
  // deutschsprachigen Quellen für maximale Themenabdeckung.
  { id: "polygon", name: "Polygon", url: "https://www.polygon.com/rss/index.xml", lang: "en", weight: 1.0 },
  { id: "kotaku", name: "Kotaku", url: "https://kotaku.com/rss", lang: "en", weight: 0.9 },
  { id: "gamesradar", name: "GamesRadar", url: "https://www.gamesradar.com/feeds.xml", lang: "en", weight: 0.9 },
  { id: "rps", name: "Rock Paper Shotgun", url: "https://www.rockpapershotgun.com/feed", lang: "en", weight: 0.9 },
  { id: "vg247", name: "VG247", url: "https://www.vg247.com/feed", lang: "en", weight: 1.0 },
  { id: "gamespot", name: "GameSpot", url: "https://www.gamespot.com/feeds/game-news/", lang: "en", weight: 0.9 },
  { id: "gamesindustry", name: "GamesIndustry.biz", url: "https://www.gamesindustry.biz/feed", lang: "en", weight: 1.0 },
  { id: "eurogamer_de", name: "Eurogamer.de", url: "https://www.eurogamer.de/feed", lang: "de", weight: 1.0 },
  { id: "meinmmo", name: "MeinMMO", url: "https://mein-mmo.de/feed/", lang: "de", weight: 0.8 },
  { id: "golem_games", name: "Golem.de Games", url: "https://rss.golem.de/rss.php?tp=games&feed=RSS2.0", lang: "de", weight: 0.8 },
  { id: "destructoid", name: "Destructoid", url: "https://www.destructoid.com/feed/", lang: "en", weight: 0.7 },
  { id: "theverge_games", name: "The Verge Games", url: "https://www.theverge.com/rss/games/index.xml", lang: "en", weight: 0.9 },
];
