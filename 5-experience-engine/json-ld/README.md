# JSON-LD

This folder contains pre-rendered schema.org JSON-LD output, one
`*.schema-output.json` file per website route, plus `schema-types-index.json`
as a manual index of which schema.org types appear on which pages.

Rules:

- `*.schema-output.json` files are generated build output (see
  `scripts/render-web-content-sources.mjs`), not hand-edited;
- `schema-types-index.json` is manually maintained — no generator script
  writes to it;
- `AggregateRating` is emitted inline on Organization nodes by
  `scripts/lib/build-organization.mjs`. Its only source is the `Google Maps`
  profile in
  `1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json`;
  ratings from other platforms are never blended into the public figure;
- `Review` nodes are emitted for the reviews hub and review-detail graphs by
  `scripts/generate-review-schema.mjs`, sourced from
  `1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json`;
- `TouristTrip`/`Offer` nodes are emitted on the 17 tour package PDPs
  (`/tours/from-bali/*`, `/tours/from-surabaya/*`) by
  `scripts/generate-tourist-trip-schema.mjs`;
- `schema-types-index.json` records prior capability changes in
  `knownOmissions`; its `AggregateRating`, `Review`, and
  `TouristTrip_and_Offer` entries are marked `REVERSED` and describe the
  active generators.
