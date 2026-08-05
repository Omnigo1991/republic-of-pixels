import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import { StatistikCockpit } from "@/components/StatistikCockpit";

export const metadata: Metadata = {
  title: "Statistik — Redaktion",
  robots: { index: false },
};

export default function StatistikSeite() {
  return (
    <>
      <Masthead />
      <StatistikCockpit />
    </>
  );
}
