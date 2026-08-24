# Answer-First Editorial Rules

How to write an `answerFirst` block, and how to ship one without breaking a
deploy. Derived from `jvto-spesifikasi-llmstxt-factdensity-metrik.md` Bagian 3,
plus the rules that only became apparent while applying it to all 51 pages on
2026-08-24.

The spec supplies the shape. Everything under "Rules the spec does not state"
and "Shipping" came from doing the work, and those are the parts that actually
cost time when they are missed.

---

## The block

**Length** 40–60 words. Outside that range it is either too thin to answer or
long enough to have become narrative again.

**Shape** `[Subject] is [definition]. [Fact 1]. [Fact 2]. [Qualification].`

**Position** Immediately after the hero lede, before any narrative section.
Never further down the page — the position is the point.

**Density** At least three quantified facts. What counts as a fact is the
spec's list: numbers with units, dates and periods, official entity names,
document and regulation numbers, specific place names, named people. Adjectives
without measurement are not facts and do not count.

---

## Rules the spec does not state

**1. No new claims. Ever.**
Every fact in an answer block must already exist in this repo or in a document
published on the site. The block re-positions and compresses; it never adds. If
a fact you want is not already written down, the block is not where it gets
introduced.

**2. Volatile numbers are tokens, not literals.**
Review counts, package counts and prices move. Write `{GOOGLE_RATING}`,
`{GOOGLE_REVIEW_COUNT}`, `{PACKAGE_COUNT}`, `{PRICE_FROM}` and let
`applyLiveNumbers` fill them at render.

This is not hypothetical: the Google count moved 153 → 155 overnight while
these blocks were being written, and the tours pages still carry a hardcoded
"From IDR 1.55M" that the catalogue floor passed long ago — it is IDR 1M.

**3. State the limitation where one exists.**
"Escort approval is not guaranteed." "Not held as a document: cited from the
press." "Gas conditions can close the crater floor at short notice." The spec
notes this raises the Subjective Impression score; it is also the reason the
proof library is credible. Do not smooth it into marketing copy.

**4. When two sources disagree, omit the number and report the conflict.**
Madakaripura's height is recorded as 200 m in `display_height_m` and `summary`,
and as "~100 m" in `hero_meta_override` — and the ~100 m figure is duplicated
in the jvto-web FALLBACK. The answer block for that page states the location,
the walk and the entry fee, and stays silent on the height. Guessing which
field is right would have published a wrong number under an authoritative
sentence.

**5. No pronouns for a person whose pronouns are not recorded.**
The crew blocks are written without pronouns entirely: "Holds HPWKI membership
credential KTA-G-2024-006." This is easier than it sounds and reads cleaner.

**6. Count, do not assert.**
"Named in 21 guest reviews" is computed from `reviews.json` `crewCodes`, not
estimated. If a number can be derived from the SSOT, derive it.

**7. Fluff blacklist applies.**
No standalone adjective without a measurement beside it. The replacement rule
is the spec's: every time you reach for an adjective, reach for a number or a
source instead.

---

## What to lead with, by page type

| Page type | The three facts that answer it |
|---|---|
| Proof / verify | how much evidence, of what class, and how to check it |
| Destination | elevation, trailhead, duration, permit, season |
| Crew | role, employed vs freelance, credential ID, review count |
| Regulatory guide | the rule, its issuing authority, its number and date |
| Commercial | how many itineraries, duration range, what "private" means, price floor |
| Policy | the deposit, the deadline, the remedy |

---

## Shipping

Written as a sequence because the order matters. Steps 3 and 5 are where a
deploy fails if they are skipped.

**1. Write to the SSOT, never to jvto-web.**
`meta.answerFirst` in the page's `.source.json`, or a top-level `answerFirst`
for `destination-knowledge/*.content.json`.

**2. Render and confirm it lands.**
`npm run render:web-content`, then check the field appears at `/page/answerFirst`
in the route's `.website-output.json`. The renderer lifts it from `meta`; if it
is not there, nothing downstream will find it.

**3. Build against the LOCAL ekosistem, or you are testing nothing.**
`.env` sets `JVTO_EKOSYSTEM_CONTENT_BASE_URL` to the deployed content API, so a
plain `npm run build` reads content that does not have your change yet and the
block silently does not render. Force the local read:

```bash
JVTO_EKOSYSTEM_CONTENT_BASE_URL= \
JVTO_EKOSYSTEM_CONTENT_ROOT=/absolute/path/to/jvto-ekosistem \
npm run build
```

**4. The visible-content gate must pass.**
`npm run audit:ecosystem-visible-content`. Ekosistem content that nothing
renders fails the build — which is the gate working, not a nuisance. Run it
with `JVTO_EKOSYSTEM_CONTENT_ROOT` pointed at your local checkout.

**5. Deploy ekosistem first, and wait for the content API to serve it.**
The web build fetches content over HTTP while the audit reads files from disk on
the VPS. Deploy them together and the build gets stale content while the audit
gets fresh files, and the gate fails on pages that are actually correct. Confirm
first:

```bash
curl -s "https://ekosistem.javavolcano-touroperator.com/api/file?path=5-experience-engine/public-website/pages/<route>.website-output.json"
```

**6. Verify on the live site, not on a local build.**
`curl` the route and look for the block. A local build proves the code path; only
production proves the deploy.

---

## Measuring

`jvto-web/scripts/audit-answer-structure.py` scores every live route against
these rules. Run it before and after an editorial change — without a baseline
no claim of improvement is checkable.

Two judgment calls are encoded in that script and should stay encoded:

- It does not strip `<header>`. On most routes here `<header>` is the page hero,
  so stripping it discards the lede and the answer block — the exact 120 words
  being measured. Site chrome is its own `<nav>`.
- It does not treat low fact density on crew pages as a defect. Those pages are
  built from verbatim guest reviews, the highest-uplift method in the study
  behind the spec. Raising their density would mean deleting quotations to score
  better on a weaker metric.
