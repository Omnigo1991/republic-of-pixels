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
          return (
            <Link
              key={item.key}
              href={href}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-accent text-bg-base"
                  : "bg-surface-card text-text-secondary border border-border-subtle"
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
