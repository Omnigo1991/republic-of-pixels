import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { VisitTracker } from "@/components/VisitTracker";
import { TeilenKnopf } from "@/components/TeilenKnopf";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://www.republicofpixels.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Republic of Pixels — Gaming-News, Leaks & Reviews",
    template: "%s — Republic of Pixels",
  },
  description:
    "Republic of Pixels ist die deutschsprachige Gaming-Newsplattform für PC, PlayStation, Xbox und Nintendo — Breaking News, Leaks, Reviews und Einordnung ohne Clickbait.",
  keywords: [
    "Gaming News",
    "Gaming Deutschland",
    "PlayStation News",
    "Xbox News",
    "Nintendo News",
    "PC Gaming",
    "Leaks",
    "Reviews",
  ],
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Republic of Pixels",
    url: SITE_URL,
    // Ohne Vorschaubild zeigen WhatsApp, Telegram und Co. beim Teilen der
    // Startseite nur grauen Text (09.08.2026).
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "Republic of Pixels" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@republicofpixels",
  },
  // Icons für Teilen-Menüs und Startbildschirm (09.08.2026): iOS zeigt im
  // nativen Teilen-Menü das apple-touch-icon — fehlt es, erscheint ein
  // generisches Browser-Symbol statt unserer Marke. SVG allein genügt dort
  // nicht, es braucht PNG.
  icons: {
    // favicon.ico ZUERST: Safari (macOS wie iOS) greift für das Symbol im
    // Teilen-Menü darauf zurück und ignoriert SVG-Favicons — fehlte die
    // Datei, zeigte es den generischen Kompass (Tim, 09.08.2026).
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Google-Discover-Voraussetzung: Ohne "max-image-preview: large" zeigt
  // Google nur Mini-Thumbnails — grosse Vorschaubilder sind aber praktisch
  // die Eintrittskarte für Discover-Ausspielung.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "wxFhSG7MVW86RVD2rwUL7avrhlhj7NI1AbBdhr1SAGs",
  },
};

// Marken-Verknüpfung für Suchmaschinen (08.08.2026): sameAs verbindet die
// Website mit unseren offiziellen Social-Profilen zu EINER Marke im
// Knowledge Graph — stärkt Marken-Suche und E-E-A-T.
const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  name: "Republic of Pixels",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/brand/r-mark-navy.png`,
    width: 401,
    height: 464,
  },
  sameAs: [
    "https://www.instagram.com/republicofpixels/",
    "https://x.com/republic_pixels",
    "https://www.tiktok.com/@republicofpixels",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="min-h-screen bg-bg-base font-sans antialiased">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
        {/* Masthead wird pro Seitentyp gerendert (Masthead.tsx: brand/section/slim). */}
        <main>{children}</main>
        <Footer />
        {/* Teilt immer die aktuelle Seite (Tim, 09.08.2026) — deshalb im
            Layout und nicht pro Seite. */}
        <TeilenKnopf />
        <VisitTracker />
        <Analytics />
      </body>
    </html>
  );
}
