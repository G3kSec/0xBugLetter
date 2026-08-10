import { formatMonth } from "@/lib/format";
import { SEVERITY_STYLES } from "@/lib/format";
import type { Severity } from "@/lib/types";

/**
 * Charts hechos a medida — sin librería.
 * Todo se resuelve con divs y SVG inline, así heredan los tokens del tema
 * sin puentes de JS y funcionan igual en claro y oscuro.
 */

interface BarListItem {
  key: string;
  count: number;
}

/** Barras horizontales para datos categóricos. La longitud es proporcional
 *  al máximo, no al total: comparar categorías entre sí es lo que importa. */
export function BarList({
  items,
  colorFor,
  max: explicitMax,
  limit,
}: {
  items: BarListItem[];
  colorFor?: (key: string) => string;
  max?: number;
  limit?: number;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  const max = explicitMax ?? Math.max(...shown.map((item) => item.count), 1);

  return (
    <ul className="flex flex-col gap-2">
      {shown.map((item) => {
        const pct = (item.count / max) * 100;
        return (
          <li key={item.key} className="grid grid-cols-[1fr_2rem] items-center gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate font-mono text-2xs text-ink-2">
                  {item.key}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full ${colorFor?.(item.key) ?? "bg-accent"}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
            <span className="nums text-right font-mono text-2xs text-ink-3">
              {item.count}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Distribución por severidad usando la rampa CVSS. */
export function SeverityBars({ items }: { items: Array<{ key: Severity; count: number }> }) {
  const ordered = (["Critical", "High", "Medium", "Low", "Info"] as const)
    .map((severity) => items.find((item) => item.key === severity))
    .filter((item): item is { key: Severity; count: number } => Boolean(item));

  return (
    <BarList
      items={ordered}
      colorFor={(key) => SEVERITY_STYLES[key as Severity].rail}
    />
  );
}

/**
 * Cadencia mensual. Columnas en SVG con viewBox, para que escale sin
 * romperse. Los meses en cero se dibujan igual — si los omitiéramos, el
 * gráfico mentiría sobre el ritmo de publicación.
 */
export function CadenceChart({
  data,
  months = 24,
}: {
  data: Array<{ key: string; count: number }>;
  months?: number;
}) {
  const series = data.slice(-months);
  if (series.length === 0) {
    return <p className="text-sm text-ink-3">Sin datos suficientes.</p>;
  }

  const max = Math.max(...series.map((point) => point.count), 1);
  const width = 640;
  const height = 140;
  const padBottom = 22;
  const plotHeight = height - padBottom;
  const slot = width / series.length;
  const barWidth = Math.max(Math.min(slot - 3, 26), 2);

  // Etiquetar cada mes satura el eje; se muestran ~6 marcas repartidas.
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[140px] w-full min-w-[420px]"
        role="img"
        aria-label={`Writeups publicados por mes en los últimos ${series.length} meses`}
      >
        {/* Líneas guía en 0, mitad y máximo */}
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={width}
            y1={plotHeight - ratio * plotHeight}
            y2={plotHeight - ratio * plotHeight}
            stroke="var(--border-subtle)"
            strokeWidth={1}
          />
        ))}

        {series.map((point, index) => {
          const barHeight = point.count === 0 ? 0 : (point.count / max) * plotHeight;
          const x = index * slot + (slot - barWidth) / 2;
          const isLast = index === series.length - 1;

          return (
            <g key={point.key}>
              {point.count > 0 ? (
                <rect
                  x={x}
                  y={plotHeight - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={1.5}
                  fill={isLast ? "var(--accent)" : "var(--accent)"}
                  opacity={isLast ? 1 : 0.45}
                >
                  <title>{`${formatMonth(point.key)}: ${point.count}`}</title>
                </rect>
              ) : (
                // Marca tenue para que el mes vacío siga ocupando su lugar
                <rect
                  x={x}
                  y={plotHeight - 2}
                  width={barWidth}
                  height={2}
                  rx={1}
                  fill="var(--border)"
                >
                  <title>{`${formatMonth(point.key)}: 0`}</title>
                </rect>
              )}

              {index % labelEvery === 0 || isLast ? (
                <text
                  x={x + barWidth / 2}
                  y={height - 6}
                  textAnchor="middle"
                  fill="var(--text-3)"
                  fontSize={9}
                  fontFamily="var(--font-geist-mono), monospace"
                >
                  {point.key.slice(2).replace("-", "/")}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Bounty promedio por severidad. Sólo aparece con montos publicados. */
export function BountyChart({
  data,
}: {
  data: Array<{ key: Severity; avg: number; n: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line px-4 py-8 text-center">
        <p className="text-sm text-ink-2">
          Todavía no hay writeups con monto de bounty publicado.
        </p>
        <p className="mt-1 text-2xs text-ink-3">
          Este gráfico se llena solo a medida que se curan reportes con payout
          confirmado.
        </p>
      </div>
    );
  }

  const max = Math.max(...data.map((entry) => entry.avg), 1);

  return (
    <ul className="flex flex-col gap-3">
      {data.map((entry) => (
        <li key={entry.key}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className={`font-mono text-2xs ${SEVERITY_STYLES[entry.key].text}`}>
              {entry.key}
            </span>
            <span className="nums font-mono text-2xs text-ink-2">
              ${entry.avg.toLocaleString("en-US")}
              <span className="ml-1.5 text-ink-3">n={entry.n}</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full ${SEVERITY_STYLES[entry.key].rail}`}
              style={{ width: `${Math.max((entry.avg / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
