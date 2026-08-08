import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Host-Kanonisierung (Google-Duplikat-Meldung vom 08.08.2026): Die
// Vercel-Standardadresse (republic-of-pixels-preview.vercel.app) lieferte
// die komplette Website als indexierbare Kopie aus — Google meldete
// "Duplikat – vom Nutzer nicht als kanonisch festgelegt". Jede fremde
// Host-Variante wird dauerhaft (308) auf die echte Domain umgeleitet;
// localhost bleibt für die Entwicklung unangetastet.
const CANONICAL_HOST = "www.republicofpixels.com";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host === CANONICAL_HOST || host.startsWith("localhost")) {
    return NextResponse.next();
  }
  const ziel = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${CANONICAL_HOST}`);
  return NextResponse.redirect(ziel, 308);
}

export const config = {
  // Statische Assets ausnehmen — nur Seiten/Routen kanonisieren.
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
