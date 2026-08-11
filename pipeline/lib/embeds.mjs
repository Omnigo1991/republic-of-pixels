// Auswahl der Einbettungen für einen Artikel.
//
// NACH GEGENSTAND STATT NACH RANGFOLGE (Tim, 11.08.2026): Vorher entschied
// in extract.mjs eine feste Reihenfolge — X vor Reddit vor YouTube. Da auf
// Nachrichtenseiten fast immer irgendein X-Link steht, und sei es nur ein
// Teilen-Knopf, gewann X praktisch immer und verdrängte den Trailer selbst
// dort, wo die Meldung vom Trailer handelte. Nachgemessen an sechs
// Video-Storys: vier ganz ohne Einbettung, eine mit Tweet statt Video.
//
// Jetzt sammelt extract.mjs nur noch alle Kandidaten; entschieden wird hier,
// wo der Artikelgegenstand bekannt ist. Handelt die Story von Bewegtbild,
// gewinnt das Video; sonst bleibt der Tweet als Beleg vorn. Liegt beides
// vor, kommt beides — erst ansehen, dann die Quelle dazu.

// Wörter, die auf eine Bewegtbild-Meldung hindeuten. Bewusst grosszügig:
// Ein zu Unrecht gezeigter Trailer stört weit weniger als ein fehlender.
const VIDEO_WORTE =
  /trailer|gameplay|teaser|dev.?diary|showcase|nintendo direct|state of play|ankündigung|angekündigt|zeigt|gezeigt|video|clip|cinematic|erster blick|extended look|vorgestellt/i;

export function gehtUmBewegtbild(article) {
  return VIDEO_WORTE.test(
    [
      article?.title ?? "",
      article?.subtitle ?? "",
      article?.excerpt ?? "",
      ...(article?.tags ?? []),
      article?.body?.find((b) => b?.type === "paragraph")?.text ?? "",
    ].join(" "),
  );
}

// embedsListe: ein Eintrag pro Quelle, jeweils { youtube, twitter, reddit }.
// Rückgabe: Liste von { platform, url } in Anzeigereihenfolge (kann leer sein).
export function waehleEinbettungen(article, embedsListe = []) {
  const erste = (art) => embedsListe.map((e) => e?.[art]).find(Boolean) ?? null;
  const video = erste("youtube");
  const tweet = erste("twitter");
  const reddit = erste("reddit");
  const beleg = tweet
    ? { platform: "twitter", url: tweet }
    : reddit
      ? { platform: "reddit", url: reddit }
      : null;
  const film = video ? { platform: "youtube", url: video } : null;

  if (film && gehtUmBewegtbild(article)) return [film, ...(beleg ? [beleg] : [])];
  if (beleg) return [beleg, ...(film ? [film] : [])];
  return film ? [film] : [];
}
