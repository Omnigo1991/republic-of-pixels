// UMLAUT-WÄCHTER (Tim, 12.08.2026) — findet ausgeschriebene Umlaute.
//
// WARUM ES DIESE DATEI GIBT: Am 12.08. stand "ZURUECK" statt "ZURÜCK" auf
// einem Post. Meine erste Antwort darauf war eine LISTE der Wörter, die es
// in der ue/oe/ae-Schreibweise nicht gibt. Beim ersten Test des nächsten
// Formats fielen prompt "WUERDET" und "laeuft" durch — beide standen nicht
// auf der Liste. Eine Wortliste ist prinzipiell immer einen Fehler hinterher;
// genau dieser Denkfehler hat uns diese Woche acht Mal eingeholt.
//
// Diese Prüfung arbeitet stattdessen am MUSTER. Ein ausgeschriebener Umlaut
// ist ein "ae", "oe" oder "ue", dem kein Vokal vorangeht — bei echten
// Doppellauten steht immer ein Vokal davor (neue, Frauen, Abenteuer, heute).
// Dazu vier bauliche Ausnahmen und eine kurze Liste echter Wörter, die dem
// Muster zufällig entsprechen.

// Wörter, die dem Muster entsprechen, aber korrekt sind. Bewusst kurz
// gehalten — jeder Eintrag hier ist eine Lücke im Wächter. Aufgenommen wird
// nur, was in unserem Umfeld (Gaming, deutsch/englisch gemischt) real
// vorkommt.
const AUSNAHMEN = new Set([
  // Eigennamen und Fachbegriffe
  "guerrilla", "guerillas", "guerilla", "poesie", "poetisch", "poet", "poe",
  "michael", "raphael", "rafael", "israel", "israelisch", "maestro", "boeing",
  "koexistenz", "zoe", "joel", "noel", "aerobic", "aerosol",
  // Englisch, das in Gaming-Texten vorkommt
  "guest", "guests", "guess", "bluetooth", "blueprint", "blues", "tuesday",
  "influence", "influencer", "fluent", "suede", "duet", "silhouette",
  "roguelike", "roguelite", "vaevictis",
]);

const VOKALE = new Set(["a", "e", "i", "o", "u", "ä", "ö", "ü", "y"]);

function istUmschrieben(wortRoh) {
  const wort = wortRoh.toLowerCase().replace(/[^a-zäöüß]/g, "");
  if (wort.length < 3) return false;
  if (AUSNAHMEN.has(wort)) return false;

  for (let i = 0; i + 1 < wort.length; i++) {
    const paar = wort.slice(i, i + 2);
    if (paar !== "ae" && paar !== "oe" && paar !== "ue") continue;

    const davor = i > 0 ? wort[i - 1] : "";

    // 1) Vokal davor → echter Doppellaut: neue, Frauen, Abenteuer, treue,
    //    Steuer, heute, Freude. Kein Umlaut.
    if (VOKALE.has(davor)) continue;

    // 2) "qu" davor → que/quer: Sequel, Quest, Frequenz, Konsequenz.
    if (davor === "q") continue;

    // 3) Am Wortende → im Deutschen nie ein ausgeschriebener Umlaut,
    //    im Englischen dagegen häufig: blue, true, league, value, rogue.
    if (i + 2 === wort.length) continue;

    // 4) "-uell" und "-uel" → Duell, aktuell, virtuell, individuell,
    //    Manuel, Samuel, fuel, duel, cruel.
    if (paar === "ue" && (wort.startsWith("ll", i + 2) || i + 3 === wort.length && wort[i + 2] === "l")) {
      continue;
    }

    return true;
  }
  return false;
}

/**
 * Findet ausgeschriebene Umlaute in einem Text.
 * @param {string} text
 * @returns {string[]} die beanstandeten Wörter (leer = sauber)
 */
export function umschriebeneUmlaute(text) {
  return String(text ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => istUmschrieben(w));
}
