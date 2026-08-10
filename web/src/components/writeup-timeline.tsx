"use client";

import { useMemo, useState } from "react";

import { formatMonth } from "@/lib/format";
import type { Writeup } from "@/lib/types";

import { WriteupCard } from "./writeup-card";

type PaymentFilter = "all" | "paid" | "unpaid";

interface Props {
  writeups: Writeup[];
}

/** Cuenta ocurrencias respetando el resto de los filtros activos, para que
 *  los contadores de cada faceta reflejen lo que realmente vas a obtener. */
function countBy<K extends string>(items: Writeup[], pick: (w: Writeup) => K) {
  const counts = new Map<K, number>();
  for (const item of items) {
    const key = pick(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function WriteupTimeline({ writeups }: Props) {
  const [query, setQuery] = useState("");
  const [bugTypes, setBugTypes] = useState<Set<string>>(new Set());
  const [severities, setSeverities] = useState<Set<string>>(new Set());
  const [platforms, setPlatforms] = useState<Set<string>>(new Set());
  const [years, setYears] = useState<Set<string>>(new Set());
  const [payment, setPayment] = useState<PaymentFilter>("all");

  const facets = useMemo(() => {
    const byType = countBy(writeups, (w) => w.bugType);
    const bySeverity = countBy(writeups, (w) => w.severity);
    const byPlatform = countBy(writeups, (w) => w.platform);
    const byYear = countBy(writeups, (w) => w.date.slice(0, 4));

    const sortByCount = (map: Map<string, number>) =>
      [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    return {
      bugTypes: sortByCount(byType),
      // La severidad tiene orden propio: de más grave a menos, no por volumen.
      severities: (["Critical", "High", "Medium", "Low", "Info"] as const)
        .filter((s) => bySeverity.has(s))
        .map((s) => [s, bySeverity.get(s) as number] as [string, number]),
      platforms: sortByCount(byPlatform),
      years: [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0])),
    };
  }, [writeups]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return writeups.filter((w) => {
      if (bugTypes.size > 0 && !bugTypes.has(w.bugType)) return false;
      if (severities.size > 0 && !severities.has(w.severity)) return false;
      if (platforms.size > 0 && !platforms.has(w.platform)) return false;
      if (years.size > 0 && !years.has(w.date.slice(0, 4))) return false;

      if (payment === "paid" && w.isPaid !== true) return false;
      if (payment === "unpaid" && w.isPaid === true) return false;

      if (needle) {
        const haystack = [
          w.title,
          w.author,
          w.source,
          w.program ?? "",
          w.summary ?? "",
          w.bugType,
          ...w.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }, [writeups, query, bugTypes, severities, platforms, years, payment]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Writeup[]>();
    for (const w of filtered) {
      const month = w.date.slice(0, 7);
      const bucket = groups.get(month);
      if (bucket) bucket.push(w);
      else groups.set(month, [w]);
    }
    return [...groups.entries()];
  }, [filtered]);

  const activeCount =
    bugTypes.size +
    severities.size +
    platforms.size +
    years.size +
    (payment === "all" ? 0 : 1) +
    (query.trim() ? 1 : 0);

  function toggle(
    set: Set<string>,
    apply: (next: Set<string>) => void,
    value: string,
  ) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  function clearAll() {
    setQuery("");
    setBugTypes(new Set());
    setSeverities(new Set());
    setPlatforms(new Set());
    setYears(new Set());
    setPayment("all");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="flex items-center justify-between gap-2 pb-3">
          <p className="label">Filtros</p>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="font-mono text-2xs text-accent transition-opacity hover:opacity-70"
            >
              limpiar ({activeCount})
            </button>
          ) : null}
        </div>

        <label className="block pb-4">
          <span className="sr-only">Buscar writeups</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar…"
            className="w-full rounded-sm border border-line-subtle bg-surface px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-5">
          <FilterGroup
            title="Severidad"
            options={facets.severities}
            selected={severities}
            onToggle={(value) => toggle(severities, setSeverities, value)}
          />

          <div>
            <p className="label pb-2">Bounty</p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", "Todos"],
                  ["paid", "Pagado"],
                  ["unpaid", "VDP / s.d."],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPayment(value)}
                  aria-pressed={payment === value}
                  className={`rounded-sm border px-1.5 py-0.5 font-mono text-2xs transition-colors ${
                    payment === value
                      ? "border-accent-border bg-accent-bg text-accent"
                      : "border-line-subtle text-ink-3 hover:border-line hover:text-ink-2"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <FilterGroup
            title="Tipo de bug"
            options={facets.bugTypes}
            selected={bugTypes}
            onToggle={(value) => toggle(bugTypes, setBugTypes, value)}
          />

          <FilterGroup
            title="Plataforma"
            options={facets.platforms}
            selected={platforms}
            onToggle={(value) => toggle(platforms, setPlatforms, value)}
          />

          <FilterGroup
            title="Año"
            options={facets.years}
            selected={years}
            onToggle={(value) => toggle(years, setYears, value)}
          />
        </div>
      </aside>

      {/* ── Timeline ────────────────────────────────────────────────── */}
      <div>
        <p className="nums pb-4 font-mono text-2xs text-ink-3">
          {filtered.length} de {writeups.length} writeups
        </p>

        {grouped.length === 0 ? (
          <div className="rounded-md border border-dashed border-line px-5 py-12 text-center">
            <p className="text-ink-2">Ningún writeup coincide con estos filtros.</p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-2 font-mono text-xs text-accent transition-opacity hover:opacity-70"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* El eje temporal: una línea continua que atraviesa todos los
                meses. Sin esto la página es una lista, no una cronología. */}
            <div
              className="absolute left-[5px] top-2 bottom-2 w-px bg-line-subtle"
              aria-hidden="true"
            />

            <div className="flex flex-col gap-8">
              {grouped.map(([month, items]) => (
                <section key={month}>
                  <div className="relative flex items-center gap-3 pb-3">
                    <span
                      className="size-[11px] shrink-0 rounded-full border-2 border-ground bg-accent ring-1 ring-accent"
                      aria-hidden="true"
                    />
                    <h2 className="label !text-ink-2">{formatMonth(month)}</h2>
                    <span className="nums font-mono text-2xs text-ink-3">
                      {items.length}
                    </span>
                  </div>

                  <div className="ml-6 flex flex-col gap-2.5">
                    {items.map((writeup) => (
                      <WriteupCard key={writeup.slug} writeup={writeup} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: Array<[string, number]>;
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div>
      <p className="label pb-2">{title}</p>
      <div className="flex flex-wrap gap-1">
        {options.map(([value, count]) => {
          const isActive = selected.has(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-2xs transition-colors ${
                isActive
                  ? "border-accent-border bg-accent-bg text-accent"
                  : "border-line-subtle text-ink-3 hover:border-line hover:text-ink-2"
              }`}
            >
              {value}
              <span className={`nums ${isActive ? "opacity-70" : "opacity-50"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
