import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Über uns",
  description:
    "Was Republic of Pixels ist, wofür wir stehen und wie unsere Redaktion arbeitet — unabhängig, transparent und ohne Clickbait.",
};

export default function UeberUnsPage() {
  return (
    <>
      <Masthead />
    <div className="mx-auto max-w-article px-4 sm:px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
        Über Republic of Pixels
      </h1>

      <div className="prose-rop mt-8">
        <p>
          Republic of Pixels ist eine unabhängige, deutschsprachige Gaming-Newsplattform für
          PC, PlayStation, Xbox und Nintendo. Unser Anspruch: Gaming-Journalismus, der sich wie
          ein kuratiertes Magazin liest — ruhige Gestaltung, klare Einordnung, keine
          Clickbait-Überschriften und keine Werbeflut.
        </p>

        <h2>Wofür wir stehen</h2>
        <ul>
          <li><strong>Einordnung statt Lärm:</strong> Jeder Artikel beantwortet, warum eine Nachricht relevant ist — nicht nur, dass sie passiert ist.</li>
          <li><strong>Klare Kennzeichnung:</strong> Leaks und Gerüchte sind als unbestätigt markiert und werden nie als Fakten verkauft.</li>
          <li><strong>Quellentransparenz:</strong> Jede Meldung verlinkt ihre Originalquellen am Ende des Artikels.</li>
        </ul>

        <h2>Wie unsere Redaktion arbeitet</h2>
        <p>
          Republic of Pixels setzt auf ein technologiegestütztes Redaktionssystem: Unsere
          Software beobachtet rund um die Uhr die verlässlichsten internationalen und
          deutschsprachigen Gaming-Quellen, prüft Meldungen auf Relevanz und erstellt daraus
          mit Unterstützung von künstlicher Intelligenz eigenständige deutschsprachige
          Artikel. Jeder Artikel basiert ausschliesslich auf den verlinkten Quellen,
          durchläuft automatische Qualitätsprüfungen und nennt sein Bildmaterial mit
          Herkunftsnachweis. Kuratierung, Strategie und Verantwortung liegen beim
          Herausgeber.
        </p>
        <p>
          Fehler können trotz aller Sorgfalt passieren. Wenn dir einer auffällt, freuen wir
          uns über eine Nachricht an{" "}
          <a href="mailto:redaktion@republicofpixels.com">redaktion@republicofpixels.com</a> —
          wir korrigieren schnell und transparent.
        </p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href="mailto:redaktion@republicofpixels.com">redaktion@republicofpixels.com</a><br />
          Instagram:{" "}
          <a href="https://www.instagram.com/republicofpixels" target="_blank" rel="noreferrer noopener">
            @republicofpixels
          </a>
        </p>
        <p>
          Rechtliche Angaben findest du im <Link href="/impressum">Impressum</Link>.
        </p>
      </div>
    </div>
    </>
  );
}
