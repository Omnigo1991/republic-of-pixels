"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Apple-artiges Einblenden beim Scrollen: Das Element startet unsichtbar/leicht
// versetzt (CSS-Klasse .reveal in globals.css) und wird beim Eintritt in den
// Viewport einmalig eingeblendet. prefers-reduced-motion wird via CSS respektiert.
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Ohne IntersectionObserver (sehr alte Browser, manche Crawler): sofort zeigen.
    if (!("IntersectionObserver" in window)) {
      el.dataset.revealed = "true";
      return;
    }
    // Bereits im Viewport (above the fold): sofort zeigen, kein Nachklappern.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) {
      el.dataset.revealed = "true";
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = "true";
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className ?? ""}`}
      style={delayMs ? ({ "--reveal-delay": `${delayMs}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
