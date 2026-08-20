import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import { SearchPanel } from "@/components/SearchOverlay";

export const metadata: Metadata = { title: "Suche" };

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <>
      <Masthead />
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <h1 className="mb-6 text-[30px] font-black tracking-tight text-text-primary sm:text-[36px]">Suche</h1>
      <SearchPanel initialQuery={searchParams.q ?? ""} />
    </div>
    </>
  );
}
