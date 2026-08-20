// Strenge Validierung generierter Artikel, bevor irgendetwas committet wird.
// Ein Artikel, der hier durchfällt, wird verworfen (Lauf bricht nicht ab).
const CATEGORIES = ["breaking", "news", "leaks", "reviews", "guides"];
const PLATFORMS = ["pc", "playstation", "xbox", "nintendo"];
const HERO_VARIANTS = ["circuit", "controller", "particles", "waveform", "grid"];
const BLOCK_TYPES = ["paragraph", "heading", "quote", "list", "embed", "stats"];
const REVIEW_LABELS = [
  "Essenziell",
  "Klare Empfehlung",
  "Empfehlenswert",
  "Für den Sale vormerken",
  "Nicht empfohlen",
];

// OBERGRENZEN JE NACHRICHTENWERT (Tim, 14.08.2026).
//
// Der Generierungs-Prompt verlangt gestaffelte Laengen - 400-500 Woerter bei
// einer Routinemeldung, 550-700 bei normalen News, 750-950 bei grossen
// Nachrichten. Geprueft wurde davon bisher nur die UNTERGRENZE, und die
// pauschal bei 350.
//
// Der Modellvergleich vom 14.08. hat gezeigt, wie wenig eine Prompt-Vorgabe
// allein wert ist: Bei "standard" (Soll 550-700) lieferte das kleinere
// Modell 368, 489 und 499 Woerter - dreimal deutlich zu wenig, und niemand
// hat es gemerkt. Genau unsere Hausregel: Eine Regel, die nur im Prompt
// steht, ist keine Regel.
//
// Die Obergrenze liegt bewusst 30 Prozent ueber dem Zielkorridor. Sie soll
// den Ausreisser abfangen - einen Artikel, der sich mit Wiederholungen
// aufblaeht -, nicht einen etwas ausfuehrlicheren guten Text verwerfen.
const LAENGE = {
  kurz: { von: 400, bis: 500 },
  standard: { von: 550, bis: 700 },
  lang: { von: 750, bis: 950 },
};
const OBERGRENZE_ZUSCHLAG = 1.3;

export function validateArticle(a, existingSlugs, depth) {
  const errors = [];
  const need = (cond, msg) => {
    if (!cond) errors.push(msg);
  };

  need(typeof a.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug), "slug fehlt oder ist kein kebab-case");
  need(!existingSlugs.has(a.slug), `slug "${a.slug}" existiert bereits`);
  need(typeof a.title === "string" && a.title.length >= 15 && a.title.length <= 120, "title fehlt oder Länge ausserhalb 15-120");
  need(typeof a.subtitle === "string" && a.subtitle.length >= 20, "subtitle fehlt/zu kurz");
  need(typeof a.excerpt === "string" && a.excerpt.length >= 50 && a.excerpt.length <= 320, "excerpt fehlt oder Länge ausserhalb 50-320");
  need(CATEGORIES.includes(a.category), `category ungültig: ${a.category}`);
  need(Array.isArray(a.platforms) && a.platforms.length > 0 && a.platforms.every((p) => PLATFORMS.includes(p)), "platforms ungültig");
  need(a.isTopStory === false, "isTopStory muss von der Pipeline auf false stehen");
  need(a.popularityRank === null, "popularityRank muss null sein");
  need(typeof a.author === "string" && a.author.length > 0, "author fehlt");
  need(!Number.isNaN(new Date(a.publishedAt).getTime()), "publishedAt ist kein Datum");
  need(Number.isInteger(a.readingTimeMinutes) && a.readingTimeMinutes >= 1 && a.readingTimeMinutes <= 30, "readingTimeMinutes unplausibel");
  need(HERO_VARIANTS.includes(a.heroVariant), "heroVariant ungültig");
  need(typeof a.isLeakOrRumor === "boolean", "isLeakOrRumor fehlt");
  need(Array.isArray(a.tags) && a.tags.length >= 2 && a.tags.length <= 8, "tags: 2-8 erforderlich");
  need(Array.isArray(a.tldr) && a.tldr.length >= 2 && a.tldr.length <= 5, "tldr: 2-5 Punkte erforderlich");
  need(typeof a.whyItMatters === "string" && a.whyItMatters.length >= 50, "whyItMatters fehlt/zu kurz");
  if (a.poll != null) {
    need(
      typeof a.poll.question === "string" &&
        a.poll.question.length >= 10 &&
        Array.isArray(a.poll.options) &&
        a.poll.options.length >= 2 &&
        a.poll.options.length <= 4 &&
        a.poll.options.every((o) => typeof o === "string" && o.length > 0),
      "poll: question + 2-4 options nötig"
    );
  }
  need(Array.isArray(a.body) && a.body.length >= 4, "body: mindestens 4 Blöcke");
  if (Array.isArray(a.body)) {
    for (const [i, b] of a.body.entries()) {
      need(BLOCK_TYPES.includes(b?.type), `body[${i}]: type ungültig`);
      if (b?.type === "list") need(Array.isArray(b.items) && b.items.length > 0, `body[${i}]: list ohne items`);
      else if (b?.type === "stats")
        need(
          Array.isArray(b.items) &&
            b.items.length >= 1 &&
            b.items.length <= 3 &&
            b.items.every((s) => typeof s?.value === "string" && s.value.length > 0 && typeof s?.label === "string" && s.label.length > 0),
          `body[${i}]: stats braucht 1-3 items mit value+label`
        );
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
  // MINDESTLÄNGE ANGEHOBEN (Tim, 12.08.2026, gemäss Masterplan): Der Median
  // lag bei 339 Wörtern, 41 von 144 Artikeln unter 300 - für Google zu dünn,
  // und wenige Wörter bieten wenige Anknüpfungspunkte für Suchanfragen. Die
  // etablierten deutschen Gaming-Seiten liegen bei 400 bis 800. Untergrenze
  // darum von 250 auf 350; die Zielkorridore im Generierungs-Prompt liegen
  // deutlich darüber (400-500 / 550-700 / 750-950). Bewusst nicht höher
  // angesetzt: Die Grenze soll Ausreisser abfangen, nicht brauchbare kurze
  // Meldungen verwerfen - ein verworfener Artikel ist teurer als ein knapper.
  need(wordCount >= 350, `Artikel zu kurz (${wordCount} Wörter, min. 350)`);

  // Obergrenze nur, wenn der Nachrichtenwert bekannt ist. Fehlt er, bleibt es
  // bei der Untergrenze - lieber keine Pruefung als eine geratene.
  const korridor = LAENGE[depth];
  if (korridor) {
    const max = Math.round(korridor.bis * OBERGRENZE_ZUSCHLAG);
    need(
      wordCount <= max,
      `Artikel zu lang (${wordCount} Wörter, max. ${max} bei "${depth}")`,
    );
  }

  return { ok: errors.length === 0, errors, wordCount, korridor: korridor ?? null };
}
