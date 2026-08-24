// AUSFALL-REGISTER (Tim, 14.08.2026).
//
// WARUM: Neun Stellen in der Instagram-Kette können einen Post fallen
// lassen. Jede schreibt brav eine Zeile ins Protokoll - aber niemand zählt
// sie zusammen. Die Tagesbilanz meldete abends "nur 2 von 5 Posts" und liess
// Tim mit der Frage allein, WARUM.
//
// Am 14.08. fielen drei Slots an drei verschiedenen Stellen aus (Umlaut-
// Fehlalarm, Instagram-Ablehnung, Abnahme). Gemerkt hat es nur, wer die
// Protokolle aller Läufe einzeln gelesen hat. Genau das soll niemand müssen.
//
// Dieses Register zählt jeden gescheiterten ANLAUF mit Grund - pro Lauf für
// das Protokoll und pro Tag im State, damit die Tagesbilanz am Abend nicht
// nur sagt, dass Posts fehlen, sondern auch woran es lag.
//
// BEWUSST "ANLÄUFE", NICHT "VERLORENE POSTS": Die Ersatz-Runde fängt viele
// Abbrüche auf - fällt ein Bild durch, rückt die nächste Story nach und der
// Slot ist gerettet. Ein gescheiterter Anlauf ist also nicht automatisch ein
// fehlender Post. Die Zahl beschreibt die REIBUNG in der Kette, und genau
// dafür ist sie da. Wieviele Posts am Ende fehlen, sagt weiterhin die
// Tagesbilanz durch Zählen der tatsächlichen Posts.

// Die Gründe stehen als Konstanten hier, damit überall dieselbe Bezeichnung
// benutzt wird. Ein Tippfehler an einer Aufrufstelle würde sonst eine eigene
// Kategorie erfinden und die Zählung still verwässern.
export const GRUND = {
  STRUKTUR: "Vorschlag unvollständig",
  SCHLAGZEILE: "Schlagzeile regelwidrig",
  UMLAUTE: "ausgeschriebene Umlaute",
  KEIN_BILD: "kein taugliches Bild",
  TYPO_DECKEL: "Typo-Kontingent erschöpft",
  ABNAHME: "Abnahme abgelehnt",
  ABNAHME_KAPUTT: "Abnahme selbst fehlgeschlagen",
  RENDER: "Grafik nicht erstellbar",
  AUSWAHL_LEER: "Auswahl leer",
  NICHT_ERREICHBAR: "Grafik nicht erreichbar",
  INSTAGRAM: "von Instagram abgelehnt",
  TYPO_AUS: "Typo-Karte heute abgeschaltet",
};

// Wie lange die Tageswerte im State bleiben. Zwei Wochen reichen, um einem
// Muster nachzugehen, und halten die Datei klein.
const TAGE_BEHALTEN = 14;

const zuerichTag = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(d);

// Zähler für den laufenden Prozess (Protokollzeile am Lauf-Ende).
const lauf = new Map();

/**
 * Hält einen ausgefallenen Post fest - im Lauf und im State.
 * @param {object} state  geladener State (wird verändert, nicht geschrieben)
 * @param {string} grund  ein Wert aus GRUND
 * @param {string} [slug] betroffener Artikel, nur fürs Protokoll
 */
export function notiere(state, grund, slug) {
  lauf.set(grund, (lauf.get(grund) ?? 0) + 1);

  const tag = zuerichTag();
  state.instagram ??= {};
  state.instagram.ausfaelle ??= {};
  state.instagram.ausfaelle[tag] ??= {};
  state.instagram.ausfaelle[tag][grund] =
    (state.instagram.ausfaelle[tag][grund] ?? 0) + 1;

  // Alte Tage wegräumen, damit state.json nicht unbegrenzt wächst.
  const grenze = zuerichTag(new Date(Date.now() - TAGE_BEHALTEN * 86400000));
  for (const t of Object.keys(state.instagram.ausfaelle)) {
    if (t < grenze) delete state.instagram.ausfaelle[t];
  }

  console.log(`  Anlauf gescheitert (${grund})${slug ? `: ${slug}` : ""}`);
}

/** Eine Zeile am Lauf-Ende. Ohne gescheiterte Anläufe bleibt sie weg. */
export function laufBericht() {
  if (lauf.size === 0) return;
  const teile = [...lauf.entries()].map(([g, n]) => `${g}: ${n}`);
  const summe = [...lauf.values()].reduce((a, b) => a + b, 0);
  console.log(`Gescheiterte Anläufe in diesem Lauf: ${summe} - ${teile.join(", ")}`);
}

/**
 * Die gescheiterten Anläufe eines Tages, für die Tagesbilanz.
 * @returns {{summe: number, text: string}} text ist leer, wenn nichts scheiterte.
 */
export function tagesAusfaelle(state, tag = zuerichTag()) {
  const eintrag = state.instagram?.ausfaelle?.[tag] ?? {};
  const paare = Object.entries(eintrag).filter(([, n]) => n > 0);
  const summe = paare.reduce((a, [, n]) => a + n, 0);
  return {
    summe,
    text: paare.map(([g, n]) => `${g}: ${n}`).join(", "),
  };
}
