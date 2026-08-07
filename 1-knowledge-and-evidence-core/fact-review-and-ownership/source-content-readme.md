# content/ — Static-Content SSOT

This directory is the **single source of truth for evergreen public knowledge**
(public-content migration program, started 2026-08-04). Layout:

```
content/
├── pages/       # one file per route — .md (markdown pages) or .json (structured pages)
│   ├── policy/  travel-guide/  why-jvto/  verify-jvto/  destinations/  team/  blog/
├── entities/    # stable cross-page facts (organization, credentials, people, …)
└── faqs/        # FAQ sets — one object feeds visible HTML AND FAQPage JSON-LD
```

Rules (enforced by `npm run content:check`, which runs on every build via `prebuild`):

- A page's `route` frontmatter/meta field is authoritative — one file per route.
- `meta.title` is the page's only `<h1>`; Markdown bodies start at `##`.
- Published pages: no `TODO`/`TBD`/placeholders; internal links must resolve.
- Facts are policed by `scripts/validate-content-drift.mjs` (this dir is in its
  scan scope) against `docs/CANONICAL_FACTS.md` — founding 2015, no incorporation
  year, mandatory Ijen health wording, Lifetime Package Credit, website-only
  booking, canonical review counts.
- Loader API: `src/lib/static-content/` (`loadStaticPage(route)`,
  `listPublishedStaticPages()`, `loadEntity()`, `loadFaqSet()`). Never Prisma.

Program docs: `docs/architecture/public-content-ownership.md` (decisions) +
`docs/architecture/public-content-migration-status.md` (per-route ledger).
