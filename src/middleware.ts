import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Host-Kanonisierung (Google-Duplikat-Meldung vom 08.08.2026): Die
// Vercel-Standardadresse (republic-of-pixels-preview.vercel.app) lieferte
// die komplette Website als indexierbare Kopie aus — Google meldete
// "Duplikat – vom Nutzer nicht als kanonisch festgelegt". Jede fremde
// Host-Variante wird dauerhaft (308) auf die echte Domain umgeleitet;
// localhost bleibt für die Entwicklung unangetastet.
const CANONICAL_HOST = "www.republicofpixels.com";

// Eigene Aufrufe (Fund 09.08.2026): Die Weiche kannte nur das Wort
// "localhost". Next.js holt Bilder für den Optimierer aber intern nach —
// mal über 127.0.0.1 oder ::1, mal ganz ohne Host-Kopfzeile. Diese
// Aufrufe galten als fremder Host und wurden auf die Produktivdomain
// umgeleitet; der Optimierer bekam eine Umleitung statt eines Bildes und
// in der lokalen Vorschau blieb JEDES Artikelfoto leer. In der Produktion
// kommen diese Hosts nicht vor, die Kanonisierung bleibt unberührt.
const ENTWICKLUNGS_HOSTS = ["", "localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"];

function istEntwicklung(host: string) {
  const ohnePort = host.replace(/:\d+$/, "");
  return ENTWICKLUNGS_HOSTS.includes(ohnePort);
}

export function middleware(req: NextRequest) {
  // Vorschau-Umgebungen (Fund 15.08.2026): Vercel-Branch-Vorschauen liefen
  // in dieselbe Umleitung — jede Vorschau-Adresse landete sofort auf der
  // Live-Domain, kein Entwurf war je als Vorschau anschaubar. In der
  // Produktion setzt Vercel VERCEL_ENV="production"; alles andere
  // (preview, development) darf unkanonisiert ausliefern. Google sieht
  // Vorschauen nicht: Vercel schützt sie mit Anmeldung und noindex.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return NextResponse.next();
  }
  const host = req.headers.get("host") ?? "";
  if (host === CANONICAL_HOST || istEntwicklung(host)) {
    return NextResponse.next();
  }
  const ziel = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${CANONICAL_HOST}`);
  return NextResponse.redirect(ziel, 308);
}

export const config = {
  // Statische Assets ausnehmen — nur Seiten/Routen kanonisieren.
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
