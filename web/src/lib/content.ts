import fs from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";

import {
  BUG_TYPES,
  PLATFORMS,
  SEVERITIES,
  SOURCE_CATEGORIES,
  SOURCE_STATUSES,
  type BugType,
  type Metrics,
  type Platform,
  type Severity,
  type Source,
  type SourceCategory,
  type SourceStatus,
  type Writeup,
} from "./types";

/**
 * `data/` vive en la raíz del repo, un nivel arriba de `web/`.
 * Se resuelve desde cwd porque tanto `next dev` como `next build`
 * corren desde `web/`.
 */
const DATA_DIR = path.join(process.cwd(), "..", "data");
const WRITEUPS_DIR = path.join(DATA_DIR, "writeups");

/* ── Helpers de validación ───────────────────────────────────────────────
   Fallan ruidosamente en build antes que renderizar datos corruptos.
   El mensaje siempre nombra el archivo: quien manda el PR tiene que poder
   arreglarlo sin leer este código. */

function fail(file: string, message: string): never {
  throw new Error(`[0xBugLetter] ${file}: ${message}`);
}

function requireString(file: string, obj: RawRecord, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    fail(file, `falta el campo requerido "${key}" (string)`);
  }
  return value.trim();
}

function optionalString(
  file: string,
  obj: RawRecord,
  key: string,
): string | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    fail(file, `el campo "${key}" tiene que ser string`);
  }
  return value.trim() || undefined;
}

function requireEnum<T extends string>(
  file: string,
  obj: RawRecord,
  key: string,
  allowed: readonly T[],
): T {
  const value = requireString(file, obj, key);
  if (!allowed.includes(value as T)) {
    fail(
      file,
      `"${key}" = "${value}" no es válido. Valores permitidos: ${allowed.join(", ")}`,
    );
  }
  return value as T;
}

type RawRecord = Record<string, unknown>;

/**
 * `data/taxonomy.yaml` es la fuente de verdad compartida con el validador
 * de PRs en Python. Los tipos de TypeScript existen para DX, pero si las dos
 * listas se separan el build tiene que caerse acá — si no, un PR pasaría el
 * CI de Python y rompería el deploy.
 */
function assertTaxonomyInSync() {
  const file = path.join(DATA_DIR, "taxonomy.yaml");
  if (!fs.existsSync(file)) return;

  const taxonomy = readYaml(file) as Record<string, string[]> | null;
  if (!taxonomy) return;

  const pairs: Array<[string, readonly string[]]> = [
    ["severities", SEVERITIES],
    ["platforms", PLATFORMS],
    ["bug_types", BUG_TYPES],
    ["source_categories", SOURCE_CATEGORIES],
    ["source_statuses", SOURCE_STATUSES],
  ];

  for (const [key, tsValues] of pairs) {
    const yamlValues = taxonomy[key] ?? [];
    const missingInTs = yamlValues.filter((v) => !tsValues.includes(v));
    const missingInYaml = tsValues.filter((v) => !yamlValues.includes(v));

    if (missingInTs.length || missingInYaml.length) {
      fail(
        "taxonomy.yaml",
        `"${key}" no coincide con web/src/lib/types.ts.` +
          (missingInTs.length ? ` Falta en types.ts: ${missingInTs.join(", ")}.` : "") +
          (missingInYaml.length
            ? ` Falta en taxonomy.yaml: ${missingInYaml.join(", ")}.`
            : ""),
      );
    }
  }
}

function readYaml(file: string): unknown {
  const raw = fs.readFileSync(file, "utf8");
  try {
    return loadYaml(raw);
  } catch (error) {
    fail(path.basename(file), `YAML inválido — ${(error as Error).message}`);
  }
}

/* ── Writeups ───────────────────────────────────────────────────────────── */

function parseWriteup(fileName: string, raw: unknown): Writeup {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail(fileName, "el archivo tiene que contener un objeto YAML");
  }
  const obj = raw as RawRecord;

  const date = requireString(fileName, obj, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail(fileName, `"date" tiene que estar en formato YYYY-MM-DD (recibí "${date}")`);
  }

  const url = requireString(fileName, obj, "url");
  if (!/^https?:\/\//.test(url)) {
    fail(fileName, `"url" tiene que empezar con http:// o https://`);
  }

  const bountyRaw = obj.bounty_amount;
  let bountyAmount: number | undefined;
  if (bountyRaw !== undefined && bountyRaw !== null) {
    if (typeof bountyRaw !== "number" || !Number.isFinite(bountyRaw) || bountyRaw < 0) {
      fail(fileName, `"bounty_amount" tiene que ser un número positivo`);
    }
    bountyAmount = bountyRaw;
  }

  const isPaidRaw = obj.is_paid;
  if (isPaidRaw !== undefined && isPaidRaw !== null && typeof isPaidRaw !== "boolean") {
    fail(fileName, `"is_paid" tiene que ser true o false`);
  }

  const tagsRaw = obj.tags;
  let tags: string[] = [];
  if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.filter((t): t is string => typeof t === "string");
  } else if (tagsRaw !== undefined && tagsRaw !== null) {
    fail(fileName, `"tags" tiene que ser una lista`);
  }

  return {
    slug: fileName.replace(/\.ya?ml$/, ""),
    title: requireString(fileName, obj, "title"),
    author: requireString(fileName, obj, "author"),
    authorUrl: optionalString(fileName, obj, "author_url"),
    date,
    url,
    source: requireString(fileName, obj, "source"),
    bugType: requireEnum<BugType>(fileName, obj, "bug_type", BUG_TYPES),
    severity: requireEnum<Severity>(fileName, obj, "severity", SEVERITIES),
    cwe: optionalString(fileName, obj, "cwe"),
    platform: requireEnum<Platform>(fileName, obj, "platform", PLATFORMS),
    program: optionalString(fileName, obj, "program"),
    isPaid: isPaidRaw as boolean | undefined,
    bountyAmount,
    currency: optionalString(fileName, obj, "currency") ?? (bountyAmount ? "USD" : undefined),
    tags,
    summary: optionalString(fileName, obj, "summary"),
  };
}

let writeupsCache: Writeup[] | null = null;

/** Todos los writeups curados, del más reciente al más viejo. */
export function getWriteups(): Writeup[] {
  if (writeupsCache) return writeupsCache;

  assertTaxonomyInSync();

  if (!fs.existsSync(WRITEUPS_DIR)) {
    writeupsCache = [];
    return writeupsCache;
  }

  const files = fs
    .readdirSync(WRITEUPS_DIR)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

  const writeups = files.map((file) =>
    parseWriteup(file, readYaml(path.join(WRITEUPS_DIR, file))),
  );

  const seen = new Map<string, string>();
  for (const w of writeups) {
    const previous = seen.get(w.url);
    if (previous) {
      fail(w.slug, `URL duplicada — ya está en ${previous}`);
    }
    seen.set(w.url, w.slug);
  }

  writeups.sort((a, b) => b.date.localeCompare(a.date));
  writeupsCache = writeups;
  return writeups;
}

/* ── Sources ────────────────────────────────────────────────────────────── */

let sourcesCache: Source[] | null = null;

export function getSources(): Source[] {
  if (sourcesCache) return sourcesCache;

  const file = path.join(DATA_DIR, "sources.yaml");
  if (!fs.existsSync(file)) {
    sourcesCache = [];
    return sourcesCache;
  }

  const raw = readYaml(file);
  const list = (raw as RawRecord | null)?.sources;
  if (!Array.isArray(list)) {
    fail("sources.yaml", 'se esperaba una clave "sources" con una lista');
  }

  sourcesCache = list.map((entry, index) => {
    const label = `sources.yaml[${index}]`;
    if (typeof entry !== "object" || entry === null) {
      fail(label, "cada fuente tiene que ser un objeto");
    }
    const obj = entry as RawRecord;
    if (typeof obj.verified !== "boolean") {
      fail(label, '"verified" tiene que ser true o false');
    }
    return {
      name: requireString(label, obj, "name"),
      url: requireString(label, obj, "url"),
      site: requireString(label, obj, "site"),
      category: requireEnum<SourceCategory>(label, obj, "category", SOURCE_CATEGORIES),
      status: requireEnum<SourceStatus>(label, obj, "status", SOURCE_STATUSES),
      verified: obj.verified,
      note: optionalString(label, obj, "note"),
    };
  });

  return sourcesCache;
}

/* ── Métricas ───────────────────────────────────────────────────────────── */

function tally<T extends string>(values: T[]): Array<{ key: T; count: number }> {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function getMetrics(): Metrics {
  const writeups = getWriteups();
  const withBounty = writeups.filter((w) => typeof w.bountyAmount === "number");
  const amounts = withBounty.map((w) => w.bountyAmount as number);

  const bountyBySeverity = SEVERITIES.map((severity) => {
    const matching = withBounty.filter((w) => w.severity === severity);
    const sum = matching.reduce((acc, w) => acc + (w.bountyAmount as number), 0);
    return {
      key: severity,
      avg: matching.length ? Math.round(sum / matching.length) : 0,
      n: matching.length,
    };
  }).filter((entry) => entry.n > 0);

  // Serie mensual continua: los meses sin writeups tienen que aparecer como
  // cero, si no el gráfico miente sobre la cadencia.
  const byMonth: Array<{ key: string; count: number }> = [];
  if (writeups.length > 0) {
    const months = writeups.map((w) => w.date.slice(0, 7)).sort();
    const counts = new Map<string, number>();
    for (const month of months) counts.set(month, (counts.get(month) ?? 0) + 1);

    const [startYear, startMonth] = months[0].split("-").map(Number);
    const [endYear, endMonth] = months[months.length - 1].split("-").map(Number);
    const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
    const end = new Date(Date.UTC(endYear, endMonth - 1, 1));

    while (cursor <= end) {
      const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
      byMonth.push({ key, count: counts.get(key) ?? 0 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  const programs = writeups
    .map((w) => w.program)
    .filter((p): p is string => typeof p === "string");

  return {
    total: writeups.length,
    totalPaid: writeups.filter((w) => w.isPaid === true).length,
    totalBountyUsd: amounts.reduce((acc, n) => acc + n, 0),
    medianBountyUsd: median(amounts),
    programsCount: new Set(programs).size,
    byBugType: tally(writeups.map((w) => w.bugType)),
    bySeverity: tally(writeups.map((w) => w.severity)),
    byPlatform: tally(writeups.map((w) => w.platform)),
    byMonth,
    bountyBySeverity,
    topPrograms: tally(programs).slice(0, 10),
  };
}
