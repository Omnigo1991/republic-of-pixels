import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-article px-4 sm:px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Impressum</h1>

      <div className="mt-6 rounded-xl border border-warning/30 bg-warning/[0.08] p-4 text-sm text-text-secondary">
        Platzhaltertext — bitte vor Live-Schaltung mit den echten Angaben (Betreiber, Anschrift,
        Kontakt, ggf. Handelsregister/USt-ID) ausfüllen und rechtlich prüfen lassen. Diese Seite
        ersetzt keine Rechtsberatung.
      </div>

      <div className="prose-rop mt-8">
        <h2>Angaben gemäss § 5 TMG</h2>
        <p>
          Republic of Pixels<br />
          [Vollständiger Name / Firmenbezeichnung]<br />
          [Strasse und Hausnummer]<br />
          [PLZ und Ort]<br />
          [Land]
        </p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: redaktion@republicofpixels.com<br />
          Instagram: @republicofpixels
        </p>

        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>[Name der verantwortlichen Person]<br />[Anschrift wie oben]</p>

        <h2>Haftungsausschluss</h2>
        <p>
          Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte
          externer Links. Für den Inhalt der verlinkten Seiten sind ausschliesslich deren Betreiber
          verantwortlich.
        </p>

        <h2>Bildrechte</h2>
        <p>
          Redaktionelle Grafiken auf Republic of Pixels werden ausschliesslich generativ/code-basiert
          erstellt und verwenden keine fremden Marken- oder Spiele-Assets.
        </p>
      </div>
    </div>
  );
}
