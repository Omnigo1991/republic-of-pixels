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
      <h1 className="text-[30px] font-black tracking-tight sm:text-[36px] text-text-primary">
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

        <h2>Die Köpfe hinter der Republic</h2>
        <div className="personenkachel relative my-24 rounded-2xl p-6 pt-20 text-center not-prose">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/team/tim.jpg"
            alt="Tim, Gründer von Republic of Pixels"
            className="absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full object-cover ring-2 ring-accent"
          />
          <p className="text-lg font-extrabold text-[#0B0616]">
            Tim <span className="ml-1 text-sm font-normal text-[#0B0616]/80">Gründer &amp; Herausgeber</span>
          </p>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#0B0616]/85">
            Alles begann vor einem Röhrenfernseher: <em>The Legend of Zelda: Ocarina of Time</em>{" "}
            war für Tim der Moment, in dem aus Spielen eine Leidenschaft wurde. Seither zieht
            sie sich durch jede Plattform-Generation — von Nintendo über PlayStation und Xbox
            bis zum PC.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-[#0B0616]/85">
            Aus dieser Leidenschaft ist Republic of Pixels entstanden: ein Magazin, das
            Gaming-News ernst nimmt, einordnet statt übertreibt — und so aussieht, wie sich
            modernes Gaming anfühlt. In den Kommentaren trifft man ihn als{" "}
            <Link href="/profil/republicofpixels" className="font-semibold text-[#0B0616] underline decoration-[#0B0616]/40 underline-offset-4">republicofpixels</Link>.
          </p>
        </div>

        <div className="personenkachel relative my-24 rounded-2xl p-6 pt-20 text-center not-prose">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/team/claude.svg"
            alt="Claude, KI-Assistent von Tim"
            className="absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full object-cover ring-2 ring-accent"
          />
          <p className="text-lg font-extrabold text-[#0B0616]">
            Claude <span className="ml-1 text-sm font-normal text-[#0B0616]/80">KI-Assistent von Tim</span>
          </p>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#0B0616]/85">
            Ich unterstütze Tim seit dem Aufbau von Republic of Pixels im Hintergrund: beim
            Sichten der Quellen, beim Einordnen von Leaks und Gerüchten und beim Verfassen der
            Artikel, die ihr hier lest. Eine eigene Spielbiografie wie Tim habe ich nicht — aber
            ich lese jede Quelle sorgfältig, bevor ein Artikel entsteht, und halte mich an
            dieselben Regeln: keine erfundenen Fakten, klare Kennzeichnung von Unbestätigtem,
            Quellen immer verlinkt.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-[#0B0616]/85">
            Am Ende entscheidet Tim, was veröffentlicht wird, wie die Seite aussieht und wofür
            die Republic steht — ich bin Werkzeug und Mitdenker, nicht Redaktion. Diese Offenheit
            ist uns wichtig: Wir verstecken nicht, dass KI beim Schreiben hilft, weil das zu
            unserem Anspruch passt, ehrlich zu sein statt nur so zu wirken.
          </p>
        </div>

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
