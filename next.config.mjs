/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // BILD-NOTFALL 15.08.2026: Vercels Bild-Optimierer liefert 402
  // "Payment Required" — das Optimierungs-Kontingent des Plans ist
  // aufgebraucht, und damit fielen ALLE nicht gecachten Artikelbilder
  // auf der Live-Seite aus. Unsere Pipeline erzeugt die Bilder bereits
  // als fertig optimierte 1600px-WebPs (~80 KB); wir liefern sie direkt
  // aus, statt sie erneut durch den Optimierer zu schicken.
  //
  // Nachgezogen am 17.08.2026: Dieser Zweig entstand vor dem Notfall und
  // hatte den Eintrag nie. Deshalb war in der Vorschau KEIN einziges
  // Bild zu sehen, waehrend die Live-Seite normal lief.
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
