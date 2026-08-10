import type { Metadata } from "next";

import { CodeBlock, Step } from "@/components/code-block";
import { BUG_TYPES, PLATFORMS, SEVERITIES } from "@/lib/types";

export const metadata: Metadata = {
  title: "Contribuir",
  description:
    "Cómo agregar un writeup o una fuente a 0xBugLetter mediante un pull request.",
};

export default function ContributePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Comunidad</p>
        <h1 className="text-3xl font-semibold tracking-tight">Contribuir</h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          El archivo lo mantiene la comunidad. Agregar un writeup es crear un
          archivo YAML y abrir un pull request — no hace falta tocar código.
        </p>
      </header>

      {/* ── Criterio de inclusión ──────────────────────────────────── */}
      <section className="mb-10 rounded-md border border-accent-border bg-accent-bg p-5">
        <h2 className="font-semibold tracking-tight">Qué entra y qué no</h2>
        <p className="mt-2 text-sm text-ink-2">
          Este es el único criterio que importa, y es intencionalmente
          restrictivo:
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
          <Rule ok>
            Writeups de autores reconocidos en la comunidad, o con resultados
            demostrables: bounties pagados, CVEs asignados, reportes divulgados
            en plataformas oficiales.
          </Rule>
          <Rule ok>
            Research original de labs y equipos de seguridad con trayectoria.
          </Rule>
          <Rule ok>
            Episodios de podcast y charlas con contenido técnico verificable.
          </Rule>
          <Rule>
            Artículos con títulos tipo «gané $10.000 en una semana» sin PoC,
            sin reporte público y sin nada que respalde el número.
          </Rule>
          <Rule>
            Contenido regenerado con IA que reexplica OWASP Top 10 por enésima
            vez.
          </Rule>
          <Rule>
            Montos de bounty estimados, inferidos o «aproximados». Si el monto no
            es público, el campo se deja vacío.
          </Rule>
        </ul>
      </section>

      {/* ── Pasos ──────────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mb-5 text-xl font-semibold tracking-tight">
          Agregar un writeup
        </h2>

        <ol className="flex flex-col gap-6">
          <Step n={1} title="Creá el archivo">
            <p>
              En{" "}
              <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
                data/writeups/
              </code>
              , con el nombre{" "}
              <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
                YYYY-MM-DD-titulo-corto.yaml
              </code>
              . La fecha es la de publicación del artículo, no la de hoy.
            </p>
          </Step>

          <Step n={2} title="Completá los campos">
            <CodeBlock title="data/writeups/2026-07-15-ssrf-ejemplo.yaml">
              {`title: "Blind SSRF via PDF export"
author: "@handle"
author_url: "https://twitter.com/handle"   # opcional
date: "2026-07-15"
url: "https://ejemplo.com/writeup"
source: "HackerOne"

# Clasificación
bug_type: "SSRF"
severity: "High"
cwe: "CWE-918"                             # opcional

# Programa
platform: "HackerOne"
program: "Ejemplo Inc."                    # opcional

# Bounty — sólo si el monto es público
is_paid: true
bounty_amount: 5000
currency: "USD"

summary: "Una o dos frases propias, no el copy del artículo."  # opcional

tags:
  - "ssrf"
  - "pdf-export"`}
            </CodeBlock>
          </Step>

          <Step n={3} title="Abrí el pull request">
            <p>
              El CI valida el schema, chequea que la URL responda y que no sea un
              duplicado. Si algo falla, el bot comenta en el PR qué corregir.
            </p>
          </Step>
        </ol>
      </section>

      {/* ── Valores permitidos ─────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Valores permitidos
        </h2>
        <p className="mb-5 max-w-[62ch] text-sm text-ink-2">
          Las taxonomías están cerradas a propósito: si cada writeup inventa su
          propia categoría, los filtros dejan de servir. Para agregar un valor
          hay que modificar{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            web/src/lib/types.ts
          </code>{" "}
          en el mismo PR — eso fuerza la discusión.
        </p>

        <div className="flex flex-col gap-5">
          <ValueList title="severity" values={[...SEVERITIES]} />
          <ValueList title="platform" values={[...PLATFORMS]} />
          <ValueList title="bug_type" values={[...BUG_TYPES]} />
        </div>
      </section>

      {/* ── Agregar fuente ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Agregar una fuente
        </h2>
        <p className="mb-4 max-w-[62ch] text-sm text-ink-2">
          Para que el bot monitoree un feed nuevo, sumá un bloque a{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            data/sources.yaml
          </code>
          :
        </p>
        <CodeBlock title="data/sources.yaml">
          {`- name: "Nombre de la fuente"
  url: "https://ejemplo.com/feed.xml"
  site: "https://ejemplo.com"
  category: blog          # blog | platform | researcher | podcast | news
  status: active          # active | stale | broken
  verified: true          # ¿autor u organización reconocida?
  note: "Contexto opcional."`}
        </CodeBlock>
        <p className="mt-4 max-w-[62ch] text-sm text-ink-2">
          Reportar un feed roto también cuenta como contribución — y es la más
          rápida de revisar.
        </p>
      </section>
    </div>
  );
}

function Rule({ ok = false, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1rem_1fr] gap-2.5">
      <span
        aria-hidden="true"
        className={`mt-[0.4rem] size-2 shrink-0 rounded-full ${ok ? "bg-paid" : "bg-critical"}`}
      />
      <span>
        <span className="sr-only">{ok ? "Se acepta: " : "No se acepta: "}</span>
        {children}
      </span>
    </li>
  );
}

function ValueList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="label pb-2">{title}</p>
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-sm border border-line-subtle bg-surface px-1.5 py-0.5 font-mono text-2xs text-ink-2"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
