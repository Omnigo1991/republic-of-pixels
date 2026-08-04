import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-article px-4 sm:px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Cookie-Richtlinie</h1>

      <div className="mt-6 rounded-xl border border-warning/30 bg-warning/[0.08] p-4 text-sm text-text-secondary">
        Platzhaltertext — Kategorien final an die tatsächlich eingesetzten Dienste anpassen, bevor
        ein Cookie-Consent-Banner live geschaltet wird.
      </div>

      <div className="prose-rop mt-8">
        <h2>Notwendige Cookies</h2>
        <p>Für den Betrieb der Seite technisch erforderlich (z. B. Login-Session, Sicherheits-Token). Diese können nicht deaktiviert werden.</p>

        <h2>Funktionale Cookies</h2>
        <p>Speichern Einstellungen wie z. B. bereits gelesene Artikel oder Anzeige-Präferenzen.</p>

        <h2>Analyse-Cookies</h2>
        <p>
          Helfen uns zu verstehen, welche Artikel gelesen werden, um die "Beliebt bei
          Lesern"-Sektion automatisiert zu berechnen. Werden nur mit deiner Zustimmung gesetzt.
        </p>

        <h2>Verwaltung deiner Einstellungen</h2>
        <p>
          Du kannst deine Cookie-Einstellungen jederzeit über den Consent-Banner am unteren
          Bildschirmrand anpassen oder widerrufen.
        </p>
      </div>
    </div>
  );
}
