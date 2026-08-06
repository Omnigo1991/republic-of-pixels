// Strenge Validierung generierter Artikel, bevor irgendetwas committet wird.
// Ein Artikel, der hier durchfällt, wird verworfen (Lauf bricht nicht ab).
const CATEGORIES = ["breaking", "news", "leaks", "reviews"];
const PLATFORMS = ["pc", "playstation", "xbox", "nintendo"];
const HERO_VARIANTS = ["circuit", "controller", "particles", "waveform", "grid"];
const BLOCK_TYPES = ["paragraph", "heading", "quote", "list", "embed"];
const REVIEW_LABELS = [
  "Essenziell",
  "Klare Empfehlung",
  "Empfehlenswert",
  "Für den Sale vormerken",
  "Nicht empfohlen",
];

export function validateArticle(a, existingSlugs) {
  const errors = [];
  const need = (cond, msg) => {
    if (!cond) errors.push(msg);
  };

  need(typeof a.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug), "slug fehlt oder ist kein kebab-case");
  need(!existingSlugs.has(a.slug), `slug "${a.slug}" existiert bereits`);
  need(typeof a.title === "string" && a.title.length >= 15 && a.title.length <= 120, "title fehlt oder Länge ausserhalb 15–120");
  need(typeof a.subtitle === "string" && a.subtitle.length >= 20, "subtitle fehlt/zu kurz");
  need(typeof a.excerpt === "string" && a.excerpt.length >= 50 && a.excerpt.length <= 320, "excerpt fehlt oder Länge ausserhalb 50–320");
  need(CATEGORIES.includes(a.category), `category ungültig: ${a.category}`);
  need(Array.isArray(a.platforms) && a.platforms.length > 0 && a.platforms.every((p) => PLATFORMS.includes(p)), "platforms ungültig");
  need(a.isTopStory === false, "isTopStory muss von der Pipeline auf false stehen");
  need(a.popularityRank === null, "popularityRank muss null sein");
  need(typeof a.author === "string" && a.author.length > 0, "author fehlt");
  need(!Number.isNaN(new Date(a.publishedAt).getTime()), "publishedAt ist kein Datum");
  need(Number.isInteger(a.readingTimeMinutes) && a.readingTimeMinutes >= 1 && a.readingTimeMinutes <= 30, "readingTimeMinutes unplausibel");
  need(HERO_VARIANTS.includes(a.heroVariant), "heroVariant ungültig");
  need(typeof a.isLeakOrRumor === "boolean", "isLeakOrRumor fehlt");
  need(Array.isArray(a.tags) && a.tags.length >= 2 && a.tags.length <= 8, "tags: 2–8 erforderlich");
  need(Array.isArray(a.tldr) && a.tldr.length >= 2 && a.tldr.length <= 5, "tldr: 2–5 Punkte erforderlich");
  need(typeof a.whyItMatters === "string" && a.whyItMatters.length >= 50, "whyItMatters fehlt/zu kurz");
  need(Array.isArray(a.body) && a.body.length >= 4, "body: mindestens 4 Blöcke");
  if (Array.isArray(a.body)) {
    for (const [i, b] of a.body.entries()) {
      need(BLOCK_TYPES.includes(b?.type), `body[${i}]: type ungültig`);
      if (b?.type === "list") need(Array.isArray(b.items) && b.items.length > 0, `body[${i}]: list ohne items`);
      else need(typeof b?.text === "string" && b.text.length > 0, `body[${i}]: text fehlt`);
    }
  }
  need(Array.isArray(a.sources) && a.sources.length >= 1 && a.sources.every((s) => s?.title && /^https?:\/\//.test(s?.url ?? "")), "sources: mindestens eine gültige Quelle mit URL");
  if (a.category === "reviews") {
    const r = a.review;
    need(
      !!r &&
        REVIEW_LABELS.includes(r.label) &&
        Array.isArray(r.strengths) &&
        r.strengths.length >= 2 &&
        Array.isArray(r.weaknesses) &&
        r.weaknesses.length >= 1 &&
        typeof r.forWhom === "string" &&
        r.forWhom.length >= 15 &&
        typeof r.verdict === "string" &&
        r.verdict.length >= 50 &&
        typeof r.recommendation === "string" &&
        r.recommendation.length >= 10,
      "review: bei category=reviews vollständig erforderlich (label/strengths/weaknesses/forWhom/verdict/recommendation)"
    );
  } else {
    need(a.review === null, "review muss null sein ausser bei category=reviews");
  }
  if (a.seoTitle !== undefined) need(typeof a.seoTitle === "string" && a.seoTitle.length <= 70, "seoTitle zu lang (>70)");
  if (a.metaDescription !== undefined) need(typeof a.metaDescription === "string" && a.metaDescription.length <= 165, "metaDescription zu lang (>165)");

  const wordCount = (Array.isArray(a.body) ? a.body : [])
    .map((b) => (b.type === "list" ? (b.items ?? []).join(" ") : b.text ?? ""))
    .join(" ")
    .split(/\s+/).length;
  need(wordCount >= 250, `Artikel zu kurz (${wordCount} Wörter, min. 250)`);

  return { ok: errors.length === 0, errors, wordCount };
}
