# Wettbewerbsvergleich — Schritt 2 der Master Prompt

Stand: 4. August 2026. Methode: Live-Analyse der Startseiten (play3, VGC, GamePro; IGN als deutsche Lokalversion), RSS-Frequenzdaten aus unserer Pipeline, ergänzt um Marktwissen zu Eurogamer und Insider Gaming (deren Seiten blocken automatisierte Abrufe).

## 1. Was die Konkurrenz auszeichnet — und was RoP daraus lernt

| Plattform | Kernstärke | Relevanteste Lektion für RoP |
|---|---|---|
| play3.de | Hohe Frequenz (15–20 Artikel/Tag), starke Community (100+ Kommentare/Artikel), klare Struktur Top→Beliebt→Chronik | Frequenz schlägt Perfektion: Sichtbarkeit entsteht durch Takt. Unsere Pipeline muss zuverlässig liefern — das ist seit heute der Fall. |
| IGN | Markenautorität, Review-Scores als zitierfähige Währung, Video/Guides als eigene Traffic-Säulen, deutsche Lokalisierung | Formatvielfalt kommt später; erst Autorität in einem Format (News) aufbauen. |
| Eurogamer | Long-form-Qualität, Supporter-Modell, redaktionelle Persönlichkeit | Personenmarken (Autorenprofile) schaffen Vertrauen — unser generischer "Redaktion"-Autor ist mittelfristig eine E-E-A-T-Schwäche. |
| VGC | "First for News"-Positionierung, Popular-Now-Ranking, Patreon statt Werbung | Schlanke, schnelle News-Seite ohne Werbelast — strukturell unser nächster Verwandter. Beweis, dass der Premium-Ansatz ohne Ad-Flut funktioniert. |
| GamePro | Plattform-Segregation (PS/Xbox/Nintendo-Hubs), Pur-Abo (2,99 €), Affiliate-Deals | Plattform-Hubs haben wir bereits (Kategorie-/Plattformseiten) — sie müssen aber sichtbarer werden. Monetarisierungs-Blaupause für später. |
| Insider Gaming | Exklusiv-Leaks als USP, dadurch Zitierungen überall | Ohne eigene Exklusivquellen nicht kopierbar — aber: schnelle, gut gekennzeichnete Leak-Berichterstattung (unsere Kategorie "Leaks") besetzt dieselbe Nachfrage. |

## 2. Bewertung RoP vs. Wettbewerb (Skala 1–5)

| Dimension | RoP heute | Bester Wettbewerber | Lücke & Begründung |
|---|---|---|---|
| Struktur | 4 | play3 (4) | Ebenbürtig: Top→Beliebt→Chronik ist bewährt und bei uns ruhiger umgesetzt. |
| Navigation | 3 | GamePro (4) | Kategorien+Plattformen vorhanden, aber Plattform-Hubs sind kaum beworben; keine Breadcrumbs. |
| Markenwirkung | 3 | IGN (5) | Logo/Farbwelt stark und eigenständig; es fehlt schiere Präsenz (Content-Menge, Social). |
| Premium-Feeling | 4 | VGC (3) | Unsere Stärke: keine Werbung, ruhige Flächen, konsistente Typo. Werbefreiheit aktiv ausspielen. |
| User Experience | 3 | VGC (4) | Solide, aber tote Interaktionen (Kommentare/Login/Reaktionen sind Attrappen) untergraben Vertrauen. |
| Mobile Experience | 3–4 | GamePro (4) | Responsive sauber; echte Bilder statt Platzhalter heben Mobile stark. |
| SEO | 2–3 | IGN (5) | Technisches Fundament gut (JSON-LD, Sitemap, Feed), aber: keine Search Console, kein Google News, junges Content-Archiv, kaum interne Verlinkung. |
| Autorität | 1 | IGN (5) | Neue Domain, keine Backlinks, keine Zitierungen. Nur durch Zeit + Frequenz + Social aufbaubar. |
| Vertrauen | 2 | Eurogamer (5) | Demo-Artikel mit fiktiven Inhalten sind das grösste Risiko; zudem fehlen Autorenprofile und "Über uns". |
| Lesbarkeit | 4 | Eurogamer (4) | TLDR-Box, "Warum es wichtig ist", saubere Typo — bereits auf Augenhöhe. |
| Nutzerführung | 3 | play3 (4) | Ähnliche-Artikel + Kategorie-Link vorhanden; es fehlen "Meistgelesen"-Echtdaten und Themen-Hubs. |

## 3. Priorisierte Verbesserungen

### Sofort (diese Woche)
1. **Fiktive Demo-Artikel entfernen**, sobald ~15 echte Artikel live sind — grösstes Vertrauensrisiko (in Arbeit, Pipeline füllt auf).
2. **Google Search Console + Sitemap einreichen** — ohne Indexierung kein SEO-Wachstum; zusätzlich Google-News-Publisher-Antrag stellen. *(Einziger Schritt, der den Betreiber ~5 Min. braucht.)*
3. **Tote Interaktionen entschärfen:** Kommentar-Attrappe und Login-Buttons ausblenden, bis echte Funktionen existieren; Reaktions-Bar client-seitig persistieren oder entfernen. Ehrlichkeit = Premium.
4. **"Über uns"-Seite** mit Redaktionsverständnis und Transparenzhinweis zur KI-gestützten Erstellung mit Quellenangabe — Vertrauens- und Rechtsvorsorge.

### 30 Tage
5. **Interne Verlinkung automatisieren:** Pipeline verlinkt neue Artikel auf 2–3 thematisch passende Bestandsartikel im Fliesstext (SEO + Verweildauer).
6. **Meistgelesen auf Echtdaten umstellen:** Vercel Analytics einbinden; popularityRank täglich aus echten Aufrufen setzen statt Auffüll-Logik.
7. **Plattform-Hubs aufwerten:** eigene Intro-Texte je Plattform-Seite (SEO-Landingpages), Header-Navigation prominenter.
8. **Newsletter-Fundament** (z. B. wöchentlicher Digest aus den Top-Artikeln der Pipeline) — einziges Owned-Audience-Instrument neben Instagram.

### 90 Tage
9. **Autorenprofil-System:** auch bei automatisierter Erstellung kuratierte Redaktionsidentität mit Profilseite (E-E-A-T).
10. **Themen-Hubs** ("GTA 6", "Switch 2") als kuratierte Landingpages für Evergreen-Suchtraffic.
11. **Monetarisierungs-Entscheid:** werbefrei bleiben und GamePro-Pur-artiges Mitglieder-Modell prüfen vs. dezente Affiliate-Deals — erst ab messbarem Traffic sinnvoll.
12. **Instagram-Automatisierung:** Pipeline erzeugt pro Top-Artikel eine Kachel (Bild + Headline) zur manuellen Freigabe.
