import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <>
    <div className="mx-auto max-w-article px-4 sm:px-6 py-14">
      <h1 className="text-[30px] font-black tracking-tight sm:text-[36px] text-text-primary">Cookies</h1>

      <div className="prose-rop mt-8">
        <p>
          Republic of Pixels setzt <strong>keine Cookies</strong> zu Tracking- oder
          Werbezwecken ein. Wir binden auch keine Drittanbieter-Analyse- oder
          Werbedienste (z. B. Google Analytics) ein, die Cookies setzen würden.
        </p>

        <h2>Was wir stattdessen technisch nutzen</h2>
        <p>
          Für den Betrieb der Seite speichern wir ausschliesslich technisch notwendige Daten
          lokal in deinem Browser (<code>localStorage</code>), keine klassischen Cookies:
        </p>
        <ul>
          <li>
            <strong>Login-Sitzung:</strong> Falls du ein Konto hast, wird dein Login-Status
            lokal gespeichert, damit du beim nächsten Besuch eingeloggt bleibst.
          </li>
          <li>
            <strong>Anonyme Besucher-Kennung:</strong> Für unsere eigene, cookielose
            Reichweitenmessung (z. B. für die "Beliebt bei Lesern"-Sektion und unser
            internes Statistik-Cockpit) wird eine zufällige, anonyme Kennung ohne
            Personenbezug lokal gespeichert. Es findet kein Tracking über andere Websites
            hinweg statt.
          </li>
        </ul>

        <h2>Deine Kontrolle</h2>
        <p>
          Du kannst diese lokal gespeicherten Daten jederzeit über die Einstellungen deines
          Browsers löschen (z. B. "Website-Daten löschen"). Da wir keine Cookies setzen, ist
          aktuell kein Cookie-Consent-Banner erforderlich.
        </p>
      </div>
    </div>
    </>
  );
}
