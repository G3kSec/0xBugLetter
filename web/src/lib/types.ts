/**
 * Modelos de datos de 0xBugLetter.
 *
 * Todo el contenido vive como YAML en `data/` y se parsea en build-time.
 * Estos tipos son el contrato: el CI valida los PRs contra ellos.
 */

export const SEVERITIES = ["Critical", "High", "Medium", "Low", "Info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PLATFORMS = [
  "HackerOne",
  "Bugcrowd",
  "Intigriti",
  "YesWeHack",
  "Independent",
  "Vendor VDP",
] as const;
export type Platform = (typeof PLATFORMS)[number];

/**
 * Taxonomía de bugs. Deliberadamente acotada: si cada writeup inventa su
 * propia categoría los filtros dejan de servir. Para agregar una, hay que
 * modificar esta lista en un PR — eso fuerza la discusión.
 */
export const BUG_TYPES = [
  "XSS",
  "SSRF",
  "IDOR",
  "SQLi",
  "RCE",
  "Auth Bypass",
  "Access Control",
  "Race Condition",
  "CSRF",
  "Open Redirect",
  "Info Disclosure",
  "Business Logic",
  "File Upload",
  "XXE",
  "Deserialization",
  "Request Smuggling",
  "Cache Poisoning",
  "Prototype Pollution",
  "SSTI",
  "WebSocket",
  "Session",
  "Subdomain Takeover",
  "GraphQL",
  "OAuth",
  "SAML",
  "LLM / AI",
  "Supply Chain",
  "Cloud Misconfig",
  "Recon",
  "Methodology",
] as const;
export type BugType = (typeof BUG_TYPES)[number];

export const SOURCE_CATEGORIES = [
  "blog",
  "platform",
  "researcher",
  "podcast",
  "news",
] as const;
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

export const SOURCE_STATUSES = ["active", "stale", "broken", "no-feed"] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

/** Un writeup curado. Un archivo YAML por entrada en `data/writeups/`. */
export interface Writeup {
  /** Derivado del nombre del archivo — no se escribe en el YAML. */
  slug: string;

  title: string;
  author: string;
  authorUrl?: string;
  /** ISO 8601 (YYYY-MM-DD) */
  date: string;
  url: string;
  /** Nombre de la publicación o plataforma donde salió. */
  source: string;

  bugType: BugType;
  severity: Severity;
  /** Ej: "CWE-918". Opcional — no todo writeup lo declara. */
  cwe?: string;

  platform: Platform;
  /** Empresa o proyecto afectado. `undefined` si el writeup no lo revela. */
  program?: string;

  /**
   * `true` sólo si el pago está confirmado públicamente.
   * `false` para VDP o rechazado. `undefined` cuando no se sabe —
   * que es distinto de saber que no pagaron.
   */
  isPaid?: boolean;
  /** Sólo cuando el monto está publicado. Nunca estimado. */
  bountyAmount?: number;
  currency?: string;

  tags: string[];
  /** Resumen de una o dos frases. Escrito por quien cura, no copiado. */
  summary?: string;
}

/** Una fuente RSS monitoreada por el bot. */
export interface Source {
  name: string;
  url: string;
  site: string;
  category: SourceCategory;
  status: SourceStatus;
  verified: boolean;
  note?: string;
}

/** Métricas derivadas del corpus de writeups, calculadas en build-time. */
export interface Metrics {
  total: number;
  totalPaid: number;
  totalBountyUsd: number;
  /** Sobre los writeups que declaran monto. */
  medianBountyUsd: number;
  programsCount: number;
  byBugType: Array<{ key: BugType; count: number }>;
  bySeverity: Array<{ key: Severity; count: number }>;
  byPlatform: Array<{ key: Platform; count: number }>;
  byMonth: Array<{ key: string; count: number }>;
  /** Bounty promedio por severidad, sólo con montos publicados. */
  bountyBySeverity: Array<{ key: Severity; avg: number; n: number }>;
  topPrograms: Array<{ key: string; count: number }>;
}
