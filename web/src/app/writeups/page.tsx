import type { Metadata } from "next";

import { WriteupTimeline } from "@/components/writeup-timeline";
import { getWriteups } from "@/lib/content";

export const metadata: Metadata = {
  title: "Writeups",
  description:
    "Timeline curado de writeups y research de bug bounty. Filtrable por tipo de bug, severidad, plataforma y bounty.",
};

export default function WriteupsPage() {
  const writeups = getWriteups();

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Archivo</p>
        <h1 className="text-3xl font-semibold tracking-tight">Writeups</h1>
        <p className="mt-2 max-w-[60ch] text-ink-2">
          Cada entrada fue verificada contra la fuente original. Los montos de
          bounty aparecen sólo cuando son públicos — nunca estimados.
        </p>
      </header>

      <WriteupTimeline writeups={writeups} />
    </div>
  );
}
