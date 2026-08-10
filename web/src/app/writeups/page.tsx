import type { Metadata } from "next";

import { WriteupTimeline } from "@/components/writeup-timeline";
import { getWriteups } from "@/lib/content";

export const metadata: Metadata = {
  title: "Writeups",
  description:
    "A curated timeline of bug bounty writeups and research, filterable by bug type and year.",
};

export default function WriteupsPage() {
  const writeups = getWriteups();

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Archive</p>
        <h1 className="text-3xl font-semibold tracking-tight">Writeups</h1>
        <p className="mt-2 max-w-[60ch] text-ink-2">
          Every entry was verified against its original source. Bounty amounts
          appear only when they are public — never estimated.
        </p>
      </header>

      <WriteupTimeline writeups={writeups} />
    </div>
  );
}
