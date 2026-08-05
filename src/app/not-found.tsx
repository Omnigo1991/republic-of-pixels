import Link from "next/link";
import { Masthead } from "@/components/Masthead";

export default function NotFound() {
  return (
    <>
      <Masthead />
    <div className="mx-auto flex max-w-content flex-col items-center justify-center px-4 py-32 text-center">
      <p className="text-sm font-semibold tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text-primary">
        Diese Seite gibt es nicht (mehr)
      </h1>
      <p className="mt-3 max-w-md text-text-secondary">
        Vielleicht wurde der Artikel verschoben oder der Link ist veraltet.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-bg-base hover:bg-accent-hover transition-colors"
      >
        Zur Startseite
      </Link>
    </div>
    </>
  );
}
