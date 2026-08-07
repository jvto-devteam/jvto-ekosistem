# Google Review Crew Alias Audit

Audit date: 2026-08-07

Purpose: make Google review `reviewCount` per crew safer by handling spelling
variants and nickname variants in guest review text.

## Method

The current count now uses a union of:

- existing `crew_reviews` relations from `jvto-web`;
- review-text alias matching from `5-experience-engine/reviews/google-review-crew-alias-reconciliation.json`.

Each crew is counted at most once per review even if the same alias appears
multiple times in that review.

## Result

- Google reviews checked: 147
- Previous reviews with crew relation: 86
- Alias-adjusted reviews with crew mention: 97
- Additional reviews resolved by alias/text matching: 11
- Crew with at least one featured review that includes Google media: 16
- Featured crew review evidence records: 50

The featured-review evidence lives in
`5-experience-engine/reviews/crew-featured-review-evidence.json`. Each selected
review keeps its Google Business Profile review URL, Google Maps profile URL,
Google review resource name, and media references.

Largest count changes:

- Fredi: 9 -> 21 via `Fredi`, `Fredy`, `Freddy`, `Freddie`
- Rendi: 13 -> 15 via `Rendi`, `Rendy`
- Yandi: 8 -> 10 via `Yandi`, `Yandy`, `Yendi`
- Taufik: 5 -> 7 via `Taufik`, `Tufik`, `Mas Opik`, `Opik`
- Boy: 9 -> 10 via `Boy`, `Ahboy`, `Ah Boy`, `Ah Boi`

## Unresolved Names

These names appear in Google reviews but are not present in the current
canonical crew roster, so they are not merged into crew counts yet:

- Johan: 9 reviews
- Sulis: 3 reviews
- Dosi: 2 reviews
- Gean: 2 reviews
- Cahya: 1 review
- Dinca: 1 review
- Yoga: 1 review

Owner mapping is needed before these can become canonical crew/person counts.
