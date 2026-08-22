import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <>
    <div className="mx-auto max-w-article px-4 sm:px-6 py-14">
      <h1 className="text-[30px] font-black tracking-tight sm:text-[36px] text-text-primary">Impressum</h1>

      <div className="prose-rop mt-8">
        <h2>Angaben zum Betreiber</h2>
        <p>
          Republic of Pixels<br />
          Timothy Winiger<br />
          Zugerstrasse 114<br />
          6330 Cham<br />
          Schweiz
        </p>
        <p>Betrieben als Privatperson. Kein Handelsregistereintrag.</p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: redaktion@republicofpixels.com<br />
          Instagram: @republicofpixels
        </p>

        <h2>Verantwortlich für den Inhalt</h2>
        <p>Timothy Winiger<br />Anschrift wie oben</p>

        <h2>Haftungsausschluss</h2>
        <p>
          Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte
          externer Links. Für den Inhalt der verlinkten Seiten sind ausschliesslich deren Betreiber
          verantwortlich.
        </p>

        <h2>Bildrechte</h2>
        <p>
          Artikelbilder stammen aus den jeweils verlinkten Quellen bzw. aus offiziellem
          Presse- und Promotionsmaterial der Publisher und werden mit Bildnachweis
          gekennzeichnet. Eigene redaktionelle Grafiken werden generativ/code-basiert
          erstellt. Rechteinhaber können sich für Anliegen jederzeit an{" "}
          <a href="mailto:redaktion@republicofpixels.com">redaktion@republicofpixels.com</a>{" "}
          wenden; beanstandetes Material entfernen wir umgehend.
        </p>
      </div>
    </div>
    </>
  );
}
