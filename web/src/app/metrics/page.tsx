import type { Metadata } from "next";

import { BarList, BountyChart, CadenceChart, SeverityBars } from "@/components/charts";
import { StatTile } from "@/components/ui";
import { getMetrics, getWriteups } from "@/lib/content";

export const metadata: Metadata = {
  title: "Métricas",
  description:
    "Estadísticas del archivo curado: distribución por tipo de bug, severidad, plataforma y cadencia de publicación.",
};

export default function MetricsPage() {
  const metrics = getMetrics();
  const writeups = getWriteups();
  const withAmount = writeups.filter((w) => typeof w.bountyAmount === "number").length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Análisis</p>
        <h1 className="text-3xl font-semibold tracking-tight">Métricas</h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          Todo se calcula en build-time sobre los {metrics.total} writeups del
          archivo. No hay base de datos: si el número cambia es porque alguien
          mandó un pull request.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile value={String(metrics.total)} label="Writeups curados" />
        <StatTile
          value={String(metrics.byBugType.length)}
          label="Tipos de bug"
          hint="clases distintas representadas"
        />
        <StatTile
          value={String(metrics.programsCount)}
          label="Programas"
          hint="con target identificado"
        />
        <StatTile
          value={String(withAmount)}
          label="Con bounty público"
          hint={`de ${metrics.total} — el resto no lo declara`}
        />
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="label pb-3">Cadencia de publicación</h2>
          <div className="rounded-md border border-line-subtle bg-surface p-4">
            <CadenceChart data={metrics.byMonth} />
          </div>
          <p className="mt-2 text-2xs text-ink-3">
            Últimos 24 meses. Los meses sin writeups se dibujan igual.
          </p>
        </section>

        <section>
          <h2 className="label pb-3">Severidad</h2>
          <div className="rounded-md border border-line-subtle bg-surface p-4">
            <SeverityBars items={metrics.bySeverity} />
          </div>
          <p className="mt-2 text-2xs text-ink-3">
            Para research que describe una técnica, la severidad refleja el
            impacto típico de esa clase.
          </p>
        </section>

        <section>
          <h2 className="label pb-3">Tipo de bug</h2>
          <div className="rounded-md border border-line-subtle bg-surface p-4">
            <BarList items={metrics.byBugType} limit={12} />
          </div>
        </section>

        <section>
          <h2 className="label pb-3">Plataforma</h2>
          <div className="rounded-md border border-line-subtle bg-surface p-4">
            <BarList items={metrics.byPlatform} />
          </div>
        </section>

        <section>
          <h2 className="label pb-3">Bounty promedio por severidad</h2>
          <div className="rounded-md border border-line-subtle bg-surface p-4">
            <BountyChart data={metrics.bountyBySeverity} />
          </div>
        </section>

        {metrics.topPrograms.length > 0 ? (
          <section>
            <h2 className="label pb-3">Programas más frecuentes</h2>
            <div className="rounded-md border border-line-subtle bg-surface p-4">
              <BarList items={metrics.topPrograms} />
            </div>
          </section>
        ) : null}
      </div>

      <p className="mt-10 max-w-[65ch] text-sm text-ink-3">
        Un recorte de {metrics.total} writeups no es una muestra
        estadísticamente representativa del ecosistema de bug bounty. Sirve para
        ver qué se está publicando y encontrar lectura, no para sacar
        conclusiones sobre el mercado.
      </p>
    </div>
  );
}
