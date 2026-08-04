import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LogoMark } from "@/components/Logo";

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
  },
  twitter: {
    card: "summary_large_image",
    site: "@republicofpixels",
  },
  icons: {
    icon: "/favicon.svg",
  },
  verification: {
    google: "wxFhSG7MVW86RVD2rwUL7avrhlhj7NI1AbBdhr1SAGs",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="min-h-screen bg-bg-base font-sans antialiased">
        <Header />
        {/* Grosses Markenzeichen unterhalb des Headers, links im Contentraster —
            scrollt mit der Seite (nicht sticky), Vorbild-Referenz des Betreibers. */}
        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 pt-7 sm:pt-9">
          <Link href="/" aria-label="Republic of Pixels – Startseite" className="inline-block group">
            <LogoMark className="h-14 sm:h-16 w-auto text-accent-brand transition-transform duration-300 group-hover:scale-[1.04]" />
          </Link>
        </div>
        <main>{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
