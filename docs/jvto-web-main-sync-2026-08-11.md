# JVTO Web Main Sync — 2026-08-11

Source checked:

- repo: `/Users/macbook/Code/jvto-web`
- ref: `origin/main`
- commit: `75a21d11`
- latest commit time: `2026-08-11 09:00:27 +0700`

Updated ecosystem data:

- `5-experience-engine/seo-metadata/page-metadata-index.json`
  - refreshed from `src/lib/publicContent/generated/public-knowledge.json`
  - route coverage changed from 44 to 56 routes
  - newly covered route groups include home, blog, contact, ISIC, markets, tours, and trust

- `5-experience-engine/public-website/static-route-groups.json`
  - refreshed from the same public knowledge route list
  - route groups now cover all 56 public routes from `jvto-web main`

- `1-knowledge-and-evidence-core/policies/booking-payment-cancellation.json`
  - refreshed policy copy from `src/data/policy-bundle/customer-copy.json`
  - destination force majeure is now split between before Day 1 full-tour disruption and after Day 1 partial-tour disruption

- `2-product-and-commercial-core/tour-products/package-index.json`
  - refreshed from `packageListSnapshot.json` and `packageDetailSnapshots.json`
  - public package count is now 16
  - package `86` / `tours/from-surabaya/tumpak-sewu-bromo-3d2n` is absent from the latest public package snapshot after `jvto-web main` excluded soft-deleted public package detail rows

- Package `86` derivative files were kept as historical/backoffice references, but marked as excluded from the latest `jvto-web main` public snapshot:
  - product contract
  - pricing rule
  - channel availability
  - itinerary
  - website output

Source snapshot retained:

- `archive/jvto-web-main-snapshot/`
  - publicContent generated snapshots
  - CMS seed files
  - policy bundle files
  - note: `origin/main` does not currently track `src/data/blog/*`; blog routes are represented through `public-knowledge.json`

Review data note:

The `jvto-web main` generated `reviewApiSnapshots.json` is older than the Google review/media data already present in this ecosystem project. The existing ecosystem review files were not overwritten with that older generated review snapshot.

Recheck note:

- `jvto-web main` `reviewApiSnapshots.json` generated at `2026-07-31T05:50:48.112Z`
- ecosystem Google review records generated at `2026-08-07T07:33:31.431Z`
- ecosystem Google review media generated at `2026-08-07T07:38:33.915Z`
- ecosystem Google media coverage remains 56 reviews with 251 media items

Validation:

- parsed all JSON files in `jvto-ekosistem`
- verified 56 page metadata records and 56 route-group entries
- verified 16 active public packages in package index
- rechecked 22 retained source snapshot files against `jvto-web origin/main` by hash; no mismatches
- verified derived route metadata, route groups, package index, policy copy, and package `86` exclusion status against the retained `jvto-web main` snapshot
