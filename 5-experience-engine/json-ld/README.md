# JSON-LD

This folder contains pre-rendered schema.org JSON-LD output, one
`*.schema-output.json` file per website route, plus `schema-types-index.json`
as a manual index of which schema.org types appear on which pages.

Rules:

- `*.schema-output.json` files are generated build output (see
  `scripts/render-web-content-sources.mjs`), not hand-edited;
- `schema-types-index.json` is manually maintained — no generator script
  writes to it;
- **`AggregateRating` and `Review` schema.org types are intentionally never
  emitted here.** This is a deliberate design decision, not an unimplemented
  feature or a gap — see the `knownOmissions` field in
  `schema-types-index.json` and the comment block in
  `scripts/render-web-content-sources.mjs` for the full rationale;
- the live rating is rendered directly by jvto-web, which reads
  `1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json`
  as its single source of truth (`getPublicAggregateRating()` →
  `getEcosystemReviewProfiles()`), independent of this folder's build output;
- per-review `Review` nodes are the same story: jvto-web renders them live
  (`buildIndividualReviewSchemas()`) reading directly from
  `1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json`,
  which is appended to daily by `sync-google-reviews.yml` — a static copy
  here would go stale the same way a static rating would;
- do not add `AggregateRating`/`Review` nodes here to "fix" the absence
  described above — that would create a second, competing source and
  reintroduce the exact drift problem the current design was built to end
  (see owner decision 2026-08-15 referenced in `render-web-content-sources.mjs`).
