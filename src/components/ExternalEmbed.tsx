"use client";

import { useEffect, useRef, useState } from "react";
import type { EmbedPlatform } from "@/lib/types";

// Eingebettete Social-Posts/Videos (X/Reddit/YouTube) laden Inhalte der
// jeweiligen Plattform nach, die Cookies setzen können — deshalb erst nach
// explizitem Klick, passend zu unserer cookielosen Grundhaltung (siehe
// /cookies). YouTube läuft zusätzlich über die datensparsame
// youtube-nocookie.com-Domain, sobald zugestimmt wurde.
const PLATFORM_META: Record<EmbedPlatform, { label: string; script: string | null }> = {
  twitter: { label: "X", script: "https://platform.twitter.com/widgets.js" },
  reddit: { label: "Reddit", script: "https://embed.redditmedia.com/widgets/platform.js" },
  youtube: { label: "YouTube", script: null },
};

function extractYouTubeId(url: string): string | null {
  return (
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)?.[1] ??
    null
  );
}

declare global {
  interface Window {
    twttr?: { widgets: { load: (el?: HTMLElement) => void } };
  }
}

export function ExternalEmbed({ platform, url }: { platform: EmbedPlatform; url: string }) {
  const [geladen, setGeladen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const meta = PLATFORM_META[platform];

  useEffect(() => {
    if (!geladen || !meta.script) return;
    if (document.querySelector(`script[src="${meta.script}"]`)) {
      window.twttr?.widgets.load(containerRef.current ?? undefined);
      return;
    }
    const script = document.createElement("script");
    script.src = meta.script;
    script.async = true;
    document.body.appendChild(script);
  }, [geladen, meta.script]);

  if (!geladen) {
    return (
      <div className="my-8 rounded-2xl border border-border-default bg-surface-card p-6 text-center not-prose">
        <p className="mb-2 text-[13px] font-semibold tracking-wide text-text-tertiary">
          EXTERNER INHALT VON {meta.label.toUpperCase()}
        </p>
        <p className="mb-4 text-sm text-text-secondary">
          Beim Laden werden Daten an {meta.label} übermittelt, und {meta.label} kann Cookies setzen.
        </p>
        <button
          onClick={() => setGeladen(true)}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#0F0D2C] hover:opacity-90 transition-opacity"
        >
          Externe Inhalte zulassen
        </button>
      </div>
    );
  }

  if (platform === "youtube") {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;
    return (
      <div className="relative my-8 aspect-video overflow-hidden rounded-2xl border border-border-subtle not-prose">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title="YouTube-Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="my-8 not-prose">
      {platform === "twitter" ? (
        <blockquote className="twitter-tweet" data-theme="dark">
          <a href={url}>{url}</a>
        </blockquote>
      ) : (
        <blockquote className="reddit-embed-bq" data-embed-theme="dark">
          <a href={url}>Reddit-Beitrag</a>
        </blockquote>
      )}
    </div>
  );
}
