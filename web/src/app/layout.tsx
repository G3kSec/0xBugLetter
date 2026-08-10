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
    default: "0xBugLetter | by G3kSec",
    template: "%s · 0xBugLetter",
  },
  description:
    "A curated archive of bug bounty writeups and research. Every entry verified against its source, filterable by bug type and year.",
  keywords: [
    "bug bounty",
    "bug hunting",
    "writeups",
    "vulnerabilities",
    "web security",
    "appsec",
  ],
  authors: [{ name: "G3kSec", url: "https://github.com/G3kSec" }],
  openGraph: {
    title: "0xBugLetter — Curated bug bounty archive",
    description:
      "A curated archive of bug bounty writeups and research. Every entry verified against its source.",
    type: "website",
  },
};

/**
 * There is no inline theme-bootstrap script on purpose.
 *
 * CSS resolves the default through `prefers-color-scheme`, so almost nobody
 * sees a flash. Only someone who explicitly picked the opposite of their
 * system theme gets one frame of the other theme, and ThemeToggle corrects it
 * on hydration.
 *
 * In exchange the site never needs 'unsafe-inline' in its CSP — a good trade
 * for a security project.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
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
