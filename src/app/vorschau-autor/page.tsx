import Link from "next/link";

// NUR VORSCHAU (Tim, 29.08.2026: "Kannst du mir ein Artikelbild schicken wie
// es aussieht, wenn 'von Tim' steht? Vielleicht können wir sogar ein kleines
// Icon von meinem Bild daneben setzen").
//
// Anlass ist die Discover-Null: In unseren strukturierten Daten steht als
// Autor eine Organisation, und unter jedem Artikel steht "Republic of Pixels
// Redaktion" - also niemand. Google bewertet bei Nachrichten ausdrücklich,
// ob hinter einem Text ein erkennbarer Mensch steht.
//
// Diese Datei wird nach der Entscheidung wieder gelöscht. Sie ist nicht
// verlinkt und trägt noindex.

export const metadata = { robots: { index: false, follow: false } };

/** Die Autorenzeile exakt wie auf der echten Artikelseite, nur mit Varianten. */
function Autorenzeile({
  bild,
  name,
  rolle,
}: {
  bild: string;
  name: string;
  rolle?: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-border-subtle py-4">
      <Link href="/ueber-uns" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-navy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bild} alt="" className="h-full w-full object-cover" />
        </span>
        <span className="text-sm font-bold text-accent">{name}</span>
        {rolle && (
          <span className="text-sm text-text-tertiary">{rolle}</span>
        )}
      </Link>
      <span className="text-sm text-text-tertiary">29. August 2026 · 07:41 Uhr</span>
      <span className="text-sm text-text-tertiary">3 Min. Lesezeit</span>
    </div>
  );
}

function Kopf({ titel }: { titel: string }) {
  return (
    <p className="mb-3 mt-14 text-[13px] font-semibold uppercase tracking-wider text-accent">
      {titel}
    </p>
  );
}

/** Der Artikelkopf darüber, damit die Zeile im echten Zusammenhang steht. */
function Artikelkopf() {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/[0.12] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-accent">
          News
        </span>
        <span className="inline-flex items-center rounded-full border border-border-subtle px-2.5 py-1 text-[11px] font-semibold tracking-wide text-text-secondary">
          Xbox
        </span>
      </div>
      <p className="mb-2 text-sm font-bold uppercase tracking-wider text-accent">Xbox</p>
      <h1 className="schrift-normal w-fit bg-[linear-gradient(120deg,#02F0D1,#FF2E97)] bg-clip-text pb-1.5 text-[29px] font-bold leading-[1.13] tracking-[-0.015em] text-transparent sm:text-[42px]">
        Der nächsten Xbox könnte das Laufwerk fehlen - weil es niemand mehr baut
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-text-secondary sm:text-[21px] sm:leading-[1.45]">
        Ein unbestätigter Bericht spricht von einer kollabierenden Lieferkette für
        optische Laufwerke - und plötzlich klingt Microsofts Disc-to-Digital-Programm
        nach Vorbereitung
      </p>
    </>
  );
}

export default function VorschauAutor() {
  return (
    <main className="mx-auto max-w-article px-4 pb-24 pt-10 sm:px-6">
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-accent">
        Vorschau, nicht verlinkt
      </p>
      <h2 className="mb-3 text-[26px] font-bold text-text-primary sm:text-[32px]">
        Wer schreibt hier eigentlich?
      </h2>
      <p className="max-w-[62ch] text-[16px] leading-relaxed text-text-secondary">
        Fünf Fassungen derselben Zeile, im echten Artikelkopf. Alles andere ist
        unverändert: gleiche Schrift, gleiche Grössen, gleiche Linien.
      </p>

      <Kopf titel="Heute" />
      <Artikelkopf />
      <Autorenzeile bild="/brand/r-avatar.png" name="Republic of Pixels Redaktion" />

      <Kopf titel="A · von Tim" />
      <Autorenzeile bild="/team/tim.jpg" name="von Tim" />

      <Kopf titel="B · nur der Name" />
      <Autorenzeile bild="/team/tim.jpg" name="Tim Winiger" />

      <Kopf titel="C · Name mit Rolle" />
      <Autorenzeile bild="/team/tim.jpg" name="Tim Winiger" rolle="Gründer & Herausgeber" />

      <Kopf titel="D · von Tim Winiger" />
      <Autorenzeile bild="/team/tim.jpg" name="von Tim Winiger" />

      <Kopf titel="E · Redaktion mit Gesicht" />
      <Autorenzeile bild="/team/tim.jpg" name="Tim Winiger" rolle="Republic of Pixels" />

      <Kopf titel="Das Bild aus der Nähe" />
      <p className="mb-5 max-w-[62ch] text-[15px] leading-relaxed text-text-secondary">
        Links die echte Grösse auf der Artikelseite (32 px), daneben zweifach und
        dreifach vergrössert - damit du den Ausschnitt beurteilen kannst.
      </p>
      <div className="flex items-end gap-7">
        {[32, 64, 96].map((px) => (
          <div key={px} className="text-center">
            <span
              className="flex items-center justify-center overflow-hidden rounded-full bg-navy"
              style={{ height: px, width: px }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/team/tim.jpg" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="mt-2 block text-[12px] text-text-tertiary">{px} px</span>
          </div>
        ))}
      </div>
    </main>
  );
}
