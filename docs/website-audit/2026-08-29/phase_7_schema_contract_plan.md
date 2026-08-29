# Phase 7: Structured Data Contract Validation

## Objective

This phase validates the structured data emitted by the live pages and confirms whether the schema contract matches the route pattern and page owner.

## Scope

The audit checks:
- `@type`
- `@id`
- `mainEntity`
- breadcrumb structure
- `isPartOf`
- `about`
- `mentions`
- singleton schema expectations

## Output

`docs/website-audit/2026-08-29/schema_contract_check.csv`

## Rules

- `WebSite` should exist once per ownership graph
- `WebPage` must point to an actual canonical page URL
- `BreadcrumbList` expected when a page has a hierarchy
- `FAQPage` only present when FAQ exists or contract requires it
- `ProfilePage` for crew/team pages
- `TouristTrip` or `Product` for tour detail pages
- `BlogPosting` or `Article` for blog pages

## Validation status

- `pass` = field exists and matches expected pattern
- `warning` = field exists but weak or partial
- `fail` = missing, mismatched, or duplicate owner
