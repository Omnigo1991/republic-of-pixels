"use client";

import { useEffect, useState } from "react";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Zwischenablage nicht verfügbar — kein UI-Fehler nötig */
    }
  }

  const links = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold tracking-wide text-text-tertiary mr-1">TEILEN</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-full border border-border-default bg-surface-card px-3.5 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
        >
          {l.label}
        </a>
      ))}
      <button
        onClick={copyLink}
        className="rounded-full border border-border-default bg-surface-card px-3.5 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
      >
        {copied ? "Link kopiert ✓" : "Link kopieren"}
      </button>
    </div>
  );
}
