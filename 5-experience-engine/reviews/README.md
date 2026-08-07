# Reviews

This folder contains review outputs compiled from source-backed public review
records.

Current files:

- `google-review-records.json`
- `google-review-media-records.json`
- `google-review-crew-alias-reconciliation.json`
- `crew-featured-review-evidence.json`

Rules:

- review text is public guest review content;
- profile photo URLs and API credentials are excluded;
- Google review media is stored as Google-provided media references only;
- image/video binaries are not downloaded or rehosted unless explicitly approved;
- each review record keeps `sourceLinks` with the per-review Google Business
  Profile review URL, Google Maps profile URL, and Google review resource name;
- `crew-featured-review-evidence.json` selects the strongest review evidence per
  crew using 4-star-or-higher reviews that mention the crew and include review
  media;
- crew mention counts use alias reconciliation so spelling variants such as
  `Rendi/Rendy`, `Fredi/Fredy/Freddy/Freddie`, and `Boy/Ahboy` are counted
  against one canonical crew record;
- crew/package links are kept only where the existing JVTO review data already
  provides those relationships;
- this folder is an Experience Engine output, while public trust summaries live
  in `1-knowledge-and-evidence-core/credentials-and-public-evidence`.
