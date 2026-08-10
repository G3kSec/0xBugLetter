import type { Severity } from "./types";

/** Clases de color por severidad. Centralizado para que la rampa CVSS
 *  se vea igual en toda la app. */
export const SEVERITY_STYLES: Record<
  Severity,
  { text: string; bg: string; rail: string }
> = {
  Critical: { text: "text-critical", bg: "bg-critical-bg", rail: "bg-critical" },
  High: { text: "text-high", bg: "bg-high-bg", rail: "bg-high" },
  Medium: { text: "text-medium", bg: "bg-medium-bg", rail: "bg-medium" },
  Low: { text: "text-low", bg: "bg-low-bg", rail: "bg-low" },
  Info: { text: "text-info", bg: "bg-info-bg", rail: "bg-info" },
};

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** "2026-08-06" → "6 ago 2026". Parseo manual: `new Date("2026-08-06")`
 *  interpreta UTC y en zonas negativas devuelve el día anterior. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS_ES[month - 1]} ${year}`;
}

/** "2026-08" → "ago 2026" */
export function formatMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_ES[month - 1]} ${year}`;
}

export function formatBounty(amount: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

/** Dominio de una URL, para mostrar la procedencia sin ocupar una línea. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
