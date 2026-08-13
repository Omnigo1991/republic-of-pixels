// Prüfung der Schlagzeilen für Instagram-Grafiken.
//
// WARUM ES DIESE DATEI GIBT (Tim, 11.08.2026): Die Regeln standen bisher nur
// im Prompt — "2–3 Zeilen, gesamthaft maximal 9 Wörter, keine Zeile deutlich
// kürzer als ihre Nachbarn". Geprüft wurde im Code lediglich, ob überhaupt
// eine Zeile vorhanden ist. Am 11.08. verletzten DREI von vier Posts die
// Regel, und niemand fing es auf: vier Zeilen statt drei, das Wort "AN"
// allein auf einer Zeile, eine Schlagzeile, die die Kopfzeile der Typo-Karte
// überschrieb. Eine Regel, die nur in Worten existiert, ist keine Regel.
//
// Diese Prüfung läuft VOR dem Rendern. Fällt ein Vorschlag durch, wird er
// verworfen und neu angefordert (die Auswahl hat dafür drei Runden).

// MARKER-LAYOUT (13.08.2026): Der Spielname steht jetzt in der Kopfzeile,
// die Schlagzeile setzt ihn nur fort. Sie braucht damit weniger Platz —
// genau 2 Zeilen, höchstens 8 Wörter. Drei Zeilen plus Kopfzeile plus Notiz
// ergäben einen Textblock, der das halbe Bild verdeckt.
export const MAX_ZEILEN = 2;
export const MAX_WOERTER = 8;
export const MAX_NOTIZ_WOERTER = 6;

// Wörter, die es in der ue/oe/ae-Schreibweise im Deutschen NICHT gibt.
// Auf Modulebene, weil Schlagzeile, Kopfzeile und Notiz dieselbe Regel
// brauchen (vorher lag die Liste in pruefeHeadline und galt nur dort).
const UMSCHRIEBEN =
  /\b(zurueck|fuer|ueber|ueber\w+|muessen|koennen|moeglich|groesse|groesser|schliessen|waehrend|naechste[rns]?|spaeter|hoeher|staerker|erklaert|gehoert|zerstoeren|endgueltig|urspruenglich|kuendigt|angekuendigt|enthuellt|verfuegbar|unterstuetzt|einfuehrung|jaehrlich|taeglich|wuerde[nst]?|laeuft|haette|waere|schoen|gruen|buecher|maenner|staedte|laender|haeuser)\b/i;

function woerter(zeile) {
  return zeile
    .map((seg) => String(seg?.text ?? ""))
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// Rückgabe: { ok, fehler: [] } — fehler ist leer, wenn alles stimmt.
export function pruefeHeadline(headlineLines) {
  const fehler = [];
  if (!Array.isArray(headlineLines) || headlineLines.length === 0) {
    return { ok: false, fehler: ["keine Zeilen"] };
  }
  if (!headlineLines.every((z) => Array.isArray(z) && z.length > 0)) {
    return { ok: false, fehler: ["Zeilenstruktur ungültig"] };
  }

  if (headlineLines.length !== MAX_ZEILEN) {
    fehler.push(`${headlineLines.length} Zeilen (nötig: genau ${MAX_ZEILEN})`);
  }

  // GENAU EINE MARKIERUNG (13.08.2026): Das cyane Segment wird jetzt als
  // Markierungs-Kasten gesetzt. Zwei Kästen in einer Schlagzeile heben sich
  // gegenseitig auf — markiert ist dann nichts mehr. Keiner heisst: die
  // Karte hat keinen Blickfang.
  const cyanZahl = headlineLines.flat().filter((s) => s?.cyan).length;
  if (cyanZahl !== 1) {
    fehler.push(`${cyanZahl} Markierungen (nötig: genau 1)`);
  }

  const proZeile = headlineLines.map(woerter);
  const gesamt = proZeile.reduce((s, w) => s + w.length, 0);
  if (gesamt > MAX_WOERTER) {
    fehler.push(`${gesamt} Wörter (erlaubt: ${MAX_WOERTER})`);
  }
  if (proZeile.some((w) => w.length === 0)) {
    fehler.push("leere Zeile");
  }

  // Waisen-Zeile: ein KURZES einzelnes Wort neben längeren Zeilen wirkt wie
  // ein Versehen — genau das passierte mit "AN" im Kamiya-Post. Ein LANGES
  // Einzelwort ist dagegen ein bewusster Schlag ("MASSENENTLASSUNGEN") und
  // bleibt erlaubt; die erste Fassung dieser Regel verbot beides und hätte
  // gute Schlagzeilen mitgerissen.
  const laengste = Math.max(...proZeile.map((w) => w.length));
  const kurzeWaise = proZeile.some((w) => w.length === 1 && w[0].length < 8);
  if (proZeile.length > 1 && kurzeWaise && laengste >= 2) {
    fehler.push("kurzes Einzelwort auf eigener Zeile");
  }

  // Zwei zusammengeklebte Schlagzeilen: Der Kamiya-Post trug "Kamiya deutet
  // Comeback an" UND "Capcom schweigt" — zwei Aussagen, die um Aufmerksamkeit
  // konkurrieren. Ein Satzzeichen mitten in der Schlagzeile ist das Signal.
  const ganzerText = proZeile.flat().join(" ");
  if (/[.;]|,\s*\S+\s+\S+\s+\S+/.test(ganzerText)) {
    fehler.push("wirkt wie zwei zusammengesetzte Schlagzeilen");
  }

  // UMLAUTE AUSSCHREIBEN IST VERBOTEN (Tim, 12.08.2026): Beim von Hand
  // gebauten Zelda-Reel stand "ZURUECK" statt "ZURÜCK". Die Pipeline selbst
  // schreibt Umlaute korrekt — der Fehler entstand, weil ich die Schlagzeile
  // manuell getippt und dabei umschrieben habe. Geprüft wird gegen eine
  // kurze Liste von Wörtern, die es in der ue/oe/ae-Schreibweise im
  // Deutschen NICHT gibt; damit sind Fehlalarme bei echten Wörtern wie
  // "Duell", "Poesie" oder "Museum" ausgeschlossen.
  const umschrieben = proZeile.flat().filter((w) => UMSCHRIEBEN.test(w));
  if (umschrieben.length) {
    fehler.push(`Umlaut ausgeschrieben: ${umschrieben.join(", ")}`);
  }

  // CYAN ENDET NICHT AUF EINEM HILFSWORT (Tim, 12.08.2026): Beim
  // Crimson-Desert-Post war "CRIMSON DESERT WIRD" komplett cyan — das "wird"
  // gehört aber nicht zum Spielnamen und soll weiss sein. Cyan hebt den
  // Spielnamen und die Pointe hervor, nicht ein angehängtes Hilfsverb oder
  // einen Artikel. Bewusst nur das ENDE geprüft und nur mit Hilfswörtern,
  // die nie Teil eines Titels sind — Partikeln wie "an" (in "deutet Comeback
  // an") bleiben erlaubt.
  const HILFSWORT =
    /^(wird|wurde|werden|ist|sind|war|waren|hat|hatte|haben|kann|kann|soll|sollen|muss|müssen|will|wollen|der|die|das|den|dem|des|ein|eine|einen|einem|und|oder|mit|von|vom|für|im|in|auf|zu|zum|zur|als|wie|bei|nach)$/i;
  for (const zeile of headlineLines) {
    for (const seg of zeile) {
      if (!seg?.cyan) continue;
      const worte = String(seg.text ?? "").trim().split(/\s+/).filter(Boolean);
      const letztes = worte[worte.length - 1];
      if (worte.length > 1 && letztes && HILFSWORT.test(letztes)) {
        fehler.push(`Cyan-Hervorhebung endet auf "${letztes}"`);
      }
    }
  }

  // Sehr lange Einzelwörter sprengen die Zeile auch nach dem Verkleinern.
  const laengstesWort = Math.max(...proZeile.flat().map((w) => w.length));
  if (laengstesWort > 24) {
    fehler.push(`Wort mit ${laengstesWort} Zeichen zu lang für eine Zeile`);
  }

  return { ok: fehler.length === 0, fehler };
}

// KOPFZEILE UND NOTIZ (Tim, 13.08.2026) — die zwei neuen Textebenen des
// Marker-Layouts. Beide werden hier geprüft und nicht nur im Prompt
// beschrieben; das ist die Lehre vom 11.08., als drei von vier Posts eine
// Regel verletzten, die nur im Prompt stand.
export function pruefeKicker(kicker) {
  const fehler = [];
  const t = String(kicker ?? "").trim();
  if (!t) return { ok: false, fehler: ["fehlt"] };
  const worte = t.split(/\s+/).filter(Boolean);
  if (worte.length > 4) fehler.push(`${worte.length} Wörter (erlaubt: 4)`);
  if (t.length > 30) fehler.push(`${t.length} Zeichen zu lang für die Kopfzeile`);
  if (t.includes("ß")) fehler.push('enthält "ß"');
  if (UMSCHRIEBEN.test(t)) fehler.push("Umlaut ausgeschrieben");
  return { ok: fehler.length === 0, fehler };
}

export function pruefeNotiz(notiz, headlineLines = [], kicker = "") {
  const fehler = [];
  const t = String(notiz ?? "").trim();
  if (!t) return { ok: false, fehler: ["fehlt"] };

  const worte = t.split(/\s+/).filter(Boolean);
  if (worte.length > MAX_NOTIZ_WOERTER) {
    fehler.push(`${worte.length} Wörter (erlaubt: ${MAX_NOTIZ_WOERTER})`);
  }
  if (/\.$/.test(t) && !/\.\.\.$/.test(t)) fehler.push("endet auf einem Punkt");
  if (t.includes("ß")) fehler.push('enthält "ß"');
  const umschrieben = worte.filter((w) => UMSCHRIEBEN.test(w));
  if (umschrieben.length) fehler.push(`Umlaut ausgeschrieben: ${umschrieben.join(", ")}`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)) fehler.push("enthält Emoji");
  if (/kommentar|schreibt uns|markiert|folgt uns|link in/i.test(t)) {
    fehler.push("ist ein Aufruf statt einer Haltung");
  }

  // KEINE WIEDERHOLUNG (der Kern der Regel): Eine Notiz, die nur die
  // Schlagzeile nachspricht, ist Füllsel — genau das, was Tim an meinem
  // ersten Entwurf nicht verstanden hat. Geprüft über Wort-Überlappung:
  // Teilen sich Notiz und Schlagzeile die Mehrzahl ihrer Inhaltswörter,
  // sagt die Notiz nichts Neues.
  const normal = (s) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);
  const kopfWorte = new Set([
    ...normal(headlineLines.flat().map((s) => s?.text ?? "").join(" ")),
    ...normal(String(kicker ?? "")),
  ]);
  const notizWorte = normal(t);
  if (notizWorte.length) {
    const doppelt = notizWorte.filter((w) => kopfWorte.has(w)).length;
    if (doppelt / notizWorte.length > 0.5) {
      fehler.push("wiederholt die Schlagzeile");
    }
  }

  return { ok: fehler.length === 0, fehler };
}
