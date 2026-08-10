import type { Metadata } from "next";
import Link from "next/link";

import { Chip } from "@/components/ui";
import { getSources } from "@/lib/content";
import type { Source, SourceCategory, SourceStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Fuentes",
  description:
    "Feeds RSS monitoreados por el bot de 0xBugLetter. Se agregan por pull request.",
};

const CATEGORY_LABELS: Record<SourceCategory, string> = {
  blog: "Research & Labs",
  platform: "Plataformas",
  researcher: "Researchers",
  podcast: "Podcasts",
  news: "Agregadores",
};

const CATEGORY_ORDER: SourceCategory[] = [
  "blog",
  "platform",
  "researcher",
  "podcast",
  "news",
];

const STATUS_STYLES: Record<SourceStatus, { label: string; className: string }> = {
  active: { label: "activa", className: "text-paid" },
  stale: { label: "baja actividad", className: "text-medium" },
  broken: { label: "rota", className: "text-critical" },
};

export default function SourcesPage() {
  const sources = getSources();
  const broken = sources.filter((s) => s.status === "broken");

  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: sources.filter((s) => s.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Monitoreo</p>
        <h1 className="text-3xl font-semibold tracking-tight">Fuentes</h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          El bot revisa estos feeds a diario. Para agregar uno, editá{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            data/sources.yaml
          </code>{" "}
          y abrí un pull request.
        </p>
      </header>

      {broken.length > 0 ? (
        <div className="mb-8 rounded-md border border-line-subtle bg-critical-bg px-4 py-3">
          <p className="font-mono text-2xs uppercase tracking-wider text-critical">
            {broken.length} {broken.length === 1 ? "feed roto" : "feeds rotos"}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Estas fuentes dejaron de responder. Si conocés la URL nueva, mandá un
            PR — es la contribución más rápida que podés hacer al proyecto.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        {byCategory.map(({ category, items }) => (
          <section key={category}>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="label !text-ink-2">{CATEGORY_LABELS[category]}</h2>
              <span className="nums font-mono text-2xs text-ink-3">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((source) => (
                <SourceRow key={source.url} source={source} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-md border border-line-subtle bg-surface p-5">
        <h2 className="font-semibold tracking-tight">¿Falta una fuente?</h2>
        <p className="mt-1.5 max-w-[60ch] text-sm text-ink-2">
          Si seguís un blog o podcast de bug bounty que no está acá, agregalo. La
          única condición es que el autor sea parte de la comunidad o tenga
          resultados demostrables.
        </p>
        <Link
          href="/contribute"
          className="mt-3 inline-block font-mono text-xs text-accent transition-opacity hover:opacity-70"
        >
          Cómo contribuir →
        </Link>
      </div>
    </div>
  );
}

function SourceRow({ source }: { source: Source }) {
  const status = STATUS_STYLES[source.status];
  const isBroken = source.status === "broken";

  return (
    <div
      className={`rounded-md border border-line-subtle bg-surface p-4 ${
        isBroken ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={source.site}
          target="_blank"
          rel="noreferrer noopener"
          className="font-semibold tracking-tight transition-colors hover:text-accent"
        >
          {source.name}
        </a>
        {source.verified ? <Chip tone="accent">verificada</Chip> : null}
        <span className={`ml-auto font-mono text-2xs ${status.className}`}>
          {status.label}
        </span>
      </div>

      {source.note ? (
        <p className="mt-1.5 max-w-[65ch] text-sm text-ink-2">{source.note}</p>
      ) : null}

      <p className="mt-2 truncate font-mono text-2xs text-ink-3">{source.url}</p>
    </div>
  );
}
