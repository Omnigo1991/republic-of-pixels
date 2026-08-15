export type Category = "breaking" | "news" | "leaks" | "reviews" | "guides";
export type Platform = "pc" | "playstation" | "xbox" | "nintendo";
export type HeroVariant = "circuit" | "controller" | "particles" | "waveform" | "grid";
export type ReviewLabel =
  | "Essenziell"
  | "Klare Empfehlung"
  | "Empfehlenswert"
  | "Für den Sale vormerken"
  | "Nicht empfohlen";

export interface Source {
  title: string;
  url: string;
  publisher?: string;
}

export interface ArticleImage {
  /** Pfad unterhalb von public/, z. B. /images/articles/mein-artikel.webp */
  src: string;
  alt: string;
  /** Bildnachweis, z. B. "Bild: Sony Interactive Entertainment" */
  credit?: string;
  sourceUrl?: string;
}

export type EmbedPlatform = "twitter" | "reddit" | "youtube";

export type BodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "list"; items: string[] }
  | { type: "embed"; platform: EmbedPlatform; url: string }
  // Zahlen-Kacheln (Artikel-Bauplan 08.08.2026): die 2–3 stärksten Zahlen
  // der Story als visuelle Kacheln nach dem Einstieg.
  | { type: "stats"; items: { value: string; label: string }[] };

// Community-Umfrage zur Story (fester Bauplan-Bestandteil ab 08.08.2026).
export interface Poll {
  question: string;
  options: string[];
}

export interface Review {
  label: ReviewLabel;
  strengths: string[];
  weaknesses: string[];
  forWhom: string;
  verdict: string;
  recommendation: string;
}

export interface Article {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: Category;
  platforms: Platform[];
  isTopStory: boolean;
  popularityRank: number | null;
  author: string;
  publishedAt: string;
  readingTimeMinutes: number;
  heroVariant: HeroVariant;
  /** Echtes Artikelbild; ohne Bild greift PlaceholderArt (heroVariant). */
  image?: ArticleImage | null;
  /** Optionale SEO-Overrides; Fallback: title bzw. excerpt. */
  seoTitle?: string;
  metaDescription?: string;
  isLeakOrRumor: boolean;
  tags: string[];
  tldr: string[];
  whyItMatters: string;
  body: BodyBlock[];
  sources: Source[];
  review: Review | null;
  /** Community-Umfrage zur Story (Artikel ab 08.08.2026; ältere ohne). */
  poll?: Poll | null;
  relatedSlugs?: string[];
}

export const CATEGORY_LABELS: Record<Category, string> = {
  breaking: "Breaking",
  news: "News",
  leaks: "Leaks",
  reviews: "Reviews",
  // Einzahl mit Absicht: Das Abzeichen am Artikel soll "GUIDE" lauten,
  // nicht "GUIDES" — es beschreibt diesen einen Artikel.
  guides: "Guide",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  pc: "PC",
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo",
};

export const REVIEW_LABEL_META: Record<
  ReviewLabel,
  { tone: "success" | "accent" | "warning" | "error"; description: string }
> = {
  Essenziell: {
    tone: "success",
    description: "Eines der besten Spiele der Saison – uneingeschränkte Empfehlung.",
  },
  "Klare Empfehlung": {
    tone: "accent",
    description: "Hochwertig mit kleinen Schwächen – für Fans des Genres ein Muss.",
  },
  Empfehlenswert: {
    tone: "accent",
    description: "Solide Erfahrung, aber keine Priorität für jedes Budget.",
  },
  "Für den Sale vormerken": {
    tone: "warning",
    description: "Potenzial vorhanden, aktuell aber zu teuer, zu unfertig oder zu durchwachsen für den Vollpreis.",
  },
  "Nicht empfohlen": {
    tone: "error",
    description: "Die Mängel überwiegen deutlich.",
  },
};
