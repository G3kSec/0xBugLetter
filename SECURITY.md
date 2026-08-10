# Security Policy

## Reporting a vulnerability

Open a [private security advisory](https://github.com/G3kSec/0xBugLetter/security/advisories/new)
rather than a public issue. Expect a first response within a few days.

## Threat model

The site is fully static and has no backend, no database, no user accounts and
no cookies. It stores nothing about visitors. That removes most of the usual
attack surface, and leaves one thing that actually matters:

**Content arrives through pull requests.** Anyone can propose a YAML file that
ends up rendered on the site. That is the primary trust boundary.

## How untrusted content is handled

Every value from `data/` is validated before it reaches a component:

- **URL fields** (`url`, `author_url`, `site`) must parse as absolute URLs with
  an `http:` or `https:` protocol. This blocks `javascript:` and `data:` payloads
  that would otherwise become stored XSS the moment a PR is merged. Enforced in
  both `.github/scripts/validate.py` (on the PR) and `web/src/lib/content.ts`
  (at build time) — a bypass needs both layers to fail.
- **Enum fields** (`bug_type`, `severity`, `platform`, `category`, `status`) must
  match `data/taxonomy.yaml` exactly.
- **Text fields** are rendered as React children, which escapes them. The
  codebase contains no `dangerouslySetInnerHTML`, `eval` or `innerHTML`.
- **YAML** is parsed with `js-yaml`'s default schema and Python's `safe_load`,
  so no arbitrary object instantiation.

Other measures:

- Every external link carries `rel="noreferrer noopener"`.
- No inline scripts, so the site can run under a strict CSP without
  `unsafe-inline`. The theme is resolved by `prefers-color-scheme` in CSS and
  corrected after hydration.

## Secrets

The bot's Discord webhook is read from the `DISCORD_WEBHOOK` environment
variable, supplied by a GitHub Actions secret. It is never committed.

If you fork this repository, remember that a webhook URL is a credential:
anyone holding it can post to your channel.
