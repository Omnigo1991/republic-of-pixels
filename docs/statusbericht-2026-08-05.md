# Statusbericht — 5. August 2026, Tagesende

## ✅ Heute erledigt und live

**Community-System (komplett neu):**
- Konten: Registrierung/Login per E-Mail + Passwort (funktioniert), Google & Discord vorbereitet (warten nur auf deine Schlüssel)
- Kommentare mit einer Antwort-Ebene, Upvotes, Melden-Button, Löschen eigener Beiträge
- Ranking-System: Punkte (Kommentar +3, Upvote erhalten +2, Upvote vergeben +1), fünf Rang-Badges von Neuankömmling bis Pixel-Legende, Fortschrittsbalken
- Master-Account `republicofpixels`: exklusiver REDAKTION-Badge, Logo als Profilbild (per Pixel-Schwerpunkt exakt zentriert, rund), Hervorhebung überall
- Öffentliche Profilseiten (/profil/nickname) mit Statistiken und letzten Kommentaren
- Einstellungen: Nickname ändern, Profilbild wählen (Initiale / Login-Bild / 12 Pixel-Sprites), Passwort ändern, Abmelden
- Header: Anmelden-Button bzw. Profilbild + Name mit Dropdown (Mein Profil / Einstellungen / Abmelden) — Mobile-Abschneide-Bug per Portal gefixt
- Artikel-Reaktionen als Buttons („Gefällt mir 👍" / „Liebe ich ❤️" / „Gefällt mir nicht 👎" / „Enttäuschend 😞") — aktivieren sich, sobald schema-v2.sql ausgeführt ist

**Bugs gefunden & behoben:**
- Blauer Strich (Safari): Fokusring auf dem Breaking-Ticker nach Klick-Navigation — behoben und in der Safari-Engine verifiziert
- Kommentar-Einfrieren: Auth-Lock-Deadlock der Supabase-Bibliothek — behoben
- Kommentare zeigten (0): mehrdeutiger Datenbank-Join seit der Votes-Tabelle — behoben
- Entfernte Kommentare hinterlassen keine Platzhalter mehr
- Pipeline-Build im GitHub-Runner scheiterte nach Community-Einbau an fehlenden Supabase-Variablen — behoben, Nachhol-Lauf gestartet

**System:** Pipeline läuft stündlich (cron-job.org → Trigger-Route → GitHub → Vercel), aktuell 14 Artikel, Bilder aus Feeds mit Nachweis.

## 🔶 Offen — braucht DICH (heute Abend, zusammen ~15 Min.)

1. **schema-v2.sql ausführen** (~2 Min.): SQL-Editor öffnen → Inhalt von `supabase/schema-v2.sql` einfügen → Run. Aktiviert die Reaktions-Buttons und löscht deine Testkommentare endgültig.
   → https://supabase.com/dashboard/project/yvsrquekxnumvmgmjfpy/sql/new
2. **Google-Login-Schlüssel** (~5 Min.): Anleitung von heute Morgen (Google Cloud Console → OAuth Client → Redirect `https://yvsrquekxnumvmgmjfpy.supabase.co/auth/v1/callback` → Werte bei Supabase unter Providers/Google eintragen)
3. **Discord-Login-Schlüssel** (~4 Min.): analog (discord.com/developers → OAuth2 → Redirect wie oben → Werte bei Supabase unter Providers/Discord)
4. **Hintergrundfarbe entscheiden:** A1–A5 Screenshots liegen im Chat. Empfehlung: A1 Neutral Pur (echtes Graphit ohne Blaustich), Alternative A5 Studio-Grau.
5. **Impressum:** Name + Anschrift des Betreibers (Rechtspflicht, steht noch auf Platzhalter).

## 🔷 Offen — mache ICH (nach deinen Entscheidungen)

- Hintergrund auf gewählte Variante umstellen + deployen
- Google-/Discord-Login live durchtesten, sobald Schlüssel eingetragen
- Google-News-Publisher-Antrag vorbereiten (größter Reichweitenhebel)
- Sitemap-Status in der Search Console nachkontrollieren

## 💡 Vorschläge für Differenzierung (NICHT umgesetzt — deine Auswahl)

1. **Release-Kalender zum Abonnieren (ICS-Feed):** Der Release-Radar als Kalender-Feed — Leser abonnieren ihn einmal in Google/Apple Kalender und haben jeden Spiele-Release automatisch drin. Hat keine deutsche Gaming-Seite; starke Rückkehr-Bindung.
2. **Wochenrückblick + Newsletter:** Die Pipeline schreibt sonntags automatisch „Die Gaming-Woche in 5 Minuten" als Artikel; derselbe Text geht als Newsletter raus (Owned Audience, unabhängig von Google/Social).
3. **Frage der Woche:** Ein automatisch erzeugter Diskussions-Post pro Woche („Welches Remake braucht die Welt wirklich?") — füttert die neue Kommentar-Community gezielt.
4. **Stimmen aus der Community:** Die besten Kommentare der Woche (meiste Upvotes) als kleine Sektion auf der Startseite — belohnt Aktivität sichtbar und zeigt Neuen, dass hier diskutiert wird.
5. **Spiele-Hubs:** Automatische Sammelseiten pro Spiel (/spiel/gta-6: alle Artikel, Release-Datum, Reaktions-Trend) — Evergreen-SEO, das mit jedem Pipeline-Artikel wertvoller wird.
6. **Rang-Badges in Kommentaren:** Ab „Ratsmitglied" erscheint der Rang-Badge neben dem Namen in jeder Diskussion — macht das Ranking im Alltag sichtbar und erstrebenswert.
7. **Breaking-Push-Benachrichtigungen:** Browser-Push (opt-in) nur für Breaking-News — direkter Draht ohne App.
8. **Label-Reviews als Markenzeichen:** Das Review-Label-System aus dem Konzept („Essenziell" statt 87/100) redaktionell aufleben lassen und aktiv vermarkten — „Wir werten nicht in Zahlen".
9. **Pixel-Signature:** Sektions-Trenner und Bild-Hover mit dem Auflöse-Pixel-Motiv aus dem R — das visuelle Element, das nur euch gehört.
10. **Supporter-Modell (später):** Mitgliedschaft mit exklusivem Badge im Ranking-System — Monetarisierung, die die Community-Mechanik nutzt statt Werbung.
