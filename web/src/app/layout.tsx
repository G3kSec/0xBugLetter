import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "0xBugLetter — Archivo curado de bug bounty",
    template: "%s · 0xBugLetter",
  },
  description:
    "Writeups y research de bug bounty, curados y verificados. Timeline filtrable por tipo de bug, severidad, plataforma y bounty.",
  keywords: [
    "bug bounty",
    "bug hunting",
    "writeups",
    "vulnerabilidades",
    "seguridad web",
    "appsec",
  ],
  openGraph: {
    title: "0xBugLetter — Archivo curado de bug bounty",
    description:
      "Writeups y research de bug bounty, curados y verificados. Timeline filtrable.",
    type: "website",
  },
};

/**
 * No hay script inline de bootstrap de tema a propósito.
 *
 * El default lo resuelve CSS con `prefers-color-scheme`, así que la enorme
 * mayoría no ve ningún flash. Sólo quien haya elegido explícitamente el tema
 * contrario al de su sistema percibe un frame con el otro tema, y ThemeToggle
 * lo corrige al hidratar.
 *
 * A cambio, el sitio no necesita 'unsafe-inline' en la CSP — que para un
 * proyecto de seguridad es un intercambio que conviene.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
