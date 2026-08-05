import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import { EinstellungenForm } from "@/components/EinstellungenForm";

export const metadata: Metadata = {
  title: "Einstellungen",
  robots: { index: false },
};

export default function EinstellungenSeite() {
  return (
    <>
      <Masthead />
      <EinstellungenForm />
    </>
  );
}
