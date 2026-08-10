import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line-subtle">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm text-ink-3">
          Archivo curado de bug bounty. Todo el contenido vive en el repo como
          YAML — se contribuye por pull request.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/contribute" className="text-ink-2 transition-colors hover:text-accent">
            Contribuir
          </Link>
          <a
            href="https://github.com/G3kSec/0xBugLetter"
            target="_blank"
            rel="noreferrer noopener"
            className="text-ink-2 transition-colors hover:text-accent"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
