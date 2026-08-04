# Republic of Pixels — Konzept- und Strategiedokument

Stand: August 2026 · Version 1.0 (Grundlage für den Neuaufbau)

## 1. Positionierung

Republic of Pixels ist eine deutschsprachige Gaming-Newsplattform mit dem Anspruch, sich optisch und redaktionell wie ein Premium-Medienprodukt zu verhalten statt wie eine typische Gaming-Seite. Die Analogie ist bewusst Apple, nicht IGN oder Kotaku: ruhige Flächen, klare Hierarchie, keine visuelle Überladung, keine Neon-Ästhetik, keine kindische Pixel-Optik — obwohl der Markenname und das Logo eine Pixel-Herkunft andeuten. Diese Spannung (Pixel-Name, aber Erwachsenen-Design) ist das eigentliche Differenzierungsmerkmal: Republic of Pixels nimmt Gaming ernst, ohne ins Klischee zu verfallen.

Zielgruppe: deutschsprachige Gamer:innen 18-40, die PC- und Konsolen-übergreifend informiert sein wollen, Wert auf saubere Einordnung statt Clickbait legen, und die Marke auch auf Social Media (Instagram) und mobil konsumieren.

Nicht-Ziele: keine Forennische, keine reine Leak-Boulevard-Seite, kein "Best-of-10-Ranking"-Contentfarm-Stil.

## 2. Strukturelle Referenz: play3.de — Analyse

play3.de nutzt eine klassische News-Portal-Struktur: große Top-Story oben, darunter eine Grid-Sektion mit weiteren wichtigen Artikeln, danach eine dichte chronologische Liste mit kleinen Thumbnails links und Text rechts. Diese Struktur funktioniert, weil sie Leser:innen sofort zeigt, was wichtig ist (Top-Story), was gerade diskutiert wird (Popular-Grid) und was der volle Nachrichtenfluss ist (Liste). Republic of Pixels übernimmt dieses Grundprinzip (Top-Story → Beliebt → Chronologisch), aber mit deutlich mehr Weißraum, saubereren Typo-Hierarchien, konsistenten Bildformaten (statt visuell uneinheitlicher Thumbnails) und einer ruhigeren Kartenoptik ohne Rahmenflut. Der Unterschied ist vor allem: play3.de wirkt wie ein Nachrichtenticker, Republic of Pixels soll wirken wie ein kuratiertes Magazin.

## 3. Designsystem — Farb-Tokens (exakt aus dem Logo extrahiert)

Die Werte wurden programmatisch per Pixel-Sampling aus der Datei "Logo-Vorlage (2).png" ermittelt (nicht geschätzt):

- Reines Cyan im Logo: `#02F0D1` (dominanter Fill-Wert der R-Grafik, an mehreren Stellen exakt identisch gemessen)
- Reines Navy im Logo: `#0F0D2C` (dominanter Hintergrundwert, Modalwert aus Pixel-Histogramm)

Daraus abgeleitetes System (mathematisch berechnet per Weiß-/Schwarz-Blend, nicht frei geschätzt):

| Token | Hex | Verwendung |
|---|---|---|
| `--bg-base` | `#0F0D2C` | Seitenhintergrund |
| `--bg-elevated` | `#141230` | Header/Footer-Hintergrund |
| `--surface-card` | `#171533` | Card-Flächen |
| `--surface-card-hover` | `#1B1937` | Card Hover |
| `--border-subtle` | `#201E3B` | dezente Trennlinien |
| `--border-default` | `#292843` | Standard-Rahmen |
| `--border-strong` | `#3A3952` | Fokus-Umrandungen, aktive Cards |
| `--accent` | `#02F0D1` | Primärakzent (Links, Icons, aktive States) |
| `--accent-hover` | `#30F3D9` | Hover auf Akzent-Elementen |
| `--accent-active` | `#02C5AB` | Gedrückt/aktiv |
| `--accent-wash` | `#0D3146` | dezente Flächen-Hinterlegung (z. B. Tag-Pills) |
| `--text-primary` | `#F1F0F2` | Haupttext |
| `--text-secondary` | `#ADADB7` | Meta-Infos, Teaser |
| `--text-tertiary` | `#7D7C8D` | Datum, Lesedauer, Captions |
| `--text-disabled` | `#525167` | deaktivierte Elemente |
| `--success` | `#2ED47A` | Erfolg/Bestätigung |
| `--warning` | `#F5B942` | Warnung, Leak-Kennzeichnung |
| `--error` | `#F1544B` | Fehler, "Nicht empfohlen" |

Diese Tokens werden 1:1 als CSS-Variablen und Tailwind-Theme-Erweiterung implementiert, damit sie an genau einer Stelle gepflegt werden.

## 4. Typografie

Schriftstack: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, sans-serif`. Als Web-Fallback wird zusätzlich Inter (variabel, via `next/font`) geladen, damit Nutzer:innen ohne Apple-Geräte optisch nahezu identische Metriken bekommen (Inter ist metrisch SF Pro sehr ähnlich).

Hierarchie: Display (Top-Story-Headline, 40-56px), H1 (Artikel-Headline, 32-40px), H2 (Zwischenüberschrift, 24-28px), Body (18px Artikeltext, 17px auf Mobile minimal — nie kleiner, da Mindestlesbarkeit auf Mobile Pflicht ist), Meta/Caption (14px). Zeilenhöhe im Fliesstext 1.6-1.7 für ruhige Lesbarkeit. Artikelbreite max. 68 Zeichen pro Zeile (ca. 680px Content-Breite).

## 5. Header — UX-Analyse der geforderten Struktur

Vorgeschlagene Struktur (Desktop): Logo links · BREAKING / NEWS / LEAKS / REVIEWS mittig · PC / PLAYSTATION / XBOX / NINTENDO / Instagram rechts, sticky mit reduzierter Höhe beim Scrollen (72px → 56px).

UX-Bewertung:

Blickführung: Nutzer:innen lesen Header von links nach rechts, aber F-Pattern-Studien zeigen, dass die ersten 2-3 Items nach dem Logo die höchste Fixationsrate haben. Da die mittleren Items (Breaking/News/Leaks/Reviews) inhaltliche Content-Typen sind und die rechten Items (PC/PlayStation/Xbox/Nintendo) Plattform-Filter, ist die Gruppierung inhaltlich korrekt, aber die visuelle Gewichtung sollte das unterstützen: die mittlere Gruppe bekommt etwas kräftigere Typo (Medium statt Regular), die rechte Plattform-Gruppe wird dezent von der Instagram-Aktion getrennt (kleiner vertikaler Divider), damit "Instagram" nicht wie eine fünfte Plattform wirkt, sondern klar als Social-CTA erkennbar ist (leicht andere Farbe: Akzent-Outline statt Textlink).

Klickwahrscheinlichkeit: BREAKING sollte optisch minimal hervorgehoben werden (kleiner Punkt/Live-Indikator in Akzentfarbe), da es der Grund ist, warum jemand mehrmals täglich vorbeischaut. Die Plattform-Links rechts sind eher Wiederkehrer-Navigation (gezielter Besuch), nicht Erstkontakt-Klicks — daher korrekt kleiner/dezenter gewichtet als die mittlere Gruppe.

Empfehlung (umgesetzt): Header in drei klar getrennte Zonen (Logo / Content-Kategorien / Plattformen + Social), mittlere Zone etwas grösser/deutlicher als rechte Zone, rechte Zone mit dezentem "PLATTFORMEN"-Kontext (kein Label nötig, aber visuelle Gruppierung durch Abstand), Instagram-Button als abgesetzter Pill-Button mit Akzent-Outline statt reiner Textlink — das erhöht die Klickwahrscheinlichkeit für den Social-Kanal, ohne die redaktionelle Navigation zu stören.

## 6. Mobile Navigation — Entscheidung

Gewählt: Kombination aus (a) kompaktem Sticky-Header mit Logo + Suche-Icon + Burger, (b) Fullscreen-Menü-Overlay beim Öffnen des Burgers mit klar getrennten Sektionen "Redaktion" (Breaking/News/Leaks/Reviews) und "Plattformen" (PC/PlayStation/Xbox/Nintendo), grosse Touch-Targets (min. 48px Höhe), sowie (c) einer dünnen horizontalen Scroll-Chip-Leiste direkt unter dem Header auf Kategorie- und Startseiten, die die vier Content-Kategorien ohne Menüaufruf erreichbar macht.

Begründung: Ein reines Burger-Menü ist auf Mobile am unauffälligsten (Logo bleibt gross und sichtbar, kein Platzverlust), aber verlangt einen Extra-Klick für die häufigste Aktion (Kategorie wechseln). Die zusätzliche Chip-Leiste löst genau dieses Problem, ohne die Kopfzeile zu überladen — sie ist horizontal scrollbar, mit dem Daumen einhändig bedienbar, und die aktive Kategorie ist optisch hervorgehoben. Ein Search-Overlay (Vollbild, beim Icon-Tap) verhindert, dass die Sucheingabe auf kleinen Screens winzig und frustrierend wird. Verschachtelte Navigation (Menü-in-Menü) wird bewusst vermieden — das Fullscreen-Menü ist genau zwei Ebenen tief (Kategorie/Plattform-Liste, keine Untermenüs).

## 7. "Beliebt bei Lesern" — Mechanik

Kurzfristig (Launch): manuell im Admin-Backend gepflegtes Ranking (Redaktion markiert 3-5 Artikel als "populär", z. B. nach Instagram-Reichweite oder Nachrichtenlage), mit optischer Rang-Kennzeichnung (01-05, dezent, keine kitschigen Flammen-Icons). Mittelfristig: automatische Berechnung aus Klickzahlen der letzten 48-72 Stunden (gewichtet, damit ein alter Viral-Artikel nicht ewig oben bleibt), z. B. via Vercel Web Analytics oder Plausible-Events, mit einem täglichen Cron-Job, der die Top-5 in die Datenbank schreibt. Die Redaktion kann das automatische Ranking jederzeit manuell überschreiben (Trending-Override-Flag).

## 8. Level- und Badge-System

Da "Republic of Pixels" eine Staatsmetapher im Namen trägt, wird die Nutzer-Progression als Bürgerstatus der Republik erzählt statt als generisches "Level 1-99" — das wirkt hochwertiger und markentreuer:

1. Neuankömmling (Start)
2. Bürger:in
3. Beitragende:r
4. Delegierte:r
5. Ratsmitglied
6. Kanzler:in der Republik (höchste Stufe, sehr selten erreichbar)

Aufstieg basiert auf einem Qualitäts-Score, nicht auf reiner Aktivität: positiv gewichtet werden erhaltene Zustimmungen zu Kommentaren, Zeit als aktives Mitglied, sinnvolle/vielfältige Reaktionen; negativ gewichtet werden gemeldete und entfernte Kommentare (stark negativ, auch rückwirkend), Spam-Muster (z. B. viele Kommentare in kurzer Zeit ohne Zustimmung). Reine Kommentarmenge zählt bewusst wenig, um Spam-Anreize zu vermeiden.

Badges (Auszeichnungen für besondere Beiträge, keine Sammel-Achievements im Mobile-Game-Stil):

- Gründungsmitglied — Konto aus der Launch-Phase
- Scharfsinn — für besonders differenzierte, oft positiv bewertete Kommentare
- Quellenchecker — meldet zuverlässig fehlerhafte Informationen oder liefert belastbare Quellen nach
- Community-Stimme — nachhaltiges, konstruktives Engagement über Monate
- Leak-Kompass — differenziertes, sachliches Einordnen von Gerüchten/Leaks statt Spekulation als Fakt zu verkaufen

## 9. Review-Label-System

Statt Punkte-/Sterne-Bewertung nutzt Republic of Pixels ein fünfstufiges, sprachlich klares Label-System:

1. Essenziell — eines der besten Spiele der Saison, uneingeschränkte Empfehlung
2. Klare Empfehlung — hochwertig, kleinere Schwächen, für Genre-Fans Pflicht
3. Empfehlenswert — solide, aber keine Priorität für jedes Budget
4. Für den Sale vormerken — Potenzial vorhanden, aktuell aber zu teuer, zu unfertig oder zu durchwachsen für Vollpreis
5. Nicht empfohlen — Mängel überwiegen deutlich

Jedes Label bekommt eine eigene Akzentfarbe innerhalb der bestehenden Farbpalette (Cyan/Success/Warning/Error-Ableitungen), damit es auf einen Blick lesbar ist, ohne bunt/kitschig zu wirken.

## 10. Community-Konzept (Kommentare, Reaktionen, Login)

Reaktionen sind ohne Login möglich (niedrige Hürde, hohe Interaktionsrate): Gefällt mir, Gefällt mir nicht, Liebe ich, Hype, Interessant, Enttäuschend — sechs Optionen sind bewusst die Obergrenze, mehr würde die UI überladen. Kommentare erfordern Login (Google, Apple, E-Mail/Passwort), erscheinen sofort (optimistic UI), können gemeldet werden, und landen im Moderationsbereich des Admin-Backends. Spam-Schutz technisch über Rate-Limiting pro Nutzer:in/IP, Honeypot-Feld, sowie serverseitige Prüfung auf Linkspam-Muster. Community-Regeln werden als eigene Seite verlinkt und beim ersten Kommentar eines neuen Kontos einmalig als Kurz-Hinweis eingeblendet.

Technische Basis (Empfehlung, siehe Abschnitt 12): Supabase für Auth (Google/Apple/E-Mail), Postgres-Datenbank (Kommentare, Reaktionen, Profile, Badges) und Storage (Avatare). Diese erste Umsetzungsrunde liefert die komplette UI (Kommentarformular, Reaktionsleiste, Login-Buttons, Profil-Seite) bereits hochwertig, aber ohne Live-Anbindung — sobald ein Supabase-Projekt (URL + Keys) hinterlegt ist, wird nur die Datenanbindung ergänzt, das Interface bleibt unverändert.

## 11. Admin-Backend — Funktionsumfang

Kernbereiche: Artikel (Liste mit Status-Filter Entwurf/geplant/veröffentlicht, Editor mit den Feldern aus dem Artikel-Schema, Top-Story-Flag, Sponsored-Flag, geplante Veröffentlichungszeit), Kommentar-Moderation (Warteschlange für gemeldete Kommentare, Sperr-/Freigabe-Aktionen), Nutzerverwaltung (Rollen, Badges manuell vergeben, Level-Übersteuerung), Beliebt-bei-Lesern-Override (manuelles Anheften/Entfernen), Einstellungen (Cookie-Kategorien, rechtliche Texte). Bewusst keine überladenen Dashboards mit Grafikflut — eine klare Liste mit Status-Farbcodierung hat in der Redaktionspraxis höhere Wirkung als ein Analytics-Overkill.

## 12. Automatisierungskonzept für News-Publishing

Ziel: 10+ Artikel/Tag ohne manuelle Freigabe, aber mit eingebauter Qualitätssicherung. Empfohlene Pipeline:

Quellen-Ebene 1 (deutschsprachig, hohe Vertrauenswürdigkeit): GamePro, 4Players, Eurogamer.de, GameStar (RSS), Pressemitteilungen von Sony/Microsoft/Nintendo/Valve direkt.
Quellen-Ebene 2 (international, hohe Reichweite/Aktualität): IGN, GameSpot, PC Gamer, VGC, The Verge Gaming, offizielle Blogs (PlayStation Blog, Xbox Wire, Nintendo Newsroom) — alle mit RSS/API verfügbar.
Quellen-Ebene 3 (Leak-Ecosystem, nur mit klarer Kennzeichnung): bekannte Insider mit Trackrecord (z. B. über X/Twitter-API oder manuell kuratiert), nie als alleinige Quelle für News-Kategorie, nur für Leaks-Kategorie mit Pflicht-Disclaimer.

Bewertungsmatrix pro Quelle (wird als Datensatz im Backend gepflegt, nicht hart codiert): Trackrecord-Score (historische Trefferquote bei Vorhersagen), Aktualität (durchschnittliche Meldezeit vs. Konkurrenz), Rechtssicherheit (Ob Embeds/Zitate ohne Risiko genutzt werden dürfen), Plattform-Abdeckung (deckt die Quelle alle vier Plattformen ab oder ist sie einseitig).

Pipeline-Schritte: 1) RSS/API-Poll alle 10-15 Minuten. 2) Dublettenerkennung per Titel-Embedding-Ähnlichkeit (verhindert, dass 5 Quellen dieselbe News als 5 Artikel erzeugen). 3) Bei "News"/"Breaking": Bestätigung durch mindestens zwei unabhängige Quellen-Ebene-1/2-Treffer, bevor automatisch veröffentlicht wird. 4) Bei "Leaks": Einzelquelle zulässig, aber Pflichtfeld "isLeakOrRumor" setzt automatisch Warnhinweis-Banner. 5) KI-gestützte Artikel-Generierung im Republic-of-Pixels-Stil (Ton, Struktur, Kurzfassung-Box, Warum-wichtig-Box) mit Pflicht-Zitat/Linkangabe der Originalquelle. 6) Automatische Kategorie- und Plattform-Tag-Zuweisung. 7) Automatische Bildauswahl aus dem bestehenden Platzhalter-/Gradient-System (kategoriebasiert), bis ein Rechte-freies Bild-Sourcing-Modul (z. B. lizenzierte Pressebilder-APIs) angebunden ist. 8) Leichte Qualitätsprüfung vor Veröffentlichung (Wortanzahl-Minimum, Pflichtfelder vorhanden, keine verbotenen Begriffe/Marken-Fehlnutzung) — erst danach automatische Freigabe. 9) Bei Grossereignissen (State of Play, Xbox Showcase, Nintendo Direct) wird die Poll-Frequenz automatisch erhöht und ein Sondermodus mit mehr Artikeln/Tag aktiv.

Rechtliche Leitplanken: Keine 1:1-Übernahme fremder Artikeltexte (nur Fakten, eigene Formulierung), Pflichtverlinkung der Originalquelle, keine Nutzung von Marken-Assets/Screenshots ohne geklärte Rechte (siehe Platzhalter-Konzept), Leak-Kennzeichnung ist nicht optional, sondern ein Publish-Blocker, wenn das Feld fehlt.

## 13. Platzhalterbild-Konzept

Statt Rasterbildern (Stockfotos/Screenshots mit Rechte-Risiko) verwendet Republic of Pixels generierte, code-basierte Editorial-Grafiken: dunkle Navy-zu-Schwarz-Gradienten mit einem von fünf abstrakten SVG-Mustern (Schaltkreis-Linien, Partikel-Raster, Controller-Silhouette als Umrisslinie, Wellenform/Equalizer, geometrisches Gitter), jeweils in der exakten Akzentfarbe des Designsystems. Vorteile: keine Rechteproblematik, keine Ladezeit-Kosten (kein Bild-Download), unendlich skalierbar, pro Kategorie leicht unterscheidbar (z. B. Controller-Motiv für Konsolen-News, Schaltkreis-Motiv für Hardware/PC-News), und bereits jetzt automatisierungsfähig (das Automatisierungs-Modul kann das passende Motiv rein anhand der Kategorie/Plattform-Tags wählen, ganz ohne Bild-API).

## 14. Domain- und Vercel-Migrationsplan

1. Bestehendes Vercel-Projekt `republic-of-pixels` (Team Omnigo) bleibt unverändert als Referenz/Backup stehen, wird aber nicht weiterverwendet.
2. Neues Vercel-Projekt wird mit dem hier beschriebenen, sauberen Next.js-Code aufgesetzt und zunächst nur als Preview-Deployment betrieben.
3. Erst nach Freigabe durch den Auftraggeber wird die Domain `republicofpixels.com` (DNS/Nameserver-seitig weiterhin unangetastet) auf das neue Projekt umgehängt — dieser Schritt erfolgt manuell im Vercel-Dashboard oder auf expliziten Wunsch, nicht automatisch durch diese Session.
4. Erst nach der Umstellung wird über eine Löschung oder Archivierung des alten Projekts entschieden.
