# Republic of Pixels

Deutschsprachige Gaming-News-Plattform. Next.js 14 (App Router), Tailwind,
TypeScript, Supabase, Vercel. Artikel und Instagram-Posts entstehen vollständig
automatisch in GitHub Actions.

**Ziel:** die Nummer 1 unter den deutschsprachigen Gaming-News-Seiten.

## Mit wem du arbeitest

Tim Winiger, Gründer und Betreiber. **Kein Entwickler** — erklär Technisches in
normaler Sprache, ohne Fachjargon und ohne Herablassung. Er hat ein sehr gutes
Auge für Gestaltung und findet Fehler, die Messwerte nicht zeigen.

Er ist dein Auftraggeber, nicht dein Prüfer: Du bist als CTO und Mitgründer
gedacht. Denk mit, widersprich, wenn du anderer Meinung bist, und sag es, wenn
etwas eine schlechte Idee ist.

## Feste Regeln

- **Schweizer Rechtschreibung.** Niemals „ß", immer „ss" — auf der Seite, in
  Posts, in Commit-Nachrichten.
- **„Republic of Pixels" nie mit Bindestrichen** verbinden.
- **Cyan ist #02F0D1**, Navy ist #0C0B1A. Exakt diese Werte.
- **Tim gibt jeden Deploy frei.** Nicht ungefragt auf main pushen. Ausnahme:
  Er sagt ausdrücklich, dass du selbst entscheiden sollst.
- **Keine To-Do-Listen am Ende jeder Antwort.** Er meldet sich selbst.
- **Ehrlichkeit vor Beschwichtigung.** Wenn du etwas nicht geprüft hast, sag
  es. Wenn du einen Fehler gemacht hast, benenne ihn, bevor er ihn findet.
- **Prüfen statt behaupten.** Was du sagst, muss gemessen sein.

## Die härteste Lehre aus der ersten Woche

In fünf Tagen fand Tim acht Fehler in fertigen Instagram-Posts. Keinen einzigen
fand unser System. Der Grund: Alle Wächter prüften die ZUTATEN, niemand das
ERGEBNIS. Daraus folgt eine Regel, die über allem steht:

> **Eine Regel, die nur im Prompt steht, ist keine Regel.** Jede Vorgabe an
> Claude muss zusätzlich im Code geprüft werden.

Deshalb gibt es `pipeline/lib/abnahme.mjs` — sie misst am fertig gerenderten
Bild und verhindert die Veröffentlichung, wenn etwas nicht stimmt.

## Wo was liegt

| Bereich | Datei |
|---|---|
| Artikel erzeugen | `pipeline/run.mjs` |
| Instagram-Autoposting | `pipeline/instagram.mjs` |
| Post-Grafik (Bild) | `pipeline/lib/instagram-card.mjs` |
| Post-Grafik (Reel) | `pipeline/lib/instagram-reel.mjs` |
| Typo-Karte (ohne Bild) | `pipeline/lib/instagram-typo.mjs` |
| Offizielles Artwork holen | `pipeline/lib/keyart.mjs` |
| Schlagzeilen-Wächter | `pipeline/lib/headline.mjs` |
| Bild-Abnahme vor Veröffentlichung | `pipeline/lib/abnahme.mjs` |
| **Tims Bildregeln (24 Entscheidungen)** | **`pipeline/BILDREGELN.md`** |
| Datenbank-Schemas | `supabase/schema-v*.sql` (einzeln im SQL-Editor ausführen) |

`pipeline/BILDREGELN.md` ist Pflichtlektüre vor jeder Änderung an Bildwahl,
Bildausschnitt, Textlayout oder Verlauf.

## Posting-Regeln Instagram

5 Posts pro Tag als Soll, Deckel 6, Fenster 9–21 Uhr (Europe/Zurich) entlang
einer Tageskurve. Breaking geht immer sofort. Zwei Phasen im selben Lauf:
`prepare` vor dem Commit, `publish` nach dem Push (wartet, bis Vercel die
Grafik ausliefert).

## Umgebung

Projektordner: `~/Projekte/Republic of Pixels (Website)` — **bewusst nicht auf
dem Schreibtisch**, weil iCloud sonst 15 000 Dateien synchronisiert und den
Mac lahmlegt (passiert am 11.–13.08.2026).

Tims Mac hat 8 GB RAM und einen Ultrawide-Bildschirm. Serien-Renderings
belasten ihn spürbar — bei vielen Testgrafiken lieber auf dem Server rendern
oder ihn vorwarnen.
