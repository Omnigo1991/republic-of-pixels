// DER TAKT DER NACHRICHTEN-PIPELINE (Tim, 27.08.2026: "Bau Welle 1 so um").
//
// AUSGANGSLAGE: Die Pipeline lief alle vier Stunden und veröffentlichte pro
// Lauf bis zu zwei Artikel (MAX_ARTICLES_PER_RUN). Bei einem Leak, der um
// 14:10 bricht, waren wir um 18:00 da - die Mitbewerber um 14:20. Bei
// brandneuen Themen gibt es keinen Autoritätsvorsprung, dort gewinnt, wer
// zuerst da ist. Das ist die einzige Stelle, an der reines Tempo tatsächlich
// Rennen entscheidet.
//
// DER FEHLER, DEN TIM GEFUNDEN HAT: Mein erster Vorschlag war "alle 30
// Minuten laufen lassen". Bei einer festen Quote von zwei Artikeln pro Lauf
// wären das bis zu 96 Artikel am Tag gewesen. Tims Einwand ("dann
// verschwinden die doch sofort von der Startseite") war goldrichtig: Bei 19
// Artikeln am Tag ist ein Artikel 74 Minuten lang Aufmacher, bei 96 wären es
// 15 Minuten.
//
// DIE TRENNUNG, AUF DIE ES ANKOMMT: Wie oft wir HINSCHAUEN und wie viel wir
// VERÖFFENTLICHEN sind zwei Regler, keiner. Hinschauen darf sehr häufig
// sein, es kostet fast nichts. Wie viel erscheint, steht in TAGESBUDGET.
//
// Dieser Wert bildete anfangs nur ab, was wir ohnehin produzierten (20). Seit
// dem 30.08.2026 steht er auf 12, und zwar als bewusste Drosselung aus
// Kostengründen - die Herleitung steht bei der Konstante selbst. Zum
// Vergleich: Der Median der Mitbewerber lag am 27.08.2026 bei rund 30
// Artikeln am Tag, gemessen an deren Feeds. Wir liegen also deutlich
// darunter, und das ist eine Entscheidung, kein Versehen.
//
// DESHALB STEHT DIE REGEL HIER IM CODE UND NICHT IM PROMPT. Hausregel: Eine
// Regel, die nur im Prompt steht, ist keine Regel. Das Modell entscheidet
// weiterhin, WORÜBER wir schreiben. WIE VIEL wir schreiben, entscheidet
// diese Datei, und zwar rechnerisch.
//
// WARUM EINE TAGESKURVE UND KEIN EINFACHER DECKEL: Ein reiner Tagesdeckel
// von 19 wäre bei 48 Läufen am Tag um 10 Uhr morgens aufgebraucht - danach
// hätten wir bis Mitternacht Funkstille. Deshalb wird das Budget über den
// Tag verteilt freigegeben, genau wie beim Instagram-Posting.

const ZEITZONE = "Europe/Zurich";

/**
 * Standardbudget.
 *
 * VON 20 AUF 12 (Tim, 30.08.2026: "Ja, mach die Artikel auch auf 12"). Das
 * ist die erste bewusste Drosselung - bis hierhin bildete das Budget nur ab,
 * was wir ohnehin produzierten.
 *
 * Der Grund ist eine Kostenrechnung mit unangenehmem Ergebnis. Gemessen an
 * echten Läufen kostet uns ein Artikel rund 17 Cent, macht bei 20 Stück etwa
 * $3.40 am Tag. Was ein Artikel dafür einbringt, steht in der Google Search
 * Console: 6,7 Impressionen und 0,15 Klicks über drei Monate. Also ungefähr
 * ein Klick pro sieben Artikel.
 *
 * Zwölf statt zwanzig spart rund $1.40 am Tag. Was wir dafür aufgeben, sind
 * rechnerisch etwa 54 Impressionen täglich - bei einer Seite, die insgesamt
 * 126 am Tag hat, ist das viel; bei einer Seite, die davon 2,8 Klicks
 * bekommt, ist es wenig.
 *
 * NEBENWIRKUNG, DIE UNS GELEGEN KOMMT: Die Startseite trägt 27 Kacheln. Bei
 * 20 Artikeln am Tag war ein Artikel 74 Minuten lang Aufmacher und nach 33
 * Stunden verschwunden. Bei 12 sind es gut zwei Stunden und zweieinhalb
 * Tage. Tim hatte am 27.08. gefragt, ob Artikel nicht zu schnell von der
 * Startseite rutschen - das war die richtige Beobachtung, und sie löst sich
 * hier nebenbei mit.
 *
 * Das Budget zählt ALLE Artikel des Tages, nicht nur die dieses Laufs. Damit
 * teilen sich der reguläre Lauf und der Eilmeldungs-Lauf dasselbe Kontingent,
 * ganz ohne Absprache zwischen den beiden - eine früh veröffentlichte
 * Eilmeldung nimmt dem Abend einen Platz weg, statt obendrauf zu kommen.
 */
export const TAGESBUDGET = Number(process.env.TAGESBUDGET ?? 12);

/**
 * Zuschlag für Eilmeldungen. Eine wirklich grosse Nachricht darf das
 * Tagesbudget überziehen - aber nicht unbegrenzt, sonst ist der Deckel
 * wieder wirkungslos. Über TAGESBUDGET + EIL_ZUSCHLAG geht nichts.
 */
export const EIL_ZUSCHLAG = Number(process.env.EIL_ZUSCHLAG ?? 5);

// SO VIELE VERSCHIEDENE QUELLEN müssen dasselbe melden, damit es als
// Eilmeldung gilt - und zwar innerhalb von EIL_FENSTER_MIN Minuten.
//
// DIESE ZAHLEN SIND GEMESSEN, NICHT GERATEN (27.08.2026). Gemessen wurde an
// 1375 echten Feed-Einträgen aus allen 34 Quellen, durchgerechnet für die
// letzten 24 Stunden im 30-Minuten-Takt:
//
//    4 Quellen  ->  39 % aller Läufe, 12 Storys am Tag
//    5 Quellen  ->  29 %,  8 Storys
//    6 Quellen  ->  18 %,  5 Storys
//    8 Quellen  ->   8 %,  2 Storys
//   10 Quellen  ->   4 %,  1 Story
//
// Mein erster Entwurf stand bei 3 Quellen in 120 Minuten und hätte bei 53 %
// aller Läufe angeschlagen. Damit wäre die Tagesdecke der Normalzustand
// gewesen und die ganze Taktung wirkungslos - derselbe Denkfehler, den Tim
// bei der Startseite vorher gesehen hat, nur an anderer Stelle.
//
// WARUM 8: Bei dieser Schwelle lösten in 24 Stunden zwei Storys aus, beide
// Test-Embargos mit 8 und 15 gleichzeitigen Quellen. Genau dafür ist die
// Erkennung da. Bei 6 kämen fünf Storys am Tag dazu, die zwar echt sind
// (Xbox Disc-to-Digital, Elden Ring auf Switch 2), aber keine Eile
// rechtfertigen. Der strengere Wert ist bewusst gewählt, weil dieser Pfad
// ohne Aufsicht veröffentlicht.
//
// ACHTUNG BEIM NACHZIEHEN: Die Schwelle hängt an der ZAHL DER FEEDS. Eine
// erste Messung mit 17 Feeds ergab für 5 Quellen dieselben 6 %, für die wir
// jetzt 8 brauchen. Wer Feeds hinzufügt oder entfernt, muss neu kalibrieren:
//   node pipeline/eil-check.mjs --kalibrieren
const EIL_QUELLEN = Number(process.env.EIL_QUELLEN ?? 8);
const EIL_FENSTER_MIN = Number(process.env.EIL_FENSTER_MIN ?? 60);

// Wörter, die keine STORY benennen und deshalb nicht gruppieren dürfen.
//
// Erste Gruppe: gewöhnliche Füllwörter, deutsch und englisch gemischt, weil
// unsere Feeds beides liefern.
//
// Zweite Gruppe, und die ist der eigentliche Fund vom 27.08.2026: Plattform-,
// Firmen- und Formatwörter. Gruppiert man danach, landen "IKEA und Xbox
// enthüllen Möbel" und "Xbox macht Disc-Spiele digital" in derselben Gruppe -
// beides Xbox, aber zwei völlig verschiedene Meldungen. Dasselbe galt für
// "gamescom", das sieben unabhängige Messemeldungen zu einer angeblichen
// Eilmeldung zusammenzog. Ein Story-Wort ist ein Eigenname wie "Silksong",
// kein Markenname, unter dem täglich ein Dutzend Meldungen laufen.
const FUELLWOERTER = new Set([
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "eines",
  "und", "oder", "aber", "auch", "noch", "nur", "schon", "sich", "wird", "wurde",
  "werden", "sind", "haben", "hat", "hatte", "kann", "koennen", "soll", "sollen",
  "fuer", "mit", "von", "vom", "aus", "auf", "bei", "nach", "vor", "ueber", "unter",
  "the", "and", "for", "with", "from", "that", "this", "has", "have", "will",
  "are", "was", "were", "its", "his", "her", "you", "your", "new", "now",
  "news", "update", "gaming", "game", "games", "spiel", "spiele",
  // Plattformen, Hersteller, Publisher
  "xbox", "playstation", "nintendo", "switch", "steam", "epic", "valve",
  "sony", "microsoft", "rockstar", "ubisoft", "blizzard", "activision",
  "bethesda", "capcom", "konami", "sega", "square", "enix",
  // Formate und Anlässe
  "trailer", "gameplay", "teaser", "gamescom", "release", "launch", "launches",
  "announced", "announcement", "ankuendigung", "angekuendigt", "erscheint",
  "patch", "season", "review", "test", "tests", "preis", "price", "deal", "deals",
  "konsole", "console", "spieler", "players", "studio", "publisher",
  "entwickler", "developer", "bericht", "report", "geruecht", "rumor",
  "leak", "leaks", "story", "action",
  // Allerweltswörter, die durch den Längenfilter rutschen
  "erste", "ersten", "neue", "neuen", "neues", "mehr", "alle", "jetzt",
  "heute", "kommt", "kommen", "gibt", "macht", "zeigt", "bringt", "2026", "2027",
  // Zeit- und Mengenwörter (Fund im ersten Trockenlauf, 27.08.2026: Die
  // stärkste Gruppe hiess "ende" - aus "erscheint Ende September". Solche
  // Wörter gruppieren zufällig und machen die Protokolle unlesbar).
  "ende", "anfang", "woche", "wochen", "monat", "monate", "jahr", "jahre",
  "jahren", "tage", "tagen", "stunden", "minuten", "zeit", "januar", "februar",
  "maerz", "april", "juni", "juli", "august", "september", "oktober",
  "november", "dezember",
  "wieder", "immer", "endlich", "bereits", "sogar", "hier", "dabei", "damit",
  "diese", "dieser", "dieses", "seine", "seiner", "ihre", "ihrer", "koennte",
  "duerfte", "sollte", "wollte", "welt", "leute", "sagt", "sagte",
  // Dasselbe auf Englisch - "after" hatte im Kalibrierlauf eine GTA-Gruppe
  // gebildet, obwohl es über den Inhalt nichts aussagt.
  "after", "before", "about", "into", "over", "when", "what", "where",
  "while", "than", "then", "they", "them", "their", "there", "just",
  "like", "make", "makes", "made", "says", "said", "very", "much", "some",
  "only", "also", "still", "even", "know", "want", "need", "look", "come",
  "gets", "goes", "here", "been", "your", "with", "would", "could", "should",
  "first", "best", "next", "last", "back", "down", "more", "most",
]);

/**
 * Titel in bedeutungstragende Wörter zerlegen.
 *
 * HTML-Entitäten fliegen zuerst raus: In den echten Feeds stehen Titel wie
 * "&#8216;Super2D turn-based RPG&#8217; Amphibian announced" - ohne diesen
 * Schritt würde "8216" zu einem Wort und könnte gruppieren.
 */
function woerter(titel) {
  return new Set(
    (titel ?? "")
      .toLowerCase()
      .replace(/&#?\w+;/g, " ")
      .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" })[c])
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length >= 4 && !FUELLWOERTER.has(w)),
  );
}

/** Wie viel des Tages ist in Zürich vorbei (0 bis 1)? */
export function tagesanteil(jetzt = new Date()) {
  const teile = new Intl.DateTimeFormat("de-CH", {
    timeZone: ZEITZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(jetzt);
  const hole = (art) => Number(teile.find((t) => t.type === art)?.value ?? 0);
  // Achtung: de-CH hängt "Uhr" an, wenn man nur die Stunde formatiert -
  // derselbe Fehler hat am 26.08. die Instagram-Auswertung zerlegt. Mit
  // formatToParts und zwei Feldern tritt er nicht auf.
  return (hole("hour") * 60 + hole("minute")) / 1440;
}

/** Datum in Zürich als "2026-08-27". */
export function zuercherTag(d = new Date()) {
  const t = new Intl.DateTimeFormat("de-CH", {
    timeZone: ZEITZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const hole = (art) => t.find((x) => x.type === art)?.value ?? "00";
  return `${hole("year")}-${hole("month")}-${hole("day")}`;
}

/**
 * Wie viele Artikel wurden heute (Zürcher Zeit) schon veröffentlicht?
 *
 * WARUM AUS DEN ARTIKELDATEIEN UND NICHT AUS state.json: Die Dateien sind
 * die Wahrheit. Bricht ein Lauf nach dem Schreiben eines Artikels ab, wäre
 * ein Zähler im State falsch und der Fehler würde sich täglich fortsetzen.
 * Die Dateien zählen sich selbst richtig, auch nach einem Absturz.
 */
export function heuteVeroeffentlicht(artikel, jetzt = new Date()) {
  const heute = zuercherTag(jetzt);
  return artikel.filter((a) => a.publishedAt && zuercherTag(new Date(a.publishedAt)) === heute).length;
}

/**
 * Sucht unter den Kandidaten nach einer Meldung, über die auffällig viele
 * verschiedene Quellen gleichzeitig berichten.
 *
 * DAS IST DER GRUND FÜR DEN SCHNELLEN TAKT. Ohne diese Erkennung würde das
 * häufigere Laufen nur die Veröffentlichungen gleichmässiger verteilen, aber
 * nichts beschleunigen. Melden drei unabhängige Quellen innerhalb von zwei
 * Stunden dasselbe, ist etwas Grosses passiert - dann darf der Lauf das
 * Tagestempo überholen.
 *
 * @returns {{titel: string, quellen: number, kandidaten: object[]}|null}
 */
export function eilverdacht(kandidaten, jetzt = new Date()) {
  const frisch = kandidaten.filter(
    (k) => k.publishedAt && k.publishedAt <= jetzt && jetzt - k.publishedAt <= EIL_FENSTER_MIN * 60000,
  );
  if (frisch.length < EIL_QUELLEN) return null;

  // GRUPPIERUNG JE WORT, NICHT KETTENWEISE (Fund 27.08.2026): Mein erster
  // Entwurf liess jeden Kandidaten der ersten hinreichend ähnlichen Gruppe
  // beitreten. Das wandert: A ähnelt B, B ähnelt C, also landen A und C in
  // einer Gruppe, obwohl sie nichts miteinander zu tun haben. So kamen sieben
  // angebliche Quellen zu einer "Story" zusammen, die keine war.
  //
  // Hier ist eine Story schlicht die Menge der Meldungen, die dasselbe Wort
  // tragen. Kein Wandern, und im Protokoll steht hinterher, welches Wort die
  // Gruppe gebildet hat - man kann also nachlesen, warum der Lauf ausgelöst
  // hat.
  const proWort = new Map();
  for (const k of frisch) {
    for (const w of woerter(k.title)) {
      if (!proWort.has(w)) proWort.set(w, []);
      proWort.get(w).push(k);
    }
  }

  let beste = null;
  for (const [wort, liste] of proWort) {
    const quellen = new Set(liste.map((k) => k.feedId)).size;
    if (!beste || quellen > beste.quellen) {
      beste = { wort, quellen, titel: liste[0].title, kandidaten: liste };
    }
  }
  if (!beste) return null;
  // Die stärkste Gruppe wird IMMER zurückgegeben, auch wenn sie die Schwelle
  // verfehlt - der Aufrufer protokolliert sie, damit sich EIL_QUELLEN später
  // an echten Produktionsdaten nachziehen lässt statt an einer Schätzung.
  return { ...beste, reicht: beste.quellen >= EIL_QUELLEN };
}

/**
 * Die eigentliche Entscheidung eines Laufs.
 *
 * @param {object} o
 * @param {object[]} o.artikel      alle bestehenden Artikel (für die Tageszählung)
 * @param {object[]} o.kandidaten   die neuen Feed-Einträge dieses Laufs
 * @param {number}  [o.budget]      Tagesbudget
 * @param {number}  [o.proLauf]     harte Obergrenze pro Lauf
 * @param {boolean} [o.nurEil]      nur bei Eilmeldung schreiben, Tempo ignorieren
 * @param {Date}    [o.jetzt]
 * @returns {{schreiben: boolean, hoechstens: number, grund: string, heute: number, erlaubt: number, eil: object|null}}
 */
export function taktEntscheid({
  artikel,
  kandidaten,
  budget = TAGESBUDGET,
  proLauf = 2,
  nurEil = false,
  jetzt = new Date(),
}) {
  const heute = heuteVeroeffentlicht(artikel, jetzt);
  const anteil = tagesanteil(jetzt);
  // Aufgerundet, damit direkt nach Mitternacht nicht stundenlang Stillstand
  // herrscht - sonst wäre der erste Artikel des Tages erst gegen 01:15 fällig.
  const erlaubt = Math.ceil(budget * anteil);
  const eil = eilverdacht(kandidaten, jetzt);
  const decke = budget + EIL_ZUSCHLAG;

  // Der harte Deckel gilt immer, auch für Eilmeldungen. Sonst wäre er keiner.
  if (heute >= decke) {
    return {
      schreiben: false,
      hoechstens: 0,
      grund: `Tagesdecke erreicht (${heute}/${decke})`,
      heute, erlaubt, eil,
    };
  }

  // DER EILMELDUNGS-LAUF hat eine andere Aufgabe als der reguläre: Er soll
  // NUR bei einer Eilmeldung schreiben, nie um das Tagestempo zu halten. Sonst
  // würde er dem regulären Lauf die Arbeit wegnehmen und dabei Instagram,
  // Deals und Charts überspringen, die nur am regulären Lauf hängen.
  if (nurEil) {
    if (!eil?.reicht) {
      const wie = eil ? `stärkste Gruppe [${eil.wort}] mit ${eil.quellen} Quellen` : "keine Gruppe";
      return { schreiben: false, hoechstens: 0, grund: `keine Eilmeldung (${wie})`, heute, erlaubt, eil };
    }
    return {
      schreiben: true,
      hoechstens: Math.min(proLauf, decke - heute),
      grund: `Eilmeldung [${eil.wort}]: ${eil.quellen} Quellen zu "${eil.titel.slice(0, 60)}"`,
      heute, erlaubt, eil,
    };
  }

  if (heute < erlaubt) {
    return {
      schreiben: true,
      hoechstens: Math.min(proLauf, erlaubt - heute, decke - heute),
      grund: `im Tempo (${heute} von ${erlaubt} bis jetzt erlaubt)`,
      heute, erlaubt, eil,
    };
  }

  if (eil?.reicht) {
    return {
      schreiben: true,
      hoechstens: Math.min(proLauf, decke - heute),
      grund: `Eilmeldung [${eil.wort}]: ${eil.quellen} Quellen zu "${eil.titel.slice(0, 60)}"`,
      heute, erlaubt, eil,
    };
  }

  const staerkste = eil
    ? `, stärkste Gruppe [${eil.wort}] mit ${eil.quellen} von ${EIL_QUELLEN} nötigen Quellen`
    : "";
  return {
    schreiben: false,
    hoechstens: 0,
    grund: `dem Tempo voraus (${heute} veröffentlicht, ${erlaubt} erlaubt)${staerkste}`,
    heute, erlaubt, eil,
  };
}
