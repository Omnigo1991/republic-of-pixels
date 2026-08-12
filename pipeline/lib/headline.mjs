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

export const MAX_ZEILEN = 3;
export const MAX_WOERTER = 9;

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

  if (headlineLines.length > MAX_ZEILEN) {
    fehler.push(`${headlineLines.length} Zeilen (erlaubt: ${MAX_ZEILEN})`);
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
  const UMSCHRIEBEN =
    /\b(zurueck|fuer|ueber|ueber\w+|muessen|koennen|moeglich|groesse|groesser|schliessen|waehrend|naechste[rns]?|spaeter|hoeher|staerker|erklaert|gehoert|zerstoeren|endgueltig|urspruenglich|kuendigt|angekuendigt|enthuellt|verfuegbar|unterstuetzt|einfuehrung|jaehrlich|taeglich)\b/i;
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
