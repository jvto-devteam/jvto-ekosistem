# Phase 5: Live HTML Field Audit Execution Plan

## Objective

Phase 5 validates the production HTML of each URL in the sitemap inventory and records technical page-level evidence for the fields that matter to SEO, schema quality, and stable rendering.

## Scope

This phase covers:
- HTTP status
- final URL
- page title
- meta description
- canonical
- H1 count and H1 text
- OG title / description / image
- Twitter card / image
- JSON-LD count and schema types
- fetch error, if any

## Execution Rule

Every URL from `docs/website-audit/2026-08-29/url_inventory.csv` must produce one row in `live_html_url_audit.csv`.

This environment does not expose a browser or raw HTTP fetch runtime for production pages, so the CSV below is the execution-ready artifact that will be populated by a browser/crawler or a dedicated live-fetch runner. The structure is complete, deterministic, and ready to be filled without re-running the audit logic.

## Validation logic per field

### HTTP status
- Pass if HTTP status is 200
- Non-200 rows are captured explicitly and not normalized away

### Title
- Required: non-empty string
- Pass if present and not placeholder text

### Meta description
- Required: non-empty string
- Pass if present and not auto-generated blank text

### Canonical
- Required: non-empty canonical URL
- Pass if canonical matches production URL or an accepted variant

### H1
- Require exactly one H1 in the page
- Pass only if `h1_count = 1`
- Flag if `0` or `>1`

### OG image
- Required for production pages with image-driven social cards
- Pass if `og_image` is present and absolute URL is valid

### Twitter image
- Required when Twitter card is present
- Pass if `twitter_image` is present

### JSON-LD
- Required: at least one JSON-LD script block
- Pass if `json_ld_script_count >= 1`
- Record type list in `json_ld_types`

## Pass/fail policy

| Field | Pass condition |
|---|---|
| HTTP | `http_status = 200` |
| Title | `title` not empty |
| Meta description | `meta_description` not empty |
| Canonical | `canonical` not empty |
| H1 | `h1_count = 1` |
| OG image | `og_image` not empty |
| Twitter image | `twitter_image` not empty |
| JSON-LD | `json_ld_script_count >= 1` |

## Required output

The row-level output is stored in:
`docs/website-audit/2026-08-29/live_html_url_audit.csv`

The group-level summary is stored in:
`docs/website-audit/2026-08-29/group_summary.csv`

## Follow-up action after live fetch

After each URL is fetched, the values will be inspected and any row that fails validation will be promoted into the next phase:
- `conflict_register.csv`
- `handoff_register.csv`

## Execution priority

1. Root pages and hub pages
2. Tour detail pages
3. Travel guide pages
4. Policy pages
5. Destination pages
6. Why-JVTO pages
7. Blog pages
8. Verify pages

This order prioritizes URL families with highest business impact and strongest technical repeatability.
