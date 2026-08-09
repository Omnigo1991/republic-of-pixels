// Gemeinsame Teilen-Grundlage für den schwebenden Knopf (TeilenKnopf) und
// die Knopfreihe am Artikelende (ShareButtons) — Tim-Entscheid 09.08.2026:
// EIN System mit zwei Eingängen statt zweier Lösungen.
//
// Icon-Grössen sind optisch ausgeglichen, nicht nominell gleich: Die vier
// Marken-Logos füllen ihr 24er-Feld randvoll (gemessen: Ink 398-400 px bei
// 400 px Nennmass), das X wirkt wegen seiner dicken Diagonalen jedoch
// grösser und wird zurückgenommen; die selbst gezeichneten Strich-Icons
// (E-Mail, Kopieren) sind messbar kleiner und werden angehoben.

export interface Kanal {
  key: string;
  label: string;
  href?: string;
  /** true = kein Direktlink möglich (Instagram), Link wird kopiert */
  kopieren?: boolean;
}

export function kanaeleFuer(url: string, titel: string): Kanal[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titel);
  return [
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${titel} ${url}`)}` },
    // Instagram bietet keinen Teilen-Link im Web — wir kopieren die Adresse
    // und öffnen Instagram, damit sie sich direkt einfügen lässt.
    { key: "instagram", label: "Instagram", href: "https://www.instagram.com/", kopieren: true },
    { key: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { key: "reddit", label: "Reddit", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { key: "mail", label: "E-Mail", href: `mailto:?subject=${t}&body=${u}` },
    { key: "kopieren", label: "Kopieren" },
  ];
}

const MARKEN_PFAD: Record<string, string> = {
  whatsapp:
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
  instagram:
    "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
  x: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
  reddit:
    "M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z",
};

// Optisch ausgeglichene Kantenlängen (Messung 09.08.2026).
const GROESSE: Record<string, number> = {
  whatsapp: 24,
  instagram: 24,
  x: 22,
  reddit: 24,
  mail: 28,
  kopieren: 29,
};

export function KanalIcon({ kanal, basis = 24 }: { kanal: string; basis?: number }) {
  const px = (GROESSE[kanal] ?? 24) * (basis / 24);
  const gemeinsam = { width: px, height: px, viewBox: "0 0 24 24", "aria-hidden": true } as const;

  if (MARKEN_PFAD[kanal]) {
    return (
      <svg {...gemeinsam} fill="currentColor">
        <path d={MARKEN_PFAD[kanal]} />
      </svg>
    );
  }
  if (kanal === "mail") {
    return (
      <svg {...gemeinsam} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.8" y="4.4" width="20.4" height="15.2" rx="2.5" />
        <path d="m2.6 6.1 9.4 6.7 9.4-6.7" />
      </svg>
    );
  }
  return (
    <svg {...gemeinsam} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="8.4" y="8.4" width="12.4" height="12.4" rx="2.6" />
      <path d="M14.8 4.6H5.2a2.2 2.2 0 0 0-2.2 2.2v9.6" />
    </svg>
  );
}

// Papierflieger für den schwebenden Knopf. Die Verschiebung rückt den
// MASSENSCHWERPUNKT in die Kreismitte — der Umriss-Kasten allein täuscht,
// weil die Fläche unten links liegt und oben rechts nur die Spitze
// (gemessen 09.08.2026: 29,5 px Versatz bei 400 px, danach 0,04 px).
export function FliegerIcon({ groesse = 22 }: { groesse?: number }) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g transform="translate(-1.77 1.8)">
        <path d="M21.5 2.5 11 13" />
        <path d="M21.5 2.5 15 21.5l-4-8.5-8.5-4z" />
      </g>
    </svg>
  );
}

// Natives Teilen-Menü, wo der Browser es anbietet (Handys, Safari, Edge).
// Rückgabe false = kein natives Menü, Aufrufer zeigt unser eigenes Panel.
export async function nativTeilen(url: string, titel: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share({ title: titel, url });
    return true;
  } catch (err) {
    // Abbruch durch die Nutzerin ist kein Fehler — und kein Grund, danach
    // noch unser Panel aufzuklappen.
    if ((err as Error)?.name === "AbortError") return true;
    return false;
  }
}
