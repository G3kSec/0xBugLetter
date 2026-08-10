import Link from "next/link";

import { WriteupCard } from "@/components/writeup-card";
import { getMetrics, getSources, getWriteups } from "@/lib/content";

export default function HomePage() {
  const writeups = getWriteups();
  const metrics = getMetrics();
  const sources = getSources();
  const latest = writeups.slice(0, 6);
  const activeSources = sources.filter((s) => s.status !== "broken").length;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="grid-bg border-b border-line-subtle">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="label mb-4">Archivo curado · Bug bounty</p>

          <h1 className="max-w-[18ch] text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Lo que vale la pena leer,{" "}
            <span className="text-accent">sin el ruido</span>.
          </h1>

          <p className="mt-5 max-w-[58ch] text-lg text-ink-2">
            Un timeline de writeups y research de bug bounty. Cada entrada está
            verificada contra su fuente y clasificada por tipo de bug, severidad
            y plataforma — para que puedas filtrar en vez de scrollear.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/writeups"
              className="rounded-sm bg-accent px-4 py-2 font-mono text-xs font-medium text-ground transition-colors hover:bg-accent-hover"
            >
              Explorar el archivo
            </Link>
            <Link
              href="/setup"
              className="rounded-sm border border-line px-4 py-2 font-mono text-xs text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Configurar el bot
            </Link>
          </div>

          <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
            <Stat value={String(metrics.total)} label="writeups" />
            <Stat value={String(metrics.byBugType.length)} label="tipos de bug" />
            <Stat value={String(activeSources)} label="fuentes activas" />
            <Stat value="0" label="bases de datos" />
          </dl>
        </div>
      </section>

      {/* ── Últimos writeups ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <p className="label mb-1">Lo último</p>
            <h2 className="text-xl font-semibold tracking-tight">
              Agregado recientemente
            </h2>
          </div>
          <Link
            href="/writeups"
            className="shrink-0 font-mono text-xs text-accent transition-opacity hover:opacity-70"
          >
            ver todo →
          </Link>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2">
          {latest.map((writeup) => (
            <WriteupCard key={writeup.slug} writeup={writeup} />
          ))}
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-5">
          <p className="label mb-1">Cómo funciona</p>
          <h2 className="text-xl font-semibold tracking-tight">
            El contenido vive en el repositorio
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card
            title="Todo es YAML"
            body="Cada writeup es un archivo en data/writeups/. Sin base de datos, sin panel de administración. El historial de cambios es el historial de git."
          />
          <Card
            title="Se contribuye por PR"
            body="Agregás un archivo, abrís un pull request y el CI valida el schema. Si pasa, entra al archivo con tu nombre en el commit."
          />
          <Card
            title="El bot avisa"
            body="Un GitHub Action revisa los feeds a diario y publica lo nuevo en Discord. La web es el archivo; el bot es la notificación."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  // El número va arriba visualmente, pero en el DOM el <dt> tiene que
  // preceder al <dd>: se invierte con flex, no duplicando el texto.
  return (
    <div className="flex flex-col-reverse">
      <dt className="label">{label}</dt>
      <dd className="nums font-mono text-2xl font-semibold tracking-tight">
        {value}
      </dd>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-line-subtle bg-surface p-5">
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-2">{body}</p>
    </div>
  );
}
