import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";

export const metadata: Metadata = { title: "Datenschutz" };

export default function DatenschutzPage() {
  return (
    <>
      <Masthead />
    <div className="mx-auto max-w-article px-4 sm:px-6 py-14">
      <h1 className="text-[30px] font-black tracking-tight sm:text-[36px] text-text-primary">Datenschutzerklärung</h1>

      <div className="prose-rop mt-8">
        <h2>1. Verantwortlicher</h2>
        <p>
          Republic of Pixels, Timothy Winiger, Zugerstrasse 114, 6330 Cham, Schweiz<br />
          E-Mail: redaktion@republicofpixels.com
        </p>
        <p>
          Es gilt primär das Schweizer Datenschutzgesetz (revDSG). Für Besucher:innen aus der
          EU wenden wir zusätzlich die Grundsätze der DSGVO an.
        </p>

        <h2>2. Welche Daten wir verarbeiten</h2>
        <ul>
          <li>Konto- und Profildaten bei Registrierung (Benutzername, E-Mail, Avatar, Login-Anbieter)</li>
          <li>Kommentare und Reaktionen, die du auf der Plattform veröffentlichst</li>
          <li>Technische Zugriffsdaten (z. B. gekürzte IP-Adresse, Browsertyp) zur Sicherheit und Reichweitenmessung</li>
          <li>Technisch notwendige lokale Speicherung im Browser (keine Tracking-Cookies) - Details siehe <a href="/cookies">Cookies</a></li>
        </ul>

        <h2>3. Login über Google, Discord oder E-Mail</h2>
        <p>
          Bei der Anmeldung über Google oder Discord werden ausschliesslich die zur Kontoerstellung
          notwendigen Daten (z. B. Name, E-Mail-Adresse) an unseren Authentifizierungsdienstleister
          übermittelt. Es findet keine Weitergabe an Dritte zu Werbezwecken statt.
        </p>

        <h2>4. Hosting und Infrastruktur</h2>
        <p>
          Diese Website wird über Vercel gehostet. Nutzerkonten, Kommentare und Reaktionen werden in
          einer separaten Datenbank (Supabase, EU-Region sofern verfügbar) gespeichert.
        </p>

        <h2>5. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung
          deiner Daten sowie auf Datenübertragbarkeit. Wende dich dazu an
          redaktion@republicofpixels.com.
        </p>

        <h2>6. Speicherdauer</h2>
        <p>
          Kontodaten werden bis zur Löschung des Nutzerkontos gespeichert. Kommentare können nach
          Löschung des Kontos anonymisiert weiter sichtbar bleiben, sofern dies für die Nachvollziehbarkeit
          von Diskussionen erforderlich ist.
        </p>
      </div>
    </div>
    </>
  );
}
