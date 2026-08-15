// FAKTENTREUE-TOR — prüft das ERGEBNIS, nicht die Zutaten.
//
// WARUM ES DIESES TOR GIBT (Tim-Entscheid 15.08.2026, "Bau das Tor und lass
// laufen"): Guides werden ab jetzt automatisch veröffentlicht, wie Artikel.
// Der gefährlichste Guide-Fehler ist aber einer, den keine Struktur-Prüfung
// sieht: eine Behauptung, die grammatisch sauber, aber inhaltlich falsch
// ist — ein erfundener Preis, ein falsches Datum, ein Feature, das nie
// angekündigt wurde. Ein Guide berät Leser monatelang, teils bei
// Kaufentscheidungen; ein solcher Fehler wirkt darum viel länger als in
// einer News.
//
// WIE ES PRÜFT: Der fertige Guide-Text wird Behauptung für Behauptung gegen
// die Quelltexte gehalten, aus denen er entstanden ist — vom Urteils-Modell,
// nicht vom Modell, das den Text geschrieben hat. Alles Nachprüfbare
// (Zahlen, Daten, Preise, Namen, Termine, Feature-Zusagen), das NICHT in
// den Quellen steht, ist ein Verstoss. Ein einziger Verstoss stoppt die
// Veröffentlichung.
//
// FAIL-CLOSED wie beim Bild-Tor: Wenn die Prüfung selbst scheitert (API
// nicht erreichbar, unlesbare Antwort), wird NICHT veröffentlicht. Lieber
// ein Guide weniger als ein ungeprüfter Guide draussen.
import { askClaude, parseJsonResponse, MODELL_URTEIL } from "./claude.mjs";

const SYSTEM = `Du bist die Schlussredaktion eines deutschsprachigen Gaming-Magazins. Deine einzige Aufgabe: prüfen, ob ein fertiger Ratgeber-Text nur behauptet, was seine Quellen belegen. Du bist streng bei nachprüfbaren Fakten und grosszügig bei Einordnungen — eine Empfehlung oder ein allgemeiner Spieltipp ohne Zahlenwert ist keine Tatsachenbehauptung.`;

// guideText: der komplette Text des Guides (Titel bis letzter Absatz).
// quellTexte: Array der Quelltexte, so wie sie dem Autor vorlagen.
// frage: austauschbar für Tests (Standard: echter Claude-Aufruf).
export async function pruefeFakten({ guideText, quellTexte, frage = askClaude }) {
  const prompt = `Hier sind die QUELLEN, aus denen ein Guide geschrieben wurde:

${quellTexte.join("\n\n")}

---

Und hier der fertige GUIDE:

${guideText}

---

Prüfe jede nachprüfbare Tatsachenbehauptung im Guide gegen die Quellen:
Zahlen, Preise, Daten, Termine, Versionsnummern, Namen, Plattform-Angaben,
angekündigte Features, Zitate. Eine Behauptung gilt als GEDECKT, wenn sie
sinngemäss in den Quellen steht — wörtliche Übereinstimmung ist nicht nötig.

NICHT als Verstoss zählen:
- Empfehlungen, Einschätzungen, Spielratschläge ohne konkreten Zahlenwert
- Allgemeinwissen ohne Faktenrisiko ("Speichern ist wichtig")
- Die "Stand"-Angabe des Guides selbst
- Vorsichtige Formulierungen, die Unsicherheit ehrlich benennen ("unbestätigt", "laut Gerüchten"), sofern die Quelle das Gerücht erwähnt

Antworte NUR mit JSON, erstes Zeichen "{":
{
  "verstoesse": [
    {"behauptung": "wörtlich aus dem Guide", "problem": "warum die Quellen das nicht decken"}
  ]
}
Leeres Array, wenn alles gedeckt ist.`;

  const raw = await frage({
    system: SYSTEM,
    prompt,
    maxTokens: 6000,
    model: MODELL_URTEIL,
  });
  const ergebnis = parseJsonResponse(raw);
  if (!Array.isArray(ergebnis?.verstoesse)) {
    // Unlesbare Antwort = Prüfung nicht durchgeführt → fail-closed beim Aufrufer.
    throw new Error("Faktentor: Antwort ohne verstoesse-Liste — Prüfung ungültig.");
  }
  return {
    gedeckt: ergebnis.verstoesse.length === 0,
    verstoesse: ergebnis.verstoesse,
  };
}

// Baut aus dem Guide-JSON den durchgehenden Text, den das Tor prüft —
// derselbe Text, den auch die Leser sehen (Titel, Untertitel, alle Blöcke).
export function guideAlsText(guide) {
  const teile = [guide.title, guide.subtitle];
  for (const b of guide.body ?? []) {
    if (b.type === "list") teile.push((b.items ?? []).join("\n"));
    else if (b.text) teile.push(b.text);
  }
  if (guide.whyItMatters) teile.push(guide.whyItMatters);
  return teile.filter(Boolean).join("\n\n");
}
