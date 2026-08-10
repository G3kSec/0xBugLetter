"use client";

import { useMemo, useState } from "react";

import { formatMonth } from "@/lib/format";
import type { Writeup } from "@/lib/types";

import { WriteupCard } from "./writeup-card";

interface Props {
  writeups: Writeup[];
}

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
  const [years, setYears] = useState<Set<string>>(new Set());

  const facets = useMemo(() => {
    const byType = countBy(writeups, (w) => w.bugType);
    const byYear = countBy(writeups, (w) => w.date.slice(0, 4));

    return {
      bugTypes: [...byType.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      ),
      years: [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0])),
    };
  }, [writeups]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return writeups.filter((w) => {
      if (bugTypes.size > 0 && !bugTypes.has(w.bugType)) return false;
      if (years.size > 0 && !years.has(w.date.slice(0, 4))) return false;

      if (needle) {
        const haystack = [
          w.title,
          w.author,
          w.source,
          w.program ?? "",
          w.summary ?? "",
          w.bugType,
          w.severity,
          ...w.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }, [writeups, query, bugTypes, years]);

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

  const activeCount = bugTypes.size + years.size + (query.trim() ? 1 : 0);

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
    setYears(new Set());
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      {/* ── Filters ─────────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="flex items-center justify-between gap-2 pb-3">
          <p className="label">Filters</p>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="font-mono text-2xs text-accent transition-opacity hover:opacity-70"
            >
              clear ({activeCount})
            </button>
          ) : null}
        </div>

        <label className="block pb-4">
          <span className="sr-only">Search writeups</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            className="w-full rounded-sm border border-line-subtle bg-surface px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-5">
          <FilterGroup
            title="Bug type"
            options={facets.bugTypes}
            selected={bugTypes}
            onToggle={(value) => toggle(bugTypes, setBugTypes, value)}
          />

          <FilterGroup
            title="Year"
            options={facets.years}
            selected={years}
            onToggle={(value) => toggle(years, setYears, value)}
          />
        </div>
      </aside>

      {/* ── Timeline ────────────────────────────────────────────────── */}
      <div>
        <p className="nums pb-4 font-mono text-2xs text-ink-3">
          {filtered.length} of {writeups.length} writeups
        </p>

        {grouped.length === 0 ? (
          <div className="rounded-md border border-dashed border-line px-5 py-12 text-center">
            <p className="text-ink-2">No writeups match these filters.</p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-2 font-mono text-xs text-accent transition-opacity hover:opacity-70"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* The time axis: one continuous line through every month.
                Without it this is a list, not a chronology. */}
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
