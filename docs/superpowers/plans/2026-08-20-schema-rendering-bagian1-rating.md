# Bagian 1 — AggregateRating: Move JSON-LD Rating Assembly to jvto-ekosistem

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Tanggal: 2026-08-20
Status: ready for implementation
Parent spec: docs/superpowers/specs/2026-08-20-ekosistem-schema-rendering-consolidation-design.md (Bagian 1 only)

## Goal

`AggregateRating` JSON-LD is currently assembled live by jvto-web (three
standalone-node builder functions, each fed by `getPublicAggregateRating()`
at request/build time). Move the assembly into jvto-ekosistem: add an
`aggregateRating` field, inline on the Organization node, to the existing
shared `buildOrganizationNode()`. jvto-web stops assembling the node and
instead reads the field off the Organization node it already receives from
ekosistem (via the existing ecosystem-first JSON-LD paths — no new fetch
call is introduced).

`getPublicAggregateRating()` itself is **not** touched — it stays exactly as
is, still used for the visible "4.9 ★" text and the `/api/product/[slug]`
API. Only the code that wraps its result into a `{"@type":
"AggregateRating", ...}` JSON-LD node is deleted.

## Architecture

**Before:** jvto-ekosistem's `buildOrganizationNode()` emits an Organization
node with no rating. jvto-web separately calls
`getPublicAggregateRating()` (which itself reads ekosistem's
`review-platforms.json`) and wraps the result into a *standalone*
`AggregateRating` node with its own `@id`, cross-referencing Organization
via `itemReviewed: {"@id": ORG_ID}`. Three near-identical builder functions
do this (home, tours hub ×3, why-jvto/reviews).

**After:** jvto-ekosistem's `buildOrganizationNode()` reads
`review-platforms.json` itself (the `platform === "Google Maps"` entry) and
embeds `aggregateRating` as an **inline property** of the Organization node
— not a separate node. Because this function is shared by every route
render-web-content-sources.mjs processes, every one of ekosistem's
generated `schema-output.json` files gets the field automatically on next
render — no per-page ekosistem change needed.

On jvto-web, there are two existing consumption paths for ekosistem's
Organization node, and both currently **strip it down to a bare
`{"@type", "@id"}` reference** on every route except the homepage (Google
stitches the entity across pages via `@id`, so re-declaring the full node
everywhere was deliberately avoided — see `PageJsonLdCombined.tsx`'s and
`builders.ts`'s "GEO audit Priority 3" comments). That stripping is exactly
why the three standalone builders existed in the first place — they were
the only way to get *some* rating signal onto non-homepage routes. This
plan's key correctness point: **both reference-stripping functions must be
updated to carry `aggregateRating` through** even while dropping every
other property, or deleting the standalone builders would silently remove
the rating from every non-homepage page instead of relocating it.

- Path A — `PageJsonLdCombined.tsx`'s `toOrganizationReference()`: used by
  home, why-jvto/reviews, why-jvto/[slug], markets ×2, verify-jvto (all
  `PageJsonLdCombined` consumers). Fixing this one function fixes all of
  them at once — no per-page code needed beyond deleting the dead
  standalone-builder calls.
- Path B — `src/lib/seo/jsonld/builders.ts`'s `toOrganizationReferenceOnly()`:
  used by the 3 tours-hub pages only (`/tours`, `/tours/from-bali`,
  `/tours/from-surabaya`), which build their JSON-LD by hand and do **not**
  use `PageJsonLdCombined`. `buildOrganizationJsonLd()` already passes
  `aggregateRating` through unmodified when ekosistem answers (it spreads
  `org.schema_json`, the full raw ecosystem node, verbatim) — the only gap
  is the reference-stripping step immediately after.

No workflow/trigger changes are needed for this bagian: `review-platforms.json`
is committed to `main` by `sync-google-reviews.yml`, and that path is **not**
in `deploy-vps.yml`'s `paths-ignore` list — so the existing daily sync
already triggers a full `deploy-vps.yml` run (which runs `npm run
render:web-content`) via its normal `on: push: branches: [main]` trigger.
Bagian 1's rating freshness is already covered by existing infrastructure.

## Tech Stack

- jvto-ekosistem: plain Node.js scripts (`.mjs`), no framework, `node:assert/strict` for tests.
- jvto-web: Next.js App Router (TypeScript), Server Components, no test framework — verified via `next build` + a live-fetch validator script + manual `curl`.

## Spec

See `docs/superpowers/specs/2026-08-20-ekosistem-schema-rendering-consolidation-design.md`,
sections: Goal, Scope, **Bagian 1**, Error handling, Testing (this plan
implements Bagian 1 only; Bagian 2/Review and Bagian 3/TouristTrip are out
of scope for this plan and untouched by every diff below).

## Global Constraints

(Copied verbatim from the parent spec — applies across all bagian, quoted here for this plan's tasks.)

- `getPublicAggregateRating()` itself is NOT deleted — only the JSON-LD
  `{"@type": "AggregateRating", ...}` wrapping code built around it.
- Error handling: if ekosistem is unreachable, the page must still render
  WITHOUT the aggregateRating node (not fail the whole build/page).
- Testing: ekosistem generator needs a unit test (node:assert/strict
  pattern). `checkNoZeroRatings`/other validate-schema.mjs checks must
  still pass. jvto-web side needs verification via `npm run
  validate:jsonld-schema` and a live `curl` check against production
  (verify the deployed page, don't just trust build success).
- This is a cross-repo plan — every task below states which repo's working
  directory it operates in. **Task 1 (jvto-ekosistem) must be committed,
  merged, and deployed to production before starting Task 2 onward
  (jvto-web)** — this avoids a window where neither side assembles the
  node (per the parent spec's "Urutan implementasi" note).

---

## Task 1 — jvto-ekosistem: embed `aggregateRating` in `buildOrganizationNode()`

**Repo / working directory:** `/Users/macbook/Code/jvto-ekosistem`

### Files

- `scripts/lib/build-organization.mjs` (edit)
- `scripts/render-web-content-sources.mjs` (edit — remove/replace stale comment)
- `scripts/test/build-organization.test.mjs` (new)
- `package.json` (edit — wire new test into `test:schema`)

### Interfaces

- New pure export `buildAggregateRating(profiles: Array<{platform, rating, reviewCount}>): {"@type":"AggregateRating", ratingValue, reviewCount, bestRating} | null` from `scripts/lib/build-organization.mjs`.
- `buildOrganizationNode(root, route)` return value gains an optional `aggregateRating` key (unchanged signature).

### Steps

1. Edit `scripts/lib/build-organization.mjs`. Current file:

```javascript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadExternalEntities, emitEntity } from "./external-entities.mjs";

const SOURCE_PATH = "1-knowledge-and-evidence-core/organization-identity/organization.json";
export const ORG_ID = "https://javavolcano-touroperator.com/#organization";

function credentialToSchema(credential, registry, route) {
  ...
}

function subjectToSchema(subject, registry, route) {
  ...
}

export async function buildOrganizationNode(root, route) {
  const raw = await readFile(path.join(root, SOURCE_PATH), "utf8");
  const data = JSON.parse(raw);
  const registry = await loadExternalEntities(root);

  const node = {
    "@id": ORG_ID,
    "@type": ["Organization", "TravelAgency", "LocalBusiness"],
    name: data.brandName,
    legalName: data.legalName,
    alternateName: data.shortName,
    url: data.websiteUrl,
    telephone: data.telephone,
    email: data.email,
    foundingDate: data.foundingDate,
    slogan: data.slogan,
    ...(data.logo ? { logo: { "@type": "ImageObject", url: data.logo } } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: data.address?.streetAddress,
      addressLocality: data.address?.addressLocality,
      addressRegion: data.address?.addressRegion,
      postalCode: data.address?.postalCode,
      addressCountry: data.address?.addressCountry,
    },
    ...(data.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: data.geo.latitude,
            longitude: data.geo.longitude,
          },
        }
      : {}),
    ...(data.sameAs?.length ? { sameAs: data.sameAs } : {}),
    ...(data.award?.length ? { award: data.award } : {}),
    ...(data.memberOf?.length
      ? {
          memberOf: data.memberOf.map((member) => { ... }),
        }
      : {}),
    ...(data.subjectOf?.length ? { subjectOf: data.subjectOf.map((s) => subjectToSchema(s, registry, route)) } : {}),
    ...(data.hasCredential?.length ? { hasCredential: data.hasCredential.map((c) => credentialToSchema(c, registry, route)) } : {}),
  };

  return node;
}
```

   Apply this diff — add the `REVIEW_PLATFORMS_PATH` constant, the
   `AGGREGATE_PLATFORM` constant, the pure `buildAggregateRating()` helper,
   the `loadReviewProfiles()` fs helper, and wire the result into the node
   (insert the `aggregateRating` spread between `geo` and `sameAs`):

```javascript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadExternalEntities, emitEntity } from "./external-entities.mjs";

const SOURCE_PATH = "1-knowledge-and-evidence-core/organization-identity/organization.json";
const REVIEW_PLATFORMS_PATH =
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json";
export const ORG_ID = "https://javavolcano-touroperator.com/#organization";

// The platform whose figure is the public aggregate — matches review-platforms.json's
// profiles[].platform. Same single-figure rule jvto-web's getPublicAggregateRating()
// enforces (owner decision 2026-08-15): Google Maps only, never a blended average.
const AGGREGATE_PLATFORM = "Google Maps";

/**
 * Pure — no fs. Given the parsed `profiles` array from review-platforms.json, returns
 * the AggregateRating node for the Google Maps entry, or null when that entry is
 * missing, malformed, or would assert a rating nobody can vouch for (reviewCount < 1 or
 * ratingValue <= 0 — the same guard `checkNoZeroRatings` in validate-schema.mjs enforces
 * on the output side, applied here so the violation is never emitted in the first
 * place). Never throws: a malformed review-platforms.json degrades to "no rating node"
 * for this route, not a failed render — same contract jvto-web's own
 * getPublicAggregateRating() follows when its sources can't answer.
 */
export function buildAggregateRating(profiles) {
  const googleProfile = Array.isArray(profiles)
    ? profiles.find((p) => p?.platform === AGGREGATE_PLATFORM)
    : null;
  if (!googleProfile) return null;

  const { rating, reviewCount } = googleProfile;
  if (typeof rating !== "number" || typeof reviewCount !== "number") return null;
  if (!(rating > 0) || !(reviewCount >= 1)) return null;

  return {
    "@type": "AggregateRating",
    ratingValue: rating,
    reviewCount,
    bestRating: 5,
  };
}

async function loadReviewProfiles(root) {
  try {
    const raw = await readFile(path.join(root, REVIEW_PLATFORMS_PATH), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.profiles) ? data.profiles : [];
  } catch {
    // Missing/unreachable/malformed file — mirrors the "ekosistem unreachable" contract
    // from the design spec's Error handling section: this route still renders, just
    // without the rating. Every other Organization field must still build normally.
    return [];
  }
}

function credentialToSchema(credential, registry, route) {
  return {
    "@type": "EducationalOccupationalCredential",
    name: credential.name,
    ...(credential.credentialCategory ? { credentialCategory: credential.credentialCategory } : {}),
    ...(credential.dateIssued ? { dateIssued: credential.dateIssued } : {}),
    ...(credential.documentUrl ? { url: credential.documentUrl } : {}),
    ...(credential.recognizedBy
      ? {
          recognizedBy:
            emitEntity(registry, credential.recognizedBy, route) ?? {
              "@type": "Organization",
              name: credential.recognizedBy,
            },
        }
      : {}),
    ...(credential.identifierValue
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: credential.name.split(" ")[0],
            value: credential.identifierValue,
          },
        }
      : {}),
    ...(credential.sha256
      ? {
          additionalProperty: {
            "@type": "PropertyValue",
            propertyID: "SHA-256",
            name: `${credential.name} document SHA-256`,
            value: credential.sha256,
          },
        }
      : {}),
  };
}

function subjectToSchema(subject, registry, route) {
  return {
    "@type": subject.type,
    ...(subject.headline ? { headline: subject.headline } : {}),
    ...(subject.name ? { name: subject.name } : {}),
    ...(subject.isbn ? { isbn: subject.isbn } : {}),
    ...(subject.datePublished ? { datePublished: subject.datePublished } : {}),
    ...(subject.url ? { url: subject.url } : {}),
    ...(subject.publisherName
      ? {
          publisher:
            emitEntity(registry, subject.publisherName, route) ?? {
              "@type": "Organization",
              name: subject.publisherName,
            },
        }
      : {}),
  };
}

export async function buildOrganizationNode(root, route) {
  const raw = await readFile(path.join(root, SOURCE_PATH), "utf8");
  const data = JSON.parse(raw);
  const registry = await loadExternalEntities(root);
  const aggregateRating = buildAggregateRating(await loadReviewProfiles(root));

  const node = {
    "@id": ORG_ID,
    "@type": ["Organization", "TravelAgency", "LocalBusiness"],
    name: data.brandName,
    legalName: data.legalName,
    alternateName: data.shortName,
    url: data.websiteUrl,
    telephone: data.telephone,
    email: data.email,
    foundingDate: data.foundingDate,
    slogan: data.slogan,
    ...(data.logo ? { logo: { "@type": "ImageObject", url: data.logo } } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: data.address?.streetAddress,
      addressLocality: data.address?.addressLocality,
      addressRegion: data.address?.addressRegion,
      postalCode: data.address?.postalCode,
      addressCountry: data.address?.addressCountry,
    },
    ...(data.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: data.geo.latitude,
            longitude: data.geo.longitude,
          },
        }
      : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(data.sameAs?.length ? { sameAs: data.sameAs } : {}),
    ...(data.award?.length ? { award: data.award } : {}),
    ...(data.memberOf?.length
      ? {
          memberOf: data.memberOf.map((member) => {
            const resolved = emitEntity(registry, member.name, route);
            if (resolved) {
              // Description stays on the definition, never on a bare reference.
              return resolved["@type"] && member.description
                ? { ...resolved, description: member.description }
                : resolved;
            }
            return {
              "@type": "Organization",
              name: member.name,
              ...(member.description ? { description: member.description } : {}),
              ...(member.sameAs ? { sameAs: member.sameAs } : {}),
            };
          }),
        }
      : {}),
    ...(data.subjectOf?.length ? { subjectOf: data.subjectOf.map((s) => subjectToSchema(s, registry, route)) } : {}),
    ...(data.hasCredential?.length ? { hasCredential: data.hasCredential.map((c) => credentialToSchema(c, registry, route)) } : {}),
  };

  return node;
}
```

2. Edit `scripts/render-web-content-sources.mjs`. Replace the stale
   `// NOTE — no aggregateRating is emitted ...` comment block (currently
   lines 93–112, sitting between `normalizeFaqForOutput()` and
   `buildWebsiteOutput()`) with an updated note reflecting the reversal.
   Delete this exact block:

```javascript
// NOTE — no aggregateRating is emitted into any rendered output, deliberately.
// (A dead `isRatingValid()` helper used to sit here; it duplicated the live
// guard in validate-schema.mjs `checkNoZeroRatings` and was never called.
// Removed 2026-08-19 because its presence kept reading as "the rating feature
// was never wired up", inviting exactly the wrong fix — see below.)
//
// organization.json DOES carry an aggregateRating (Google Maps, owner decision
// 2026-08-15). It is reference data for humans, NOT a render source. Wiring it
// into output would put a second, competing rating on the same
// `/#organization` @id, because jvto-web already emits the authoritative node
// from a LIVE source (getPublicAggregateRating → buildHomepageAggregateRatingSchema
// et al). Those two figures have already diverged: organization.json says
// reviewCount 149 (snapshotted 2026-08-15) while production emitted 152 when
// last checked 2026-08-19. A static snapshot in this repo can only ever drift.
//
// Re-introducing a blended/stale rating here is the exact regression that
// owner decision 2026-08-15 was made to end (it replaced a hand-copied
// 4.91 / 203 that had drifted from every source of truth). Rating stays
// single-source and live-only. checkNoZeroRatings remains the enforcement
// net if a rating ever does reach an output graph.
```

   and replace it with:

```javascript
// aggregateRating: emitted inline on the Organization node by
// buildOrganizationNode() (scripts/lib/build-organization.mjs), which reads
// review-platforms.json's Google Maps profile directly at render time. This
// reverses the 2026-08-15 "never bake a rating into ekosistem" decision — that
// decision was made because review-platforms.json was a one-time hand-copied
// snapshot with no regeneration mechanism (4.91/203, drifted from every real
// source). It now regenerates automatically on every daily Google-review sync
// (sync-google-reviews.yml), and that sync's commit to review-platforms.json
// triggers a full deploy-vps.yml run (which re-invokes this script) via its
// normal push-to-main trigger — so there is no scenario where a stale rating
// ships without also being the trigger for its own re-render. See
// docs/superpowers/specs/2026-08-20-ekosistem-schema-rendering-consolidation-design.md
// Bagian 1. organization.json itself still carries NO aggregateRating field —
// the figure has exactly one source (review-platforms.json), read fresh on
// every render, never duplicated into organization.json where it could drift
// again. checkNoZeroRatings (validate-schema.mjs) remains the enforcement net.
```

3. Create `scripts/test/build-organization.test.mjs`, following the
   existing `withTempRoot` fs-fixture convention used by
   `scripts/test/booking-sync/generators/context.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { buildAggregateRating, buildOrganizationNode } from "../lib/build-organization.mjs";

async function withTempRoot(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "build-organization-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const ORG_FIXTURE = {
  brandName: "Java Volcano Tour Operator",
  legalName: "PT Java Volcano Rendezvous",
  shortName: "JVTO",
  websiteUrl: "https://javavolcano-touroperator.com",
  telephone: "+6282244788833",
  email: "hello@javavolcano-touroperator.com",
  foundingDate: "2015",
  slogan: "Private volcano tours with police-led safety.",
};

// loadExternalEntities() caches its parsed registry at module scope (by design —
// see external-entities.mjs), so only the FIRST temp root's external-entities.json
// in this process is ever actually read. Every fixture below writes the same
// trivial `{records: []}` content, so this is safe; it would NOT be safe if a
// test case needed different registry content per root.
async function writeFixtures(root, { reviewPlatforms } = {}) {
  const orgDir = path.join(root, "1-knowledge-and-evidence-core/organization-identity");
  const evidenceDir = path.join(root, "1-knowledge-and-evidence-core/credentials-and-public-evidence");
  await mkdir(orgDir, { recursive: true });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(orgDir, "organization.json"), JSON.stringify(ORG_FIXTURE));
  await writeFile(path.join(orgDir, "external-entities.json"), JSON.stringify({ records: [] }));
  if (reviewPlatforms !== undefined) {
    await writeFile(
      path.join(evidenceDir, "review-platforms.json"),
      JSON.stringify(reviewPlatforms)
    );
  }
}

// ── buildAggregateRating() — pure, no fs ────────────────────────────────────

{
  const node = buildAggregateRating([
    { platform: "Trustpilot", rating: 4.8, reviewCount: 51 },
    { platform: "Google Maps", rating: 4.9, reviewCount: 152 },
  ]);
  assert.deepEqual(node, { "@type": "AggregateRating", ratingValue: 4.9, reviewCount: 152, bestRating: 5 });
}

{
  // Google Maps entry missing entirely — must not throw, must return null.
  const node = buildAggregateRating([{ platform: "Trustpilot", rating: 4.8, reviewCount: 51 }]);
  assert.equal(node, null);
}

{
  // Google Maps entry present but null (matches review-platforms.json's real shape for
  // an unverified platform, e.g. its current GetYourGuide entry).
  const node = buildAggregateRating([{ platform: "Google Maps", rating: null, reviewCount: null }]);
  assert.equal(node, null);
}

{
  // Zero reviewCount must never pass through — checkNoZeroRatings would reject it anyway,
  // but the generator itself must not emit it in the first place.
  const node = buildAggregateRating([{ platform: "Google Maps", rating: 4.9, reviewCount: 0 }]);
  assert.equal(node, null);
}

{
  // Zero/negative ratingValue must never pass through either.
  const node = buildAggregateRating([{ platform: "Google Maps", rating: 0, reviewCount: 152 }]);
  assert.equal(node, null);
}

{
  // Malformed input (not an array at all) must degrade gracefully, not throw.
  assert.doesNotThrow(() => buildAggregateRating(undefined));
  assert.equal(buildAggregateRating(undefined), null);
  assert.equal(buildAggregateRating(null), null);
}

// ── buildOrganizationNode() — end-to-end, real fs ───────────────────────────

await withTempRoot(async (root) => {
  await writeFixtures(root, {
    reviewPlatforms: {
      profiles: [
        { platform: "Trustpilot", rating: 4.8, reviewCount: 51 },
        { platform: "Google Maps", rating: 4.9, reviewCount: 152 },
      ],
    },
  });
  const node = await buildOrganizationNode(root, "/");
  assert.deepEqual(node.aggregateRating, {
    "@type": "AggregateRating",
    ratingValue: 4.9,
    reviewCount: 152,
    bestRating: 5,
  });
  assert.equal(node["@id"], "https://javavolcano-touroperator.com/#organization");
  assert.equal(node.name, "Java Volcano Tour Operator");
});

await withTempRoot(async (root) => {
  // review-platforms.json never written — simulates it being absent/unreachable.
  await writeFixtures(root);
  const node = await buildOrganizationNode(root, "/");
  assert.equal("aggregateRating" in node, false, "no rating source => no aggregateRating key at all");
  assert.equal(node.name, "Java Volcano Tour Operator", "every other field still builds normally");
});

await withTempRoot(async (root) => {
  // File present, but the Google Maps entry itself is unverified (null rating/reviewCount)
  // — real review-platforms.json currently has exactly this shape for GetYourGuide.
  await writeFixtures(root, {
    reviewPlatforms: { profiles: [{ platform: "Google Maps", rating: null, reviewCount: null }] },
  });
  const node = await buildOrganizationNode(root, "/");
  assert.equal("aggregateRating" in node, false);
});

console.log("build-organization.test.mjs: all assertions passed");
```

4. Wire the new test into `package.json`'s `test:schema` script. Current:

```json
    "test:schema": "node scripts/test/schema-contract.test.mjs && node scripts/test/validate-schema.test.mjs",
```

   New:

```json
    "test:schema": "node scripts/test/schema-contract.test.mjs && node scripts/test/validate-schema.test.mjs && node scripts/test/build-organization.test.mjs",
```

5. Run the tests and the full render + validate pipeline, then inspect a
   real generated output file to confirm the field lands correctly:

```bash
cd /Users/macbook/Code/jvto-ekosistem
node scripts/test/build-organization.test.mjs
npm run test:schema
npm run render:web-content
npm run validate:schema
python3 -c "
import json
d = json.load(open('5-experience-engine/json-ld/pages/home.schema-output.json'))
org = next(n for n in d['json_ld']['@graph'] if 'Organization' in (n.get('@type') if isinstance(n.get('@type'), list) else [n.get('@type')]))
print(org.get('aggregateRating'))
"
```

   Expected: `npm run validate:schema` prints `OK: N routes validated, 0
   violations`; the Python check prints
   `{'@type': 'AggregateRating', 'ratingValue': 4.9, 'reviewCount': 152, 'bestRating': 5}`
   (values matching the current `review-platforms.json` Google Maps entry
   at the time of the run — will differ once the daily sync updates it,
   which is expected).

6. Review the full diff (including the regenerated
   `5-experience-engine/json-ld/pages/*.schema-output.json` files — every
   route's Organization node now carries `aggregateRating`), then commit:

```bash
git status
git add scripts/lib/build-organization.mjs scripts/render-web-content-sources.mjs \
  scripts/test/build-organization.test.mjs package.json \
  5-experience-engine/json-ld/pages/
git commit -m "$(cat <<'EOF'
feat(schema): embed aggregateRating in Organization node

buildOrganizationNode() now reads review-platforms.json's Google Maps
profile and emits aggregateRating inline on every route's Organization
node, reversing the 2026-08-15 "never bake a rating into ekosistem"
decision now that the source file regenerates automatically on every
daily sync instead of being a one-time hand-copied snapshot.

Bagian 1 of docs/superpowers/specs/2026-08-20-ekosistem-schema-rendering-consolidation-design.md.
EOF
)"
```

   **Checkpoint: push/merge to `main` and confirm `deploy-vps.yml` deploys
   successfully before starting Task 2.** Verify production directly:

```bash
curl -s "https://ekosistem.javavolcano-touroperator.com/api/schema/page?route=/" | python3 -m json.tool | grep -A4 aggregateRating
```

---

## Task 2 — jvto-web: carry `aggregateRating` through reference-stripping

**Repo / working directory:** `/Users/macbook/Code/jvto-web`
**Precondition:** Task 1 deployed to ekosistem production.

### Files

- `src/components/seo/PageJsonLdCombined.tsx` (edit)
- `src/lib/seo/jsonld/builders.ts` (edit — 2 spots)

### Interfaces

- `toOrganizationReference(node)` (PageJsonLdCombined.tsx, internal): now returns `{"@type", "@id", ...(aggregateRating carried through)}` instead of a bare `{"@type", "@id"}`.
- `toOrganizationReferenceOnly<T>(node)` (builders.ts, exported): same behavior change.

### Steps

1. Edit `src/components/seo/PageJsonLdCombined.tsx`. Current (lines 96–99):

```typescript
function toOrganizationReference(node: any) {
  if (!node || typeof node !== "object" || !node["@id"]) return node;
  return { "@type": node["@type"], "@id": node["@id"] };
}
```

   Replace with:

```typescript
function toOrganizationReference(node: any) {
  if (!node || typeof node !== "object" || !node["@id"]) return node;
  return {
    "@type": node["@type"],
    "@id": node["@id"],
    // Carried through even though every other property is stripped:
    // aggregateRating is an inline property of ekosistem's Organization node
    // (jvto-ekosistem scripts/lib/build-organization.mjs, Bagian 1 of the
    // 2026-08-20 schema-rendering-consolidation design), not a separate
    // cross-referenced node. Dropping it here would silently remove the
    // rating from every non-homepage route's JSON-LD.
    ...(node.aggregateRating ? { aggregateRating: node.aggregateRating } : {}),
  };
}
```

2. Edit `src/lib/seo/jsonld/builders.ts`. Current `toOrganizationReferenceOnly` (lines 342–352):

```typescript
export function toOrganizationReferenceOnly<T>(node: T): T {
  if (Array.isArray(node)) {
    return node.map((n) =>
      isOrgClassNode(n) && (n as any)["@id"] ? { "@type": (n as any)["@type"], "@id": (n as any)["@id"] } : n,
    ) as unknown as T;
  }
  if (node && isOrgClassNode(node) && (node as any)["@id"]) {
    return { "@type": (node as any)["@type"], "@id": (node as any)["@id"] } as unknown as T;
  }
  return node;
}
```

   Replace with:

```typescript
export function toOrganizationReferenceOnly<T>(node: T): T {
  // Carries `aggregateRating` through even though every other property is
  // stripped: it's an inline property of ekosistem's Organization node
  // (jvto-ekosistem scripts/lib/build-organization.mjs, Bagian 1 of the
  // 2026-08-20 schema-rendering-consolidation design), not a separate
  // cross-referenced node. Dropping it here would silently remove the
  // rating from /tours, /tours/from-bali, /tours/from-surabaya.
  const toReference = (n: any) => ({
    "@type": n["@type"],
    "@id": n["@id"],
    ...(n.aggregateRating ? { aggregateRating: n.aggregateRating } : {}),
  });
  if (Array.isArray(node)) {
    return node.map((n) => (isOrgClassNode(n) && (n as any)["@id"] ? toReference(n) : n)) as unknown as T;
  }
  if (node && isOrgClassNode(node) && (node as any)["@id"]) {
    return toReference(node) as unknown as T;
  }
  return node;
}
```

3. In the same file, update the now-stale comment inside
   `buildOrganizationJsonLd()`'s DB-column fallback branch (the branch used
   only when `org.schema_json` is absent — i.e., ekosistem was entirely
   unreachable). Current (lines 306–330, showing the relevant slice):

```typescript
  return attachOrgCredentials(clean({
    "@type": "TravelAgency",
    "@id": ORG_ID,
    name,
    url: website,
    description: org.description || undefined,
    logo: org.logo_url ? absUrl(siteUrl, org.logo_url) : undefined,
    image: org.hero_image_url ? absUrl(siteUrl, org.hero_image_url) : undefined,
    email: org.contact_email || undefined,
    telephone: org.contact_phone || undefined,
    priceRange: org.price_range || undefined,
    foundingDate: formatDateOnly(org.founding_date),
    alternateName: org.alternate_name || undefined,
    hasMap: "https://www.google.com/maps?cid=1266403973589689021",
    areaServed: [
      { "@type": "City", "name": "Surabaya" },
      { "@type": "City", "name": "Bondowoso" },
      { "@type": "AdministrativeArea", "name": "East Java", "containedInPlace": { "@type": "Country", "name": "Indonesia" } },
    ],
    // aggregateRating intentionally omitted here — standalone AggregateRating node in
    // entityGraph.ts (/#aggregate-rating) already references Organization via itemReviewed.
    // Nesting it here caused validator to extract/consume the parent TravelAgency node.
    sameAs: sameAs.length ? sameAs : undefined,
    address,
  }));
}
```

   Replace only the comment (keep every field unchanged):

```typescript
    // aggregateRating intentionally omitted here — this branch only runs when
    // ekosistem's Organization node (which carries `aggregateRating`, see
    // jvto-ekosistem scripts/lib/build-organization.mjs) is unreachable, i.e.
    // exactly the case where no figure can be vouched for. The standalone
    // /#aggregate-rating node this comment used to reference
    // (buildHomepageAggregateRatingSchema et al. in entityGraph.ts's
    // neighbourhood) was deleted 2026-08-20 — aggregateRating is now an inline
    // property of the Organization node itself, passed through verbatim by the
    // `org.schema_json` branch above when ekosistem does answer.
```

4. Build to confirm no TypeScript errors from this task alone:

```bash
cd /Users/macbook/Code/jvto-web
npx tsc --noEmit
```

5. Commit:

```bash
git add src/components/seo/PageJsonLdCombined.tsx src/lib/seo/jsonld/builders.ts
git commit -m "$(cat <<'EOF'
fix(schema): carry aggregateRating through Organization reference-stripping

Both reference-stripping helpers (toOrganizationReference,
toOrganizationReferenceOnly) reduced non-homepage Organization nodes
to a bare {"@type","@id"} stub. Once ekosistem starts embedding
aggregateRating inline on that node (Bagian 1), stripping it away
here would silently drop the rating from every non-homepage route.
EOF
)"
```

---

## Task 3 — jvto-web: delete the homepage standalone AggregateRating builder

**Repo / working directory:** `/Users/macbook/Code/jvto-web`

### Files

- `src/lib/schemas/buildHomepageSchemas.ts` (delete — its only export is being removed and it has zero other content)
- `src/app/(website)/page.tsx` (edit)

### Steps

1. Delete the file (confirmed zero other importers of this module):

```bash
cd /Users/macbook/Code/jvto-web
rm src/lib/schemas/buildHomepageSchemas.ts
```

2. Edit `src/app/(website)/page.tsx`. Remove the two now-dead imports.
   Current (lines 18–21):

```typescript
import { DEFAULT_SITE } from "@/lib/seo/jsonld/builders";
import { buildHomepageAggregateRatingSchema } from "@/lib/schemas/buildHomepageSchemas";
import { getPublicAggregateRating } from "@/lib/publicContent/getAggregateRating";
import {
```

   Replace with:

```typescript
import { DEFAULT_SITE } from "@/lib/seo/jsonld/builders";
import {
```

   (i.e. delete the `buildHomepageAggregateRatingSchema` and
   `getPublicAggregateRating` import lines entirely — the `import { ... }
   from "@/lib/schemas/entityGraph"` block that immediately follows stays
   unchanged.)

3. In the same file, remove the rating computation. Current (inside the `Home` component, around line 141–144):

```typescript
  // FAQPage schema comes from the ekosistem-first branch of PageJsonLdCombined
  // (home/index.source.json's faq block) — no runtime resolver needed here.
  const googleStats = await getPublicAggregateRating();
  const aggregateRatingNode = buildHomepageAggregateRatingSchema(googleStats);

  // ── WebApplication schema (Ijen Health Screening — schema-only, no visual) ─
```

   Replace with:

```typescript
  // FAQPage schema comes from the ekosistem-first branch of PageJsonLdCombined
  // (home/index.source.json's faq block) — no runtime resolver needed here.
  // aggregateRating is no longer assembled here: it's an inline property of
  // the Organization node PageJsonLdCombined already reads from ekosistem
  // (jvto-ekosistem's buildOrganizationNode(), Bagian 1 of the 2026-08-20
  // schema-rendering-consolidation design).

  // ── WebApplication schema (Ijen Health Screening — schema-only, no visual) ─
```

4. In the same file, remove `aggregateRatingNode` from the `extraSchemas`
   array. Current (inside `<PageJsonLdCombined ... extraSchemas={[...]}>`):

```typescript
        extraSchemas={[
          buildFounderSchema(entityGraphFacts?.founder),
          buildDoctorSchema(entityGraphFacts?.doctor),
          buildBbksdaRegulationSchema(entityGraphFacts?.bbksdaRegulation),
          ...Object.values(buildDefinedTerms(entityGraphFacts?.definedTerms)),
          serviceNode,
          healthAppNode,
          aggregateRatingNode,
        ]}
```

   Replace with:

```typescript
        extraSchemas={[
          buildFounderSchema(entityGraphFacts?.founder),
          buildDoctorSchema(entityGraphFacts?.doctor),
          buildBbksdaRegulationSchema(entityGraphFacts?.bbksdaRegulation),
          ...Object.values(buildDefinedTerms(entityGraphFacts?.definedTerms)),
          serviceNode,
          healthAppNode,
        ]}
```

5. Build to confirm no leftover references / type errors:

```bash
npx tsc --noEmit
```

6. Commit:

```bash
git add -A -- src/lib/schemas/buildHomepageSchemas.ts "src/app/(website)/page.tsx"
git commit -m "$(cat <<'EOF'
refactor(schema): delete homepage standalone AggregateRating builder

Rating now arrives inline on the Organization node PageJsonLdCombined
already reads from ekosistem (Bagian 1 relocation) — the standalone
buildHomepageAggregateRatingSchema()/#aggregate-rating node is
redundant with it.
EOF
)"
```

---

## Task 4 — jvto-web: delete the why-jvto/reviews standalone AggregateRating builder

**Repo / working directory:** `/Users/macbook/Code/jvto-web`

### Files

- `src/lib/schemas/buildWhyJvtoSchemas.ts` (edit)
- `src/app/(website)/why-jvto/reviews/page.tsx` (edit)
- `src/app/(website)/why-jvto/[slug]/page.tsx` (edit — a dead, unreachable branch; see note in step 3)

### Steps

1. Edit `src/lib/schemas/buildWhyJvtoSchemas.ts`. Update the file header
   comment and type-import list. Current (lines 1–19):

```typescript
// src/lib/schemas/buildWhyJvtoSchemas.ts — Schema builders for /why-jvto cluster.
// Ported from rewrite repo (e:\test-2-2026\lib\schemas\buildWhyJvtoSchemas.ts) on 2026-04-29 as part of AEO/GEO port.
//
// Per cluster_role_contracts.md Cluster 3: WebPage + BreadcrumbList per page; FAQPage from narrative_claims;
// hub adds mainEntity ItemList(sub-pages); /reviews adds AggregateRating.
import type {
  AggregateRating,
  BreadcrumbList,
  ItemList,
  ListItem,
  Review,
  WebPage,
  WithContext,
} from 'schema-dts';

import { BEST_RATING, WORST_RATING } from '@/lib/publicContent/getAggregateRating';
import type { ReviewForSchema } from '@/lib/queries/schemaReviews';

const BASE_URL = 'https://javavolcano-touroperator.com';
```

   Replace with:

```typescript
// src/lib/schemas/buildWhyJvtoSchemas.ts — Schema builders for /why-jvto cluster.
// Ported from rewrite repo (e:\test-2-2026\lib\schemas\buildWhyJvtoSchemas.ts) on 2026-04-29 as part of AEO/GEO port.
//
// Per cluster_role_contracts.md Cluster 3: WebPage + BreadcrumbList per page; FAQPage from narrative_claims;
// hub adds mainEntity ItemList(sub-pages); /reviews adds per-review Review nodes.
// 2026-08-20: the standalone AggregateRating node this file used to add on /reviews
// (buildWhyJvtoReviewsAggregateRatingSchema, fed from getPublicAggregateRating()) is
// deleted per the schema-rendering-consolidation design's Bagian 1 — the rating is now
// an inline property of the Organization node, assembled once in jvto-ekosistem and
// already reaching this page via PageJsonLdCombined's ecosystem branch.
import type {
  BreadcrumbList,
  ItemList,
  ListItem,
  Review,
  WebPage,
  WithContext,
} from 'schema-dts';

import type { ReviewForSchema } from '@/lib/queries/schemaReviews';

const BASE_URL = 'https://javavolcano-touroperator.com';
```

   NOTE: This is Bagian 1's file — `buildWhyJvtoReviewsAggregateRatingSchema`
   (the AggregateRating builder) is deleted here (step 2 below). The
   `buildIndividualReviewSchemas` function in this same file is Bagian 2's
   concern (a separate plan) — do not touch it in this task.

2. In the same file, delete the `buildWhyJvtoReviewsAggregateRatingSchema`
   function entirely (currently the last thing in the file, right after
   `buildIndividualReviewSchemas`). Current tail of file:

```typescript
/**
 * AggregateRating standalone for /why-jvto/reviews — reinforces the operator-level
 * rating at reviews page level. itemReviewed cross-refs the Organization @id.
 *
 * `liveStats` MUST come from `getPublicAggregateRating()` (Google Maps only — the
 * one figure allowed to be presented as the JVTO rating). No hardcoded fallback:
 * returns null when no source can answer, and the caller omits the node.
 */
export function buildWhyJvtoReviewsAggregateRatingSchema(
  liveStats?: { rating: number; count: number } | null,
): WithContext<AggregateRating> | null {
  if (!liveStats) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    '@id': `${BASE_URL}/why-jvto/reviews#aggregate-rating`,
    itemReviewed: { '@id': `${BASE_URL}/#organization` },
    ratingValue: String(liveStats.rating),
    // schema.org types reviewCount as Integer; emitted as a numeric string (unchanged
    // runtime output) — the assertion narrows `string` to the numeric-string form.
    reviewCount: String(liveStats.count) as `${number}`,
    bestRating: String(BEST_RATING),
    worstRating: String(WORST_RATING),
  };
}
```

   Delete this entire block. (Leave `buildIndividualReviewSchemas` and its
   imports/types intact — untouched by this plan.)

3. Edit `src/app/(website)/why-jvto/reviews/page.tsx`. Current imports
   (lines 9–14):

```typescript
import {
  buildIndividualReviewSchemas,
  buildWhyJvtoReviewsAggregateRatingSchema,
} from "@/lib/schemas/buildWhyJvtoSchemas";
import { getEcosystemReviewProfiles } from "@/lib/ecosystemContent/reviewPlatforms";
import { getPublicAggregateRating } from "@/lib/publicContent/getAggregateRating";
```

   Replace with:

```typescript
import { buildIndividualReviewSchemas } from "@/lib/schemas/buildWhyJvtoSchemas";
import { getEcosystemReviewProfiles } from "@/lib/ecosystemContent/reviewPlatforms";
```

   Current `extraSchemas` construction (lines 79–83):

```typescript
  const extraSchemas = [
    // Google Maps only — the single figure allowed to be presented as THE rating.
    buildWhyJvtoReviewsAggregateRatingSchema(await getPublicAggregateRating()),
    ...buildIndividualReviewSchemas(reviewsData),
  ].filter(Boolean);
```

   Replace with:

```typescript
  // aggregateRating no longer assembled here — it's an inline property of the
  // Organization node PageJsonLdCombined already reads from ekosistem
  // (Bagian 1 of the 2026-08-20 schema-rendering-consolidation design).
  const extraSchemas = buildIndividualReviewSchemas(reviewsData);
```

4. Edit `src/app/(website)/why-jvto/[slug]/page.tsx`. This file has a
   `slug === "reviews"` branch that calls the same deleted function, but
   it is **unreachable dead code**: `generateStaticParams()` explicitly
   filters `"reviews"` out via `WHY_JVTO_FOLDER_ROUTED_SLUGS`, and
   `dynamicParams = false` means no param outside that generated set is
   ever built — Next.js also always resolves the sibling static folder
   route `why-jvto/reviews/page.tsx` first for that exact path regardless.
   Clean it up anyway so the import doesn't dangle. Current imports (lines
   14–22):

```typescript
import {
  buildIndividualReviewSchemas,
  buildWhyJvtoReviewsAggregateRatingSchema,
} from "@/lib/schemas/buildWhyJvtoSchemas";
import {
  getEcosystemReviewProfiles,
  type EcosystemReviewProfile,
} from "@/lib/ecosystemContent/reviewPlatforms";
import { getPublicAggregateRating } from "@/lib/publicContent/getAggregateRating";
```

   Replace with:

```typescript
import { buildIndividualReviewSchemas } from "@/lib/schemas/buildWhyJvtoSchemas";
import {
  getEcosystemReviewProfiles,
  type EcosystemReviewProfile,
} from "@/lib/ecosystemContent/reviewPlatforms";
```

   Current `slugExtraSchemas` construction (lines 164–175):

```typescript
  const slugExtraSchemas = [
    faqSchemaNode,
    ...(slug === "reviews"
      ? [
          // Google Maps only — the single figure allowed to be presented as THE rating.
          buildWhyJvtoReviewsAggregateRatingSchema(await getPublicAggregateRating()),
          ...buildIndividualReviewSchemas(
            reviewsData as Awaited<ReturnType<typeof getReviewsForSchema>>,
          ),
        ]
      : []),
  ].filter(Boolean);
```

   Replace with:

```typescript
  const slugExtraSchemas = [
    faqSchemaNode,
    ...(slug === "reviews"
      ? buildIndividualReviewSchemas(
          reviewsData as Awaited<ReturnType<typeof getReviewsForSchema>>,
        )
      : []),
  ].filter(Boolean);
```

5. Build to confirm no leftover references / type errors:

```bash
cd /Users/macbook/Code/jvto-web
npx tsc --noEmit
```

6. Commit:

```bash
git add src/lib/schemas/buildWhyJvtoSchemas.ts \
  "src/app/(website)/why-jvto/reviews/page.tsx" \
  "src/app/(website)/why-jvto/[slug]/page.tsx"
git commit -m "$(cat <<'EOF'
refactor(schema): delete why-jvto/reviews standalone AggregateRating builder

Rating now arrives inline on the Organization node PageJsonLdCombined
already reads from ekosistem (Bagian 1 relocation). Review nodes
(buildIndividualReviewSchemas) are untouched — out of this bagian's
scope (Bagian 2, separate plan).
EOF
)"
```

---

## Task 5 — jvto-web: delete the tours-hub standalone AggregateRating builder

**Repo / working directory:** `/Users/macbook/Code/jvto-web`

### Files

- `src/lib/schemas/buildToursHubSchemas.ts` (edit)
- `src/app/(website)/tours/page.tsx` (edit)
- `src/app/(website)/tours/from-bali/page.tsx` (edit)
- `src/app/(website)/tours/from-surabaya/page.tsx` (edit)

### Steps

1. Edit `src/lib/schemas/buildToursHubSchemas.ts`. Full current file:

```typescript
// src/lib/schemas/buildToursHubSchemas.ts — Server-side schema builders for /tours, /tours/from-bali, /tours/from-surabaya.
// Ported from rewrite repo (e:\test-2-2026\lib\schemas\buildToursHubSchemas.ts) on 2026-04-29 as part of AEO/GEO port.
//
// These three hub pages share AEO/GEO requirements per cluster_role_contracts.md Cluster 1 / Tours hub:
// CollectionPage + ItemList(TouristTrip) + BreadcrumbList + FAQPage + AggregateRating cross-ref to Organization.
//
// Decoupled from rewrite's Tour type: caller passes pre-computed `url` (relative path) so live's existing
// URL builder convention is preserved. Caller is responsible for filtering tours by origin where needed.
import type {
  AggregateRating,
  FAQPage,
  WithContext,
} from 'schema-dts';

import { BEST_RATING, WORST_RATING } from '@/lib/publicContent/getAggregateRating';
import { getToursHubQaPairs, type QaPair } from '@/lib/tourFaqs';

const BASE_URL = 'https://javavolcano-touroperator.com';

/**
 * Minimal tour shape this module needs. Caller (live's page handler) provides this via
 * adapter from its own typed objects (e.g., from Prisma `packages` query result).
 */
export interface TourHubSeed {
  name: string;
  shortDesc: string;
  image: string;
  priceFrom: number;
  /** Pre-computed relative URL path, e.g., "/tours/from-bali/bromo-ijen-3d2n". */
  url: string;
}

interface HubArgs {
  /** The tours to feature on this hub. /tours = all; /tours/from-bali = Bali-origin only; /tours/from-surabaya = Surabaya-origin only. */
  tours: TourHubSeed[];
  /** Slug suffix for the hub URL. '' = root /tours; 'from-bali' = /tours/from-bali; 'from-surabaya' = /tours/from-surabaya. */
  hubPath: '' | 'from-bali' | 'from-surabaya';
  /** Display name of the hub. */
  hubName: string;
  /** Hub-level description for AEO. */
  hubDescription: string;
}

function hubUrl(hubPath: HubArgs['hubPath']): string {
  return hubPath ? `${BASE_URL}/tours/${hubPath}` : `${BASE_URL}/tours`;
}

/**
 * Hub-level FAQPage. /tours uses the canonical 3 hub Q&A pairs (Bali vs Surabaya, Ijen vs Bromo, shortest vs longest).
 * Departure-city hubs (/tours/from-bali, /tours/from-surabaya) reuse the same hub Q&A — they remain valid comparison
 * questions for arriving visitors and reinforce the cluster's discovery role.
 *
 * `pairs`, when passed, overrides the hardcoded fallback in getToursHubQaPairs() with the
 * ekosistem-sourced content.payload.pageContent.hubFaqPairs (single-content-source consolidation).
 */
export function buildToursHubFaqSchema(pairs?: QaPair[]): WithContext<FAQPage> {
  const finalPairs = getToursHubQaPairs(pairs);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: finalPairs.map((p) => ({
      '@type': 'Question',
      name: p.question,
      acceptedAnswer: { '@type': 'Answer', text: p.answer },
    })),
  };
}

/**
 * Standalone AggregateRating that explicitly references the Organization via @id.
 *
 * `liveStats` MUST come from `getPublicAggregateRating()` (Google Maps only — the
 * one figure allowed to be presented as the JVTO rating). No hardcoded fallback:
 * returns null when no source can answer, and the caller omits the node.
 */
export function buildToursHubAggregateRatingSchema({
  hubPath,
  liveStats,
}: Pick<HubArgs, 'hubPath'> & { liveStats?: { rating: number; count: number } | null }): WithContext<AggregateRating> | null {
  if (!liveStats) return null;
  const url = hubUrl(hubPath);
  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    '@id': `${url}#aggregate-rating`,
    itemReviewed: { '@id': `${BASE_URL}/#organization` },
    ratingValue: String(liveStats.rating),
    // schema.org types reviewCount as Integer; emitted as a numeric string (unchanged
    // runtime output) — the assertion narrows `string` to the numeric-string form.
    reviewCount: String(liveStats.count) as `${number}`,
    bestRating: String(BEST_RATING),
    worstRating: String(WORST_RATING),
  };
}
```

   Replace the entire file with:

```typescript
// src/lib/schemas/buildToursHubSchemas.ts — Server-side schema builders for /tours, /tours/from-bali, /tours/from-surabaya.
// Ported from rewrite repo (e:\test-2-2026\lib\schemas\buildToursHubSchemas.ts) on 2026-04-29 as part of AEO/GEO port.
//
// These three hub pages share AEO/GEO requirements per cluster_role_contracts.md Cluster 1 / Tours hub:
// CollectionPage + ItemList(TouristTrip) + BreadcrumbList + FAQPage.
//
// 2026-08-20: the standalone AggregateRating cross-ref to Organization that used to live
// here (buildToursHubAggregateRatingSchema, fed from getPublicAggregateRating()) is
// deleted per the schema-rendering-consolidation design's Bagian 1 — the rating is now
// an inline property of the Organization node itself, assembled once in jvto-ekosistem
// (build-organization.mjs) and read on these 3 pages via getOrganizationProfile() +
// toOrganizationReferenceOnly() (src/lib/seo/jsonld/builders.ts), which now carries
// `aggregateRating` through when it strips the node to a bare reference.
//
// Decoupled from rewrite's Tour type: caller passes pre-computed `url` (relative path) so live's existing
// URL builder convention is preserved. Caller is responsible for filtering tours by origin where needed.
import type {
  FAQPage,
  WithContext,
} from 'schema-dts';

import { getToursHubQaPairs, type QaPair } from '@/lib/tourFaqs';

/**
 * Minimal tour shape this module needs. Caller (live's page handler) provides this via
 * adapter from its own typed objects (e.g., from Prisma `packages` query result).
 */
export interface TourHubSeed {
  name: string;
  shortDesc: string;
  image: string;
  priceFrom: number;
  /** Pre-computed relative URL path, e.g., "/tours/from-bali/bromo-ijen-3d2n". */
  url: string;
}

/**
 * Hub-level FAQPage. /tours uses the canonical 3 hub Q&A pairs (Bali vs Surabaya, Ijen vs Bromo, shortest vs longest).
 * Departure-city hubs (/tours/from-bali, /tours/from-surabaya) reuse the same hub Q&A — they remain valid comparison
 * questions for arriving visitors and reinforce the cluster's discovery role.
 *
 * `pairs`, when passed, overrides the hardcoded fallback in getToursHubQaPairs() with the
 * ekosistem-sourced content.payload.pageContent.hubFaqPairs (single-content-source consolidation).
 */
export function buildToursHubFaqSchema(pairs?: QaPair[]): WithContext<FAQPage> {
  const finalPairs = getToursHubQaPairs(pairs);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: finalPairs.map((p) => ({
      '@type': 'Question',
      name: p.question,
      acceptedAnswer: { '@type': 'Answer', text: p.answer },
    })),
  };
}
```

   (`BASE_URL`, `HubArgs`, and `hubUrl` are removed too — they had no
   remaining consumer once `buildToursHubAggregateRatingSchema` is gone.
   `TourHubSeed` is kept even though it also currently has zero consumers
   — that's pre-existing and outside this diff's blast radius.)

2. Edit `src/app/(website)/tours/page.tsx`. Current imports (lines 15–19):

```typescript
import {
  buildToursHubFaqSchema,
  buildToursHubAggregateRatingSchema,
} from "@/lib/schemas/buildToursHubSchemas";
import { getPublicAggregateRating } from "@/lib/publicContent/getAggregateRating";
```

   Replace with:

```typescript
import { buildToursHubFaqSchema } from "@/lib/schemas/buildToursHubSchemas";
```

   Current computation + render (lines 110–115 and 128–130):

```typescript
  // AEO/GEO port (2026-04-29): hub-level FAQPage (3 canonical Q&A from getToursHubQaPairs)
  // + standalone AggregateRating cross-ref to Organization. Per cluster_role_contracts.md Cluster 1 hub MH.
  const hubFaqSchema = buildToursHubFaqSchema(pc.hubFaqPairs);
  // Google Maps only — the single figure allowed to be presented as THE rating.
  // Null (both sources unreachable) => the node is omitted, never guessed.
  const hubAggregateRatingSchema = buildToursHubAggregateRatingSchema({ hubPath: '', liveStats: await getPublicAggregateRating() });
```

   Replace with:

```typescript
  // AEO/GEO port (2026-04-29): hub-level FAQPage (3 canonical Q&A from getToursHubQaPairs).
  // Per cluster_role_contracts.md Cluster 1 hub MH. aggregateRating is no longer
  // assembled here — it's an inline property of the Organization node `orgNode` above
  // already carries through toOrganizationReferenceOnly() (Bagian 1 relocation).
  const hubFaqSchema = buildToursHubFaqSchema(pc.hubFaqPairs);
```

   And:

```typescript
      <StructuredData data={schema} />
      <StructuredData data={hubFaqSchema} />
      {hubAggregateRatingSchema && <StructuredData data={hubAggregateRatingSchema} />}
```

   Replace with:

```typescript
      <StructuredData data={schema} />
      <StructuredData data={hubFaqSchema} />
```

3. Edit `src/app/(website)/tours/from-bali/page.tsx`. Current imports (lines 17–21):

```typescript
import {
  buildToursHubFaqSchema,
  buildToursHubAggregateRatingSchema,
} from "@/lib/schemas/buildToursHubSchemas";
import { getPublicAggregateRating } from "@/lib/publicContent/getAggregateRating";
```

   Replace with:

```typescript
import { buildToursHubFaqSchema } from "@/lib/schemas/buildToursHubSchemas";
```

   Current (lines 201–204):

```typescript
  const hubFaqSchema = buildToursHubFaqSchema(hubFaqPairs);
  // Google Maps only — the single figure allowed to be presented as THE rating.
  // Null (both sources unreachable) => the node is omitted, never guessed.
  const hubAggregateRatingSchema = buildToursHubAggregateRatingSchema({ hubPath: "from-bali", liveStats: await getPublicAggregateRating() });
```

   Replace with:

```typescript
  // aggregateRating is no longer assembled here — it's an inline property of the
  // Organization node `orgNode` above already carries through
  // toOrganizationReferenceOnly() (Bagian 1 relocation).
  const hubFaqSchema = buildToursHubFaqSchema(hubFaqPairs);
```

   Current (lines 207–210):

```typescript
      <StructuredData data={schema} />
      <StructuredData data={hubFaqSchema} />
      {hubAggregateRatingSchema && <StructuredData data={hubAggregateRatingSchema} />}
```

   Replace with:

```typescript
      <StructuredData data={schema} />
      <StructuredData data={hubFaqSchema} />
```

4. Edit `src/app/(website)/tours/from-surabaya/page.tsx`. Apply the exact
   same three edits as step 3 (imports, computation, render) — this file
   is byte-for-byte parallel to `from-bali/page.tsx` at these locations:

   Current imports (lines 17–21):

```typescript
import {
  buildToursHubFaqSchema,
  buildToursHubAggregateRatingSchema,
} from "@/lib/schemas/buildToursHubSchemas";
import { getPublicAggregateRating } from "@/lib/publicContent/getAggregateRating";
```

   Replace with:

```typescript
import { buildToursHubFaqSchema } from "@/lib/schemas/buildToursHubSchemas";
```

   Current (lines 200–203):

```typescript
  const hubFaqSchema = buildToursHubFaqSchema(hubFaqPairs);
  // Google Maps only — the single figure allowed to be presented as THE rating.
  // Null (both sources unreachable) => the node is omitted, never guessed.
  const hubAggregateRatingSchema = buildToursHubAggregateRatingSchema({ hubPath: "from-surabaya", liveStats: await getPublicAggregateRating() });
```

   Replace with:

```typescript
  // aggregateRating is no longer assembled here — it's an inline property of the
  // Organization node `orgNode` above already carries through
  // toOrganizationReferenceOnly() (Bagian 1 relocation).
  const hubFaqSchema = buildToursHubFaqSchema(hubFaqPairs);
```

   Current (lines 206–209):

```typescript
      <StructuredData data={schema} />
      <StructuredData data={hubFaqSchema} />
      {hubAggregateRatingSchema && <StructuredData data={hubAggregateRatingSchema} />}
```

   Replace with:

```typescript
      <StructuredData data={schema} />
      <StructuredData data={hubFaqSchema} />
```

5. Build to confirm no leftover references / type errors:

```bash
cd /Users/macbook/Code/jvto-web
npx tsc --noEmit
```

6. Commit:

```bash
git add src/lib/schemas/buildToursHubSchemas.ts \
  "src/app/(website)/tours/page.tsx" \
  "src/app/(website)/tours/from-bali/page.tsx" \
  "src/app/(website)/tours/from-surabaya/page.tsx"
git commit -m "$(cat <<'EOF'
refactor(schema): delete tours-hub standalone AggregateRating builder

Rating now arrives inline on the Organization node these 3 pages
already read via getOrganizationProfile() + toOrganizationReferenceOnly()
(Bagian 1 relocation, and Task 2's fix to carry the field through the
reference-stripping step).
EOF
)"
```

---

## Task 6 — jvto-web: update stale comment in entityGraph.ts

**Repo / working directory:** `/Users/macbook/Code/jvto-web`

### Files

- `src/lib/schemas/entityGraph.ts` (edit — comment only, no behavior change)

### Steps

1. `buildOrganizationReferenceSchema()` in this file has zero consumers
   (confirmed by its own header comment and by a repo-wide grep) — it is
   not touched functionally. Only its stale internal comment, which names
   three functions this plan just deleted, needs updating. Current (lines
   227–235):

```typescript
    founder: { '@id': AGUNG_ID },
    // NO aggregateRating here — deliberately. A module-level constant cannot read the
    // live rating, and the only figure permitted to be presented as the JVTO rating is
    // the Google Maps one from `getPublicAggregateRating()` (owner decision 2026-08-15;
    // see the `_comment` in jvto-ekosistem organization-identity/organization.json).
    // This property previously carried a hand-copied blended 4.91 / 203 that had drifted
    // from every source of truth. Pages that need the node emit it separately via
    // buildHomepageAggregateRatingSchema / buildToursHubAggregateRatingSchema /
    // buildWhyJvtoReviewsAggregateRatingSchema, all fed from getPublicAggregateRating().
```

   Replace the comment block (keep `founder: { '@id': AGUNG_ID },` unchanged) with:

```typescript
    founder: { '@id': AGUNG_ID },
    // NO aggregateRating here — deliberately, for a different reason than before
    // 2026-08-20. This function has zero consumers (see the file header note above);
    // if it ever gains one, it must not hand-carry a rating figure. Owner decision
    // 2026-08-15 (never assert a hand-copied/stale rating) still stands — only WHERE
    // the live figure is assembled was reversed, not whether static code may invent
    // one. As of 2026-08-20 the single source of truth is jvto-ekosistem's
    // buildOrganizationNode() (scripts/lib/build-organization.mjs), which embeds
    // `aggregateRating` inline on the Organization node it renders into every route's
    // schema-output.json. jvto-web reads it off that node — via PageJsonLdCombined's
    // ecosystem branch for most routes, or via getOrganizationProfile() +
    // toOrganizationReferenceOnly() for the tours hub, which now both carry
    // `aggregateRating` through when they strip the node to a bare reference. The
    // three page-level standalone AggregateRating builders that used to read
    // getPublicAggregateRating() (buildHomepageAggregateRatingSchema,
    // buildToursHubAggregateRatingSchema, buildWhyJvtoReviewsAggregateRatingSchema)
    // are deleted — the rating is an inline Organization property now, not a
    // separate cross-referenced node.
```

2. Build to confirm the comment-only change compiles:

```bash
cd /Users/macbook/Code/jvto-web
npx tsc --noEmit
```

3. Commit:

```bash
git add src/lib/schemas/entityGraph.ts
git commit -m "$(cat <<'EOF'
docs(schema): update stale entityGraph.ts comment after Bagian 1

Comment referenced three AggregateRating builder functions deleted
in this bagian; buildOrganizationReferenceSchema() itself has zero
consumers and is otherwise unchanged.
EOF
)"
```

---

## Task 7 — jvto-web: build, deploy, and verify live

**Repo / working directory:** `/Users/macbook/Code/jvto-web`
**Precondition:** Tasks 2–6 committed.

### Steps

1. Full production build to catch anything the incremental `tsc --noEmit`
   checks in earlier tasks might have missed (e.g. Next.js's own
   route-level type checking):

```bash
cd /Users/macbook/Code/jvto-web
npm run build
```

2. Start the built app locally and run the live JSON-LD validator against
   it (catches duplicate-@id / duplicate-singleton-type regressions from
   this bagian's edits):

```bash
npm run start &
sleep 5
npm run validate:jsonld-schema -- --base-url=http://localhost:3000
```

   Expected: `OK: 0 violations.` Stop the local server afterward.

3. Deploy to production through the repo's normal deploy path, then verify
   directly against the live site — per this session's established habit
   of not trusting build success alone:

```bash
curl -s "https://javavolcano-touroperator.com/" \
  | grep -o '"aggregateRating":{[^}]*}' | head -1

curl -s "https://javavolcano-touroperator.com/tours" \
  | grep -o '"aggregateRating":{[^}]*}' | head -1

curl -s "https://javavolcano-touroperator.com/tours/from-bali" \
  | grep -o '"aggregateRating":{[^}]*}' | head -1

curl -s "https://javavolcano-touroperator.com/tours/from-surabaya" \
  | grep -o '"aggregateRating":{[^}]*}' | head -1

curl -s "https://javavolcano-touroperator.com/why-jvto/reviews" \
  | grep -o '"aggregateRating":{[^}]*}' | head -1

curl -s "https://javavolcano-touroperator.com/verify-jvto" \
  | grep -o '"aggregateRating":{[^}]*}' | head -1

# Confirm the old standalone node is gone everywhere (no more
# "#aggregate-rating" @id anywhere in the emitted JSON-LD):
curl -s "https://javavolcano-touroperator.com/" | grep -c "aggregate-rating" # expect 0
```

   Expected: every route above prints a non-empty `"aggregateRating":{...}`
   object with `ratingValue`/`reviewCount`/`bestRating` matching the
   current `review-platforms.json` Google Maps entry; the final command
   prints `0`.

4. Run the full live validator against production for completeness:

```bash
npm run validate:jsonld-schema
```

   Expected: `OK: 0 violations.`

5. No further commit needed for this task (verification-only) — if any
   step above surfaces a regression, fix it in the relevant earlier task's
   files, re-run `npx tsc --noEmit`, and create a new commit for the fix
   before re-running this task's verification.

---

### Critical Files for Implementation

- /Users/macbook/Code/jvto-ekosistem/scripts/lib/build-organization.mjs
- /Users/macbook/Code/jvto-ekosistem/scripts/render-web-content-sources.mjs
- /Users/macbook/Code/jvto-web/src/components/seo/PageJsonLdCombined.tsx
- /Users/macbook/Code/jvto-web/src/lib/seo/jsonld/builders.ts
- /Users/macbook/Code/jvto-web/src/lib/schemas/buildToursHubSchemas.ts
