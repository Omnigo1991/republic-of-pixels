import Link from "next/link";
import { CATEGORY_NAV, PLATFORM_NAV } from "@/lib/articles";

// Horizontale, mit dem Daumen scrollbare Chip-Leiste: macht die vier Content-Kategorien
// auf Mobile ohne Menüaufruf erreichbar (siehe docs/konzept.md §6).
export function CategoryChipBar({ active }: { active?: string }) {
  const items = [{ key: "alle", label: "Alle" }, ...CATEGORY_NAV, ...PLATFORM_NAV];
  return (
    <div className="lg:hidden border-b border-border-subtle bg-bg-base/95">
      <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const href = item.key === "alle" ? "/" : `/kategorie/${item.key}`;
          const isActive = active === item.key;
          // Einheitliche Pill-Rezeptur (Badge-Audit 08.08.2026): inline-flex
          // + leading-none zentriert exakt; der aktive Chip trägt einen
          // transparenten Rand, damit alle Chips gleich hoch sind.
          return (
            <Link
              key={item.key}
              href={href}
              className={`inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-1.5 text-[13px] font-medium leading-none whitespace-nowrap transition-colors ${
                isActive
                  ? "border-transparent bg-accent text-bg-base"
                  : "border-border-subtle bg-surface-panel text-text-secondary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
