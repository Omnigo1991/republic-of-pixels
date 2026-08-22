import type { Metadata } from "next";
import { ProfilAnsicht } from "@/components/ProfilAnsicht";

export function generateMetadata({ params }: { params: { nickname: string } }): Metadata {
  return {
    title: `${decodeURIComponent(params.nickname)} - Profil`,
    robots: { index: false },
  };
}

export default function ProfilSeite({ params }: { params: { nickname: string } }) {
  return (
    <>
      <ProfilAnsicht nickname={decodeURIComponent(params.nickname)} />
    </>
  );
}
