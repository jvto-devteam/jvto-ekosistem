# GEO Schema Engine + jvto-web Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `jvto-ekosistem` the canonical, complete data source for JSON-LD schema (`Organization`/`FAQPage`/`Person`/`GovernmentService`/`TouristTrip`), `llms.txt`, and answer-first content — then switch `jvto-web`'s existing (DB-driven + hardcoded + `llm-wiki`-synced) systems to consume it instead of maintaining three parallel sources.

**Architecture:** Part A builds a `@graph`/`@id` schema engine in `jvto-ekosistem` (extends the original 6-phase handoff with the trust-data enrichment discovered during review) and outputs everything through the existing `render-web-content-sources.mjs` pipeline. Part B — a **separate repo, separate approval gate** — points `jvto-web`'s schema builders, `/llms.txt` route, and travel-guide page components at that output instead of Prisma/`entityGraph.ts`/`llm-wiki`'s trust-bundle sync.

**Tech Stack:** Node.js ESM (no new dependencies — repo constraint), Next.js/TypeScript (`jvto-web` side, Part B only).

## Global Constraints

- No new npm dependencies in `jvto-ekosistem` — Node ESM only (existing constraint: repo has only `tinacms`/`chokidar`/`concurrently`).
- Never touch `jvto-web`, `.github/workflows/deploy-vps.yml`, or `tina/` while executing Part A.
- Never fabricate rating, coordinate, date, or regulation-number values. If a real verified value isn't available, skip the node and report it — do not invent one.
- Never promote a `source_trace.confidence` from `"inferred"` to `"verified"`. Report the list to the owner instead.
- No mass rewrite of marketing copy. Additive fields only.
- Part A produces a PR to `main` — **do not merge, do not deploy**.
- Part B (jvto-web) requires **explicit separate owner approval** before any file in `../jvto-web` is touched — it is a different repo with its own deploy pipeline and its own guardrails; this plan documents it but Part A's execution must not depend on Part B being approved.
- Every JSON value quoted in this plan (SHA-256 hashes, NIB/TDUP numbers, URLs) was read directly from `jvto-web/src/lib/schemas/entityGraph.ts` or `jvto-ekosistem` source files during the review that produced this plan — copy them verbatim, do not retype from memory.

---

## Known conflicts to flag, not silently resolve

Two data conflicts were found during review. Neither should be resolved by picking a value unilaterally — both need to land in the PR report for the owner.

1. **Trustpilot rating/review count mismatch.** `jvto-ekosistem/1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json` states Trustpilot = 51 reviews / 4.8 rating, verified `2026-05-09`, and claims (in its own `_comment`) to be "consumed by `src/lib/jvtoReviews.ts`". It is not — `jvto-web/src/lib/jvtoReviews.ts` hardcodes `AGGREGATE_RATING` as `reviewCount: 203, ratingValue: 4.91` with Trustpilot sub-count 44 / rating 4.93, verified `2026-07-16`. Two different numbers for the same platform.
2. **`TouristTrip` may already have a production pipeline.** `jvto-web/src/data/trust-bundle/schema/tourist-trip.json` is synced from `llm-wiki` (`npm run sync:trust` in jvto-web) and is already referenced from `buildTourSchemas.ts` / tour detail pages. Building `TouristTrip` from `standard-package-route-map.json` in Part A (Task A10) may be duplicating work `llm-wiki` already does — and that file's own `source_trace` cites `llm_wiki` as its origin with `confidence: "inferred"` for every package, which is *why* the original handoff's gate blocks emission anyway. Task A10 below stays gated exactly as the original handoff specified; this note exists so the PR report calls out the collision explicitly instead of presenting `TouristTrip` as a clean net-new capability.

---

# Part A — jvto-ekosistem (schema data completion + engine)

Repo: `jvto-ekosistem` @ `main`, working in worktree `geo-schema` (per `jvto-setup-claude-code-cli.md` §4). All paths below are relative to the repo root unless prefixed `../jvto-web/`.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `scripts/lib/schema-contract.mjs` | create | `composeGraph(nodes)` — pure function: dedupe by `@id`, reject nodes without `@id`, reject >1 singleton per route |
| `scripts/lib/build-organization.mjs` | create | Reads `organization.json` → `Organization`/`TravelAgency` node |
| `scripts/lib/build-police-authority.mjs` | create | Reads new `police-authority.json` → `GovernmentService` node |
| `scripts/validate-schema.mjs` | create | Gate script — 6 checks from handoff §5 |
| `scripts/render-llms-txt.mjs` | create | Renders `public/llms.txt` from the knowledge feed |
| `scripts/render-web-content-sources.mjs` | modify | `buildSchemaOutput()` refactored to emit `@graph`; FAQ activation; rating-zero guard |
| `server.mjs` | modify | Expose generated JSON-LD page output through a schema endpoint mirroring `/api/website/page` |
| `1-knowledge-and-evidence-core/organization-identity/organization.json` | modify | Add `sameAs`, `hasCredential`, `award`, `memberOf`, `subjectOf`, `logo` |
| `1-knowledge-and-evidence-core/people-and-crew/people.json` | modify | Restructure `leadership[]` entries to carry schema-ready fields; add `medicalPartner` schema fields |
| `1-knowledge-and-evidence-core/credentials-and-public-evidence/police-authority.json` | create | New structured source for `GovernmentService` (the existing `police-safety.json` is prose-only, not usable as schema input) |
| `1-knowledge-and-evidence-core/travel-guide/rijik-monthly-closure.source.json` | modify | Add `answerFirst` |
| `1-knowledge-and-evidence-core/travel-guide/ijen-health-screening.source.json` | modify | Add `answerFirst` |
| `1-knowledge-and-evidence-core/travel-guide/police-escort-for-groups.source.json` | modify | Add `answerFirst` |
| `scripts/test/schema-contract.test.mjs` | create | Assertions for `composeGraph()` (repo has no test framework — plain `node:assert`) |
| `scripts/test/validate-schema.test.mjs` | create | Assertions for the 6 validator rules |
| `package.json` | modify | Add `validate:schema`, `render:llms`, `test:schema` scripts |

---

### Task A1: Strip zero-value `aggregateRating` (guardrail fix)

**Files:**
- Modify: `scripts/render-web-content-sources.mjs`

**Interfaces:**
- Produces: a rule every later schema-emitting function must follow — never emit `aggregateRating` when `reviewCount < 1` or `ratingValue <= 0`.

- [ ] **Step 1: Confirm current occurrence count (baseline, do not change yet)**

```bash
grep -rE '"ratingValue": ?0|"reviewCount": ?0' . --include="*.json" | grep -v archive | wc -l
```

Expected: `34` (verified during review — if a different number appears, record the new baseline in the PR report, don't investigate further here).

- [ ] **Step 2: Add the guard as a shared helper at the top of `scripts/render-web-content-sources.mjs`**

```javascript
function isRatingValid(rating) {
  return Boolean(rating) && Number(rating.reviewCount) >= 1 && Number(rating.ratingValue) > 0;
}
```

This helper may have no immediate output impact because `aggregateRating` remains omitted until the Trustpilot conflict is resolved. Keep it as the required local guard for any later schema builder that considers emitting ratings; do not add a zero-valued placeholder rating just to exercise it.

- [ ] **Step 3: Commit**

```bash
git add scripts/render-web-content-sources.mjs
git commit -m "feat(schema): add isRatingValid guard for zero-value aggregateRating"
```

(This helper is consumed by Task A7 — no output changes yet, so nothing to re-render.)

---

### Task A2: Enrich `organization.json` with missing trust fields

**Files:**
- Modify: `1-knowledge-and-evidence-core/organization-identity/organization.json`

**Interfaces:**
- Consumes: nothing new.
- Produces: `sameAs[]`, `hasCredential[]`, `award[]`, `memberOf[]`, `subjectOf[]`, `logo` fields — consumed by Task A4 (`build-organization.mjs`).

These values were read verbatim from `jvto-web/src/lib/schemas/entityGraph.ts` (`ORGANIZATION_SCHEMA`, `ORGANIZATION_HAS_CREDENTIAL`) during review — this is the same data already live on jvto-web, being ported into structured source form so `jvto-ekosistem` can become the single place it's authored.

- [ ] **Step 1: Add `sameAs`, `award`, `memberOf`, `subjectOf`, `logo` to `organization.json`**

Add these top-level keys (after `"identifiers"`, before `"bookingChannel"`):

```json
  "logo": "https://javavolcano-touroperator.com/assets/img/jvto-color.png",
  "sameAs": [
    "https://www.trustpilot.com/review/javavolcano-touroperator.com",
    "https://www.google.com/maps?cid=1266403973589689021",
    "https://www.tripadvisor.com/Attraction_Review-g297715-d19983165-Reviews-Java_Volcano_Tour_Operator-Surabaya_East_Java_Java.html",
    "https://www.getyourguide.com/java-volcano-tour-operator-s260697/",
    "https://www.isic.org/discounts/?providerId=259268",
    "https://www.indecon.id/spotlight-networks/java-volcano-tour-operator",
    "https://ahu.go.id/sabh/perseroan/qrcode/?kode=NDAyMzAyMDYzNTEwMjE3NF8yXzA4IEZlYnJ1YXJpIDIwMjNfMDggRmVicnVhcmkgMjAyMw==",
    "https://www.facebook.com/javavolcanotours/",
    "https://www.instagram.com/javavolcanotouroperator/",
    "https://twitter.com/jvto_tours"
  ],
  "award": [
    "Booking.com Guest Review Award 2015 — Ijen Bondowoso Homestay (Score 9.4/10)",
    "Stefan Loose Reiseführer Indonesien — Editorial Feature (4th Edition, 2018)"
  ],
  "memberOf": [
    {
      "name": "HPWKI (Himpunan Pelaku Wisata Khusus Ijen)",
      "description": "Ijen volcano guide association; members receive annual BBKSDA safety training on volcanic gas protocols.",
      "sameAs": "https://ahu.go.id/sabh/perkumpulan/qrcode/?kode=NjAyNDAxMjczNTEwMTM2MV8wXzA3IEZlYnJ1YXJpIDIwMjRfMjcgSmFudWFyeSAyMDI0"
    },
    {
      "name": "INDECON (Indonesian Ecotourism Network)",
      "sameAs": "https://www.indecon.id/spotlight-networks/java-volcano-tour-operator"
    },
    {
      "name": "ISIC (International Student Identity Card)",
      "sameAs": "https://www.isic.org/discounts/?providerId=259268"
    }
  ],
  "subjectOf": [
    {
      "type": "NewsArticle",
      "headline": "Suka Duka Polisi Pariwisata Bondowoso: Tegakkan Prokes Sambil Lawan Dingin",
      "datePublished": "2021-03-14",
      "url": "https://news.detik.com/berita-jawa-timur/d-5492690/suka-duka-polisi-pariwisata-bondowoso-tegakkan-prokes-sambil-lawan-dingin",
      "publisherName": "Detik.com"
    },
    {
      "type": "NewsArticle",
      "headline": "Polpar Dibentuk untuk Mendukung Ijen Geopark",
      "url": "https://radarjember.jawapos.com/bondowoso/791102263/polpar-dibentuk-untuk-mendukung-ijen-geopark",
      "publisherName": "Radar Jember / Jawa Pos"
    },
    {
      "type": "Book",
      "name": "Stefan Loose Reiseführer Indonesien",
      "isbn": "978-3-7701-7881-0",
      "datePublished": "2018-07-05",
      "publisherName": "DuMont Reiseverlag"
    }
  ],
```

- [ ] **Step 2: Add `hasCredential[]` (NIB/TDUP/HPWKI with SHA-256 anchors)**

Add after `sameAs`:

```json
  "hasCredential": [
    {
      "name": "NIB (Nomor Induk Berusaha)",
      "identifierValue": "1102230032918",
      "sha256": "fa20dde31bb75e46b061ed14cc6d003f6960c02a9a82c20d8603b0cbf6f7b1b7",
      "documentUrl": "https://javavolcano-touroperator.com/legal/NIB-1102230032918.pdf",
      "credentialCategory": "Indonesian Business Registration",
      "recognizedBy": "Kementerian Investasi / BKPM Indonesia"
    },
    {
      "name": "TDUP (Tanda Daftar Usaha Pariwisata)",
      "identifierValue": "1102230032918",
      "dateIssued": "2023-02-11",
      "sha256": "27252d512ddfa74de22a3e3ec10aa3dd40ef88da3eb57349fcd2137411551ee3",
      "documentUrl": "https://javavolcano-touroperator.com/legal/TDUP-1102230032918.pdf",
      "credentialCategory": "Indonesian Tourism Business Licence",
      "recognizedBy": "Kementerian Pariwisata dan Ekonomi Kreatif"
    },
    {
      "name": "HPWKI Membership (Himpunan Pelaku Wisata Khusus Ijen)",
      "sha256": "ca1fb1a48b550a7748d400f165899f12a356e6941aacdde9c043427698aaf63b",
      "documentUrl": "https://javavolcano-touroperator.com/legal/HPWKI-approval.pdf",
      "credentialCategory": "Volcanic Tourism Association — BBKSDA supervised",
      "recognizedBy": "HPWKI — supervised by BBKSDA Jawa Timur"
    }
  ],
```

- [ ] **Step 3: Do NOT add `aggregateRating` yet**

Leave it out of `organization.json` for this task — the Trustpilot number conflict (see "Known conflicts" above) must be resolved by the owner first. Add a line to `_comment`:

```json
  "_comment": "... aggregateRating intentionally omitted — see PR report §Known Conflicts, Trustpilot count differs between review-platforms.json (51) and jvto-web/src/lib/jvtoReviews.ts (44), needs owner reconciliation before this node can cite a number.",
```

- [ ] **Step 4: Validate JSON syntax**

```bash
node -e "JSON.parse(require('fs').readFileSync('1-knowledge-and-evidence-core/organization-identity/organization.json', 'utf8')); console.log('JSON OK')"
```

Expected: `JSON OK`

- [ ] **Step 5: Commit**

```bash
git add 1-knowledge-and-evidence-core/organization-identity/organization.json
git commit -m "feat(schema): enrich organization.json with sameAs, hasCredential, award, memberOf, subjectOf"
```

---

### Task A3: `schema-contract.mjs` — `composeGraph()`

**Files:**
- Create: `scripts/lib/schema-contract.mjs`
- Test: `scripts/test/schema-contract.test.mjs`

**Interfaces:**
- Produces: `composeGraph(nodes: SchemaNode[]): { "@context": string, "@graph": SchemaNode[] }` where `SchemaNode = { "@id": string, "@type": string | string[], [key: string]: unknown }`. Throws `Error` (message prefixed `"schema-contract:"`) on: any node missing `@id`, or more than one node per singleton class (`Organization`/`TravelAgency`/`LocalBusiness` count as one class; `FAQPage`; any `@type` ending in `Page` that isn't `FAQPage` counts as the "WebPage-class" singleton).
- Consumed by: Task A7 (`buildSchemaOutput`).

- [ ] **Step 1: Write the test file**

```javascript
// scripts/test/schema-contract.test.mjs
import assert from "node:assert/strict";
import { composeGraph } from "../lib/schema-contract.mjs";

// Test 1: basic dedupe by @id, first occurrence wins
{
  const nodes = [
    { "@id": "https://x/#organization", "@type": "Organization", name: "First" },
    { "@id": "https://x/#organization", "@type": "Organization", name: "Duplicate" },
    { "@id": "https://x/#webpage", "@type": "WebPage", name: "Page" },
  ];
  const graph = composeGraph(nodes);
  assert.equal(graph["@context"], "https://schema.org");
  assert.equal(graph["@graph"].length, 2);
  assert.equal(graph["@graph"][0].name, "First");
}

// Test 2: node without @id throws
{
  const nodes = [{ "@type": "Organization", name: "No id" }];
  assert.throws(() => composeGraph(nodes), /schema-contract:.*@id/);
}

// Test 3: two distinct Organization-class nodes throws (singleton violation)
{
  const nodes = [
    { "@id": "https://x/#organization", "@type": "Organization" },
    { "@id": "https://x/#organization-2", "@type": "TravelAgency" },
  ];
  assert.throws(() => composeGraph(nodes), /schema-contract:.*Organization/);
}

// Test 4: two distinct FAQPage nodes throws
{
  const nodes = [
    { "@id": "https://x/#faq", "@type": "FAQPage" },
    { "@id": "https://x/#faq-2", "@type": "FAQPage" },
  ];
  assert.throws(() => composeGraph(nodes), /schema-contract:.*FAQPage/);
}

// Test 5: two distinct WebPage-class nodes throws
{
  const nodes = [
    { "@id": "https://x/#webpage", "@type": "WebPage" },
    { "@id": "https://x/#webpage-2", "@type": "ProfilePage" },
  ];
  assert.throws(() => composeGraph(nodes), /schema-contract:.*WebPage/);
}

// Test 6: array @type is handled (e.g. ["Person", "Physician"])
{
  const nodes = [{ "@id": "https://x/#doc", "@type": ["Person", "Physician"] }];
  const graph = composeGraph(nodes);
  assert.equal(graph["@graph"].length, 1);
}

console.log("schema-contract.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run it to confirm it fails (module doesn't exist yet)**

```bash
node scripts/test/schema-contract.test.mjs
```

Expected: `Error: Cannot find module '.../scripts/lib/schema-contract.mjs'`

- [ ] **Step 3: Implement `scripts/lib/schema-contract.mjs`**

```javascript
const ORGANIZATION_CLASS = new Set(["Organization", "TravelAgency", "LocalBusiness"]);

function typesOf(node) {
  const t = node["@type"];
  return Array.isArray(t) ? t : [t];
}

function singletonClassOf(node) {
  const types = typesOf(node);
  if (types.some((t) => ORGANIZATION_CLASS.has(t))) return "Organization";
  if (types.includes("FAQPage")) return "FAQPage";
  if (types.some((t) => typeof t === "string" && t.endsWith("Page") && t !== "FAQPage")) {
    return "WebPage-class";
  }
  return null;
}

export function composeGraph(nodes) {
  const byId = new Map();
  const singletonSeen = new Map();

  for (const node of nodes) {
    if (!node || !node["@id"]) {
      throw new Error(`schema-contract: node missing required @id — ${JSON.stringify(node)}`);
    }
    if (byId.has(node["@id"])) continue; // dedupe, first occurrence wins

    const singletonClass = singletonClassOf(node);
    if (singletonClass) {
      const seenId = singletonSeen.get(singletonClass);
      if (seenId && seenId !== node["@id"]) {
        throw new Error(
          `schema-contract: more than one ${singletonClass} node in this route (${seenId} and ${node["@id"]})`
        );
      }
      singletonSeen.set(singletonClass, node["@id"]);
    }

    byId.set(node["@id"], node);
  }

  return {
    "@context": "https://schema.org",
    "@graph": [...byId.values()],
  };
}
```

- [ ] **Step 4: Run the test again to confirm it passes**

```bash
node scripts/test/schema-contract.test.mjs
```

Expected: `schema-contract.test.mjs: all assertions passed`

- [ ] **Step 5: Add the `test:schema` script and commit**

In `package.json`, add to `"scripts"`:

```json
    "test:schema": "node scripts/test/schema-contract.test.mjs && node scripts/test/validate-schema.test.mjs",
```

(the second file is created in Task A8 — this line is added now but will fail until then; that's fine, it's committed alongside A8, not here. For this task, add only the file and reference it.)

```bash
git add scripts/lib/schema-contract.mjs scripts/test/schema-contract.test.mjs
git commit -m "feat(schema): add composeGraph pure function with dedupe + singleton guards"
```

---

### Task A4: `build-organization.mjs`

**Files:**
- Create: `scripts/lib/build-organization.mjs`

**Interfaces:**
- Consumes: `1-knowledge-and-evidence-core/organization-identity/organization.json` (enriched in Task A2).
- Produces: `buildOrganizationNode(): SchemaNode` with `@id: "https://javavolcano-touroperator.com/#organization"`, `@type: ["Organization", "TravelAgency", "LocalBusiness"]`. Consumed by Task A7.

- [ ] **Step 1: Implement**

```javascript
// scripts/lib/build-organization.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";

const ORG_SOURCE_PATH = "1-knowledge-and-evidence-core/organization-identity/organization.json";
export const ORG_ID = "https://javavolcano-touroperator.com/#organization";

export async function buildOrganizationNode(root) {
  const raw = await readFile(path.join(root, ORG_SOURCE_PATH), "utf8");
  const org = JSON.parse(raw);

  const identifier = (org.identifiers ?? []).map((id) => ({
    "@type": "PropertyValue",
    propertyID: id.type,
    value: id.value,
    ...(id.dateIssued ? { validFrom: id.dateIssued } : {}),
  }));

  const hasCredential = (org.hasCredential ?? []).map((cred) => ({
    "@type": "EducationalOccupationalCredential",
    name: cred.name,
    ...(cred.credentialCategory ? { credentialCategory: cred.credentialCategory } : {}),
    ...(cred.dateIssued ? { dateIssued: cred.dateIssued } : {}),
    ...(cred.documentUrl ? { url: cred.documentUrl } : {}),
    ...(cred.recognizedBy ? { recognizedBy: { "@type": "GovernmentOrganization", name: cred.recognizedBy } } : {}),
    identifier: [
      ...(cred.identifierValue ? [{ "@type": "PropertyValue", propertyID: cred.name.split(" ")[0], value: cred.identifierValue }] : []),
      ...(cred.sha256 ? [{ "@type": "PropertyValue", propertyID: "SHA-256", name: `${cred.name} document SHA-256`, value: cred.sha256 }] : []),
    ],
  }));

  return {
    "@id": ORG_ID,
    "@type": ["Organization", "TravelAgency", "LocalBusiness"],
    name: org.brandName,
    legalName: org.legalName,
    alternateName: org.shortName,
    url: org.websiteUrl,
    telephone: org.telephone,
    email: org.email,
    foundingDate: org.foundingDate,
    slogan: org.slogan,
    ...(org.logo ? { logo: org.logo } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: org.address.streetAddress,
      addressLocality: org.address.addressLocality,
      addressRegion: org.address.addressRegion,
      postalCode: org.address.postalCode,
      addressCountry: org.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: org.geo.latitude,
      longitude: org.geo.longitude,
    },
    identifier,
    ...(hasCredential.length ? { hasCredential } : {}),
    ...(org.award?.length ? { award: org.award } : {}),
    ...(org.memberOf?.length
      ? {
          memberOf: org.memberOf.map((m) => ({
            "@type": "Organization",
            name: m.name,
            ...(m.description ? { description: m.description } : {}),
            ...(m.sameAs ? { sameAs: m.sameAs } : {}),
          })),
        }
      : {}),
    ...(org.subjectOf?.length
      ? {
          subjectOf: org.subjectOf.map((s) => ({
            "@type": s.type,
            ...(s.headline ? { headline: s.headline } : {}),
            ...(s.name ? { name: s.name } : {}),
            ...(s.datePublished ? { datePublished: s.datePublished } : {}),
            ...(s.url ? { url: s.url } : {}),
            ...(s.isbn ? { isbn: s.isbn } : {}),
            ...(s.publisherName ? { publisher: { "@type": "Organization", name: s.publisherName } } : {}),
          })),
        }
      : {}),
    ...(org.sameAs?.length ? { sameAs: org.sameAs } : {}),
  };
}
```

- [ ] **Step 2: Manual smoke test**

```bash
node -e "
import('./scripts/lib/build-organization.mjs').then(async (m) => {
  const node = await m.buildOrganizationNode(process.cwd());
  console.log(JSON.stringify(node, null, 2).slice(0, 500));
  console.log('@id:', node['@id']);
  console.log('has sameAs:', Array.isArray(node.sameAs) && node.sameAs.length > 0);
  console.log('has hasCredential:', Array.isArray(node.hasCredential) && node.hasCredential.length === 3);
});
"
```

Expected: prints the node, `@id: https://javavolcano-touroperator.com/#organization`, both booleans `true`.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/build-organization.mjs
git commit -m "feat(schema): add build-organization.mjs reading enriched organization.json"
```

---

### Task A5: Restructure `people.json` for schema-readiness

**Files:**
- Modify: `1-knowledge-and-evidence-core/people-and-crew/people.json`

**Interfaces:**
- Produces: `leadership[]` entries carrying `hasCredential`, `sameAs`, `image`, `knowsAbout`, `subjectOf` — consumed by a new `buildPersonNodes()` in Task A9. Also adds a `medicalPartner` doctor/clinic record that currently doesn't exist in ekosistem at all.

The current `leadership[0]` record (Agung Sambuko) has only prose fields (`background`, `evidence.policeVerification` as a string). This task ports the structured version from `jvto-web/src/lib/schemas/entityGraph.ts` (`FOUNDER_SCHEMA`, `DOCTOR_SCHEMA`) into the JSON source.

- [ ] **Step 1: Replace the `leadership[0]` object**

Current record has keys: `id, name, alternateNames, relationship, roles, background, memberOf, namingRule, evidence, countsAsCrew`. Add these new keys to the same object (keep all existing ones):

```json
      "jobTitle": ["Founder", "Active Tourist Police Officer"],
      "image": [
        { "url": "https://javavolcano-touroperator.com/founder/agung_sambuko.jpg", "caption": "Agung Sambuko, Founder of Java Volcano Tour Operator" },
        { "url": "https://javavolcano-touroperator.com/founder/mr-sam-tourist-police-portrait.png", "caption": "Agung Sambuko (Bripka) in official Tourist Police uniform, Bondowoso" }
      ],
      "sameAs": [
        "https://news.detik.com/berita-jawa-timur/d-5492690/suka-duka-polisi-pariwisata-bondowoso-tegakkan-prokes-sambil-lawan-dingin"
      ],
      "knowsAbout": [
        "East Java Volcano Tourism Safety",
        "Ijen Crater Operations and BBKSDA Regulations",
        "Mount Bromo Tourist Access Management",
        "Indonesian Tourist Police Protocols",
        "HPWKI Volcanic Safety Standards",
        "SE.1658/KSA.9/2024 — Ijen Health Certificate Regulation"
      ],
      "hasCredential": [
        {
          "name": "SPRIN POLPAR (Tourist Police Assignment Letter)",
          "credentialCategory": "Law Enforcement — Tourist Police Assignment",
          "sha256": "03c8578dc22956faa366d957badecfe38868d4760359cd8059fb2d6b145dfeab",
          "documentUrl": "https://javavolcano-touroperator.com/legal/SPRIN-POLPAR.pdf",
          "recognizedBy": "Indonesian National Police (POLRI)"
        },
        {
          "name": "SPRIN WAL-TRAVEL (Active Travel Order, February 2024)",
          "dateIssued": "2024-02-12",
          "credentialCategory": "Law Enforcement — Active Travel Authorization",
          "sha256": "179b061eae558943fdccc51d2ea3c8233a704b61f03ca3d212433f3e8d6f3bd3",
          "documentUrl": "https://javavolcano-touroperator.com/legal/SPRIN-WAL-TRAVEL-2024-02-12.webp",
          "recognizedBy": "Indonesian National Police (POLRI)"
        }
      ],
      "subjectOf": [
        {
          "type": "NewsArticle",
          "headline": "Suka Duka Polisi Pariwisata Bondowoso: Tegakkan Prokes Sambil Lawan Dingin",
          "datePublished": "2021-03-14",
          "url": "https://news.detik.com/berita-jawa-timur/d-5492690/suka-duka-polisi-pariwisata-bondowoso-tegakkan-prokes-sambil-lawan-dingin",
          "publisherName": "Detik.com"
        }
      ],
```

- [ ] **Step 2: Add a `medicalPartner` top-level array (new — doesn't exist yet)**

Check the current top-level keys first — the file has `medicalPartner` as a key already per the earlier key listing (`['_comment', 'lastReviewed', 'disclaimer', 'leadership', 'medicalPartner', 'crew', ...]`). Inspect what's currently in it:

```bash
node -e "console.log(JSON.stringify(require('./1-knowledge-and-evidence-core/people-and-crew/people.json').medicalPartner, null, 2))"
```

If it's empty or missing the structured fields below, replace its content with:

```json
  "medicalPartner": {
    "id": "dr-ahmad-irwandanu",
    "name": "Dr. Ahmad Irwandanu",
    "jobTitle": "Licensed General Practitioner",
    "clinic": {
      "name": "Klinik Bakti Husada",
      "medicalSpecialty": "General Practice",
      "addressLocality": "Bondowoso",
      "addressRegion": "Jawa Timur",
      "addressCountry": "ID",
      "description": "Ministry of Health-licensed clinic coordinating Ijen health screening for JVTO guests. Issues health certificates compliant with BBKSDA SE.1658/KSA.9/2024."
    },
    "hasCredential": [
      {
        "name": "SIP (Surat Izin Praktik) — Medical Practice Licence",
        "credentialCategory": "Indonesian Medical Practice Licence",
        "verifyUrl": "https://satusehat.kemkes.go.id/sdmk/nakes/QN00001073380217",
        "recognizedBy": "Kementerian Kesehatan Republik Indonesia (Ministry of Health)"
      },
      {
        "name": "KKI Registration (Konsil Kedokteran Indonesia)",
        "credentialCategory": "Indonesian Medical Council Registration",
        "verifyUrl": "https://kki.go.id/cekdokter/form",
        "recognizedBy": "Konsil Kedokteran Indonesia (Indonesian Medical Council)"
      }
    ]
  },
```

- [ ] **Step 3: Validate JSON syntax and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('1-knowledge-and-evidence-core/people-and-crew/people.json', 'utf8')); console.log('JSON OK')"
git add 1-knowledge-and-evidence-core/people-and-crew/people.json
git commit -m "feat(schema): restructure people.json leadership + medicalPartner for Person schema readiness"
```

---

### Task A6: `police-authority.json` (new source) + `build-police-authority.mjs`

**Files:**
- Create: `1-knowledge-and-evidence-core/credentials-and-public-evidence/police-authority.json`
- Create: `scripts/lib/build-police-authority.mjs`

**Interfaces:**
- Produces: `buildPoliceAuthorityNode(): SchemaNode` with `@id: "https://javavolcano-touroperator.com/#police-authority"`, `@type: "GovernmentService"`. Consumed by Task A7.

`police-safety.json` (existing) is markdown/prose for the page body — not usable as schema input. This creates a *separate*, minimal structured file specifically for the schema node, without touching the existing prose file.

- [ ] **Step 1: Create the structured source**

```json
{
  "_comment": "Structured source for the GovernmentService schema node — NOT the page content (see verify-jvto-pages/police-safety.json for that). Values verified against SPRIN POLPAR / SPRIN WAL-TRAVEL documents, same SHA-256 anchors as people.json leadership[0].hasCredential.",
  "name": "Tourist Police Authority — Ditpamobvit Assignment",
  "description": "JVTO's founder holds an active Tourist Police (Ditpamobvit) commission from the Indonesian National Police, evidenced by SPRIN POLPAR and SPRIN WAL-TRAVEL assignment orders.",
  "provider": {
    "name": "Direktorat Pengamanan Objek Vital (Ditpamobvit) — Indonesian National Police",
    "url": "https://polri.go.id"
  },
  "areaServed": "East Java, Indonesia",
  "lastReviewed": "2026-08-07",
  "owner": "public-evidence",
  "reviewStatus": "domain-owner-assigned-by-audit"
}
```

- [ ] **Step 2: Implement the builder**

```javascript
// scripts/lib/build-police-authority.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ORG_ID } from "./build-organization.mjs";

const SOURCE_PATH = "1-knowledge-and-evidence-core/credentials-and-public-evidence/police-authority.json";
export const POLICE_AUTHORITY_ID = "https://javavolcano-touroperator.com/#police-authority";

export async function buildPoliceAuthorityNode(root) {
  const raw = await readFile(path.join(root, SOURCE_PATH), "utf8");
  const data = JSON.parse(raw);

  return {
    "@id": POLICE_AUTHORITY_ID,
    "@type": "GovernmentService",
    name: data.name,
    description: data.description,
    provider: {
      "@type": "GovernmentOrganization",
      name: data.provider.name,
      ...(data.provider.url ? { url: data.provider.url } : {}),
    },
    ...(data.areaServed ? { areaServed: { "@type": "Place", name: data.areaServed } } : {}),
  };
}

// Reference to attach on the Organization node — schema.org has no dedicated
// "government affiliation" property, so this uses `subjectOf` (the same
// property Organization already uses for press/book citations in Task A2)
// to link Organization -> GovernmentService by @id. Documented assumption —
// flag in PR report for owner confirmation, per the handoff's "take the
// most conservative assumption, document it" rule.
export function policeAuthorityReference() {
  return { "@id": POLICE_AUTHORITY_ID };
}
```

- [ ] **Step 3: Validate + smoke test**

```bash
node -e "JSON.parse(require('fs').readFileSync('1-knowledge-and-evidence-core/credentials-and-public-evidence/police-authority.json', 'utf8')); console.log('JSON OK')"
node -e "
import('./scripts/lib/build-police-authority.mjs').then(async (m) => {
  const node = await m.buildPoliceAuthorityNode(process.cwd());
  console.log(node['@id'], node['@type']);
});
"
```

Expected: `JSON OK` then `https://javavolcano-touroperator.com/#police-authority GovernmentService`

- [ ] **Step 4: Commit**

```bash
git add 1-knowledge-and-evidence-core/credentials-and-public-evidence/police-authority.json scripts/lib/build-police-authority.mjs
git commit -m "feat(schema): add structured police-authority source + GovernmentService builder"
```

---

### Task A7: Refactor `buildSchemaOutput()` to emit `@graph`

**Files:**
- Modify: `scripts/render-web-content-sources.mjs`

**Interfaces:**
- Consumes: `composeGraph` (Task A3), `buildOrganizationNode` (Task A4), `normalizeFaqForOutput` (existing, line 38), `isRatingValid` (Task A1).
- Produces: `buildSchemaOutput(source)` now returns `json_ld: { "@context", "@graph": [...] }` instead of a flat single node.

- [ ] **Step 1: Add imports at the top of `scripts/render-web-content-sources.mjs`**

```javascript
import { composeGraph } from "./lib/schema-contract.mjs";
import { buildOrganizationNode, ORG_ID } from "./lib/build-organization.mjs";
```

- [ ] **Step 2: Replace `buildSchemaOutput` (currently lines 77–95)**

```javascript
async function buildSchemaOutput(source) {
  const schemaTypes = source.meta?.schemaTypes?.length ? source.meta.schemaTypes : ["WebPage"];
  const pageUrl = `https://javavolcano-touroperator.com${source.route}`;
  const nodes = [];

  const orgNode = await buildOrganizationNode(ROOT);
  nodes.push(orgNode);

  const webPageNode = {
    "@id": `${pageUrl}#webpage`,
    "@type": schemaTypes,
    name: source.meta?.title || "",
    description: source.meta?.description || "",
    url: pageUrl,
    isPartOf: { "@id": ORG_ID },
  };
  nodes.push(webPageNode);

  const faq = normalizeFaqForOutput(source.faq);
  if (faq) {
    nodes.push({
      "@id": `${pageUrl}#faq`,
      "@type": "FAQPage",
      mainEntity: faq.payload.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  const graph = composeGraph(nodes);

  return {
    schema_version: "jvto/output/json-ld-page/v1",
    output_type: "json_ld_page",
    generated_at: GENERATED_AT,
    route: source.route,
    domain: source.domain,
    slug: source.slug,
    json_ld: graph,
    source_trace: source.source_trace,
  };
}
```

- [ ] **Step 3: Update the caller to `await buildSchemaOutput(...)`**

`buildSchemaOutput` is now async — find its call site (search `buildSchemaOutput(` in the file) and add `await`.

```bash
grep -n "buildSchemaOutput(" scripts/render-web-content-sources.mjs
```

Add `await` at that call site if not already present.

- [ ] **Step 4: Run the renderer and inspect one output file**

```bash
npm run render:web-content
node -e "
const out = JSON.parse(require('fs').readFileSync('5-experience-engine/json-ld/pages/travel-guide__ijen-health-screening.json', 'utf8'));
console.log('@graph length:', out.json_ld['@graph'].length);
console.log('types:', out.json_ld['@graph'].map(n => n['@type']));
"
```

(Adjust the filename if the actual output filename differs — check `ls 5-experience-engine/json-ld/pages/ | grep ijen-health`.)

Expected: `@graph length: 3` (Organization, WebPage, FAQPage) for a page with FAQ content, `2` for a page without.

- [ ] **Step 5: Re-count `@type` unique values across all output (compare to baseline)**

```bash
grep -h '"@type"' -A1 5-experience-engine/json-ld/pages/*.json | grep -oE '"(Organization|TravelAgency|LocalBusiness|WebPage|ProfilePage|CollectionPage|FAQPage)"' | sort | uniq -c
```

Expected: `Organization`/`TravelAgency`/`LocalBusiness` count = 34 (one per route, referencing the same `@id`), `FAQPage` count = number of routes with non-empty FAQ, `WebPage`/`ProfilePage`/`CollectionPage` totals should still sum to 34.

- [ ] **Step 6: Commit**

```bash
git add scripts/render-web-content-sources.mjs 5-experience-engine/json-ld/pages/
git commit -m "feat(schema): refactor buildSchemaOutput to emit @graph via composeGraph"
```

---

### Task A8: `validate-schema.mjs`

**Files:**
- Create: `scripts/validate-schema.mjs`
- Test: `scripts/test/validate-schema.test.mjs`

**Interfaces:**
- Produces: CLI script, exit code 1 on any violation, prints `route + violation type + count`. Checks (from handoff §5): (1) node without `@id`, (2) >1 singleton per route, (3) `aggregateRating` with `reviewCount < 1` or `ratingValue <= 0`, (4) `@id` reference pointing to unknown node, (5) `TouristTrip` sourced from `confidence: "inferred"`, (6) `route-output-index.json` out of sync with `json-ld/pages/`.

- [ ] **Step 1: Write the test file**

```javascript
// scripts/test/validate-schema.test.mjs
import assert from "node:assert/strict";
import { checkNoMissingIds, checkNoZeroRatings, checkDanglingReferences } from "../validate-schema.mjs";

// Test 1: missing @id detected
{
  const graph = { "@graph": [{ "@type": "Organization" }] };
  const violations = checkNoMissingIds(graph, "route-a");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /route-a/);
}

// Test 2: zero-value aggregateRating detected
{
  const graph = { "@graph": [{ "@id": "x", "@type": "Organization", aggregateRating: { reviewCount: 0, ratingValue: 0 } }] };
  const violations = checkNoZeroRatings(graph, "route-b");
  assert.equal(violations.length, 1);
}

// Test 3: valid rating passes
{
  const graph = { "@graph": [{ "@id": "x", "@type": "Organization", aggregateRating: { reviewCount: 5, ratingValue: 4.5 } }] };
  const violations = checkNoZeroRatings(graph, "route-c");
  assert.equal(violations.length, 0);
}

// Test 4: internal JVTO dangling @id reference detected
{
  const graph = {
    "@graph": [
      {
        "@id": "https://javavolcano-touroperator.com/travel-guide#webpage",
        "@type": "WebPage",
        isPartOf: { "@id": "https://javavolcano-touroperator.com/#missing" },
      },
    ],
  };
  const violations = checkDanglingReferences(graph, "route-d");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /#missing/);
}

// Test 5: external @id reference is allowed
{
  const graph = {
    "@graph": [
      {
        "@id": "https://javavolcano-touroperator.com/#organization",
        "@type": "Organization",
        sameAs: [{ "@id": "https://www.trustpilot.com/review/javavolcano-touroperator.com" }],
      },
    ],
  };
  const violations = checkDanglingReferences(graph, "route-external");
  assert.equal(violations.length, 0);
}

// Test 6: valid internal reference passes
{
  const graph = {
    "@graph": [
      { "@id": "https://javavolcano-touroperator.com/#organization", "@type": "Organization" },
      {
        "@id": "https://javavolcano-touroperator.com/travel-guide#webpage",
        "@type": "WebPage",
        isPartOf: { "@id": "https://javavolcano-touroperator.com/#organization" },
      },
    ],
  };
  const violations = checkDanglingReferences(graph, "route-e");
  assert.equal(violations.length, 0);
}

console.log("validate-schema.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run to confirm it fails**

```bash
node scripts/test/validate-schema.test.mjs
```

Expected: import error, `validate-schema.mjs` doesn't export those functions yet.

- [ ] **Step 3: Implement `scripts/validate-schema.mjs`**

```javascript
#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const PAGES_DIR = "5-experience-engine/json-ld/pages";
const ROUTE_INDEX_PATH = "5-experience-engine/manifests/route-output-index.json";
const INTERNAL_ID_PREFIX = "https://javavolcano-touroperator.com/";

function typesOf(node) {
  const t = node["@type"];
  return Array.isArray(t) ? t : [t];
}

const ORGANIZATION_CLASS = new Set(["Organization", "TravelAgency", "LocalBusiness"]);
function singletonClassOf(node) {
  const types = typesOf(node);
  if (types.some((t) => ORGANIZATION_CLASS.has(t))) return "Organization";
  if (types.includes("FAQPage")) return "FAQPage";
  if (types.some((t) => typeof t === "string" && t.endsWith("Page") && t !== "FAQPage")) return "WebPage-class";
  return null;
}

export function checkNoMissingIds(graph, route) {
  return (graph["@graph"] ?? [])
    .filter((node) => !node["@id"])
    .map(() => `${route}: node missing @id`);
}

export function checkNoDuplicateSingletons(graph, route) {
  const seen = new Map();
  const violations = [];
  for (const node of graph["@graph"] ?? []) {
    const cls = singletonClassOf(node);
    if (!cls) continue;
    if (seen.has(cls) && seen.get(cls) !== node["@id"]) {
      violations.push(`${route}: more than one ${cls} node`);
    }
    seen.set(cls, node["@id"]);
  }
  return violations;
}

export function checkNoZeroRatings(graph, route) {
  const violations = [];
  for (const node of graph["@graph"] ?? []) {
    const r = node.aggregateRating;
    if (r && (Number(r.reviewCount) < 1 || Number(r.ratingValue) <= 0)) {
      violations.push(`${route}: aggregateRating with reviewCount=${r.reviewCount} ratingValue=${r.ratingValue}`);
    }
  }
  return violations;
}

export function checkDanglingReferences(graph, route) {
  const nodes = graph["@graph"] ?? [];
  const knownIds = new Set(nodes.map((n) => n["@id"]));
  const violations = [];

  function isInternalGraphReference(id) {
    return typeof id === "string" && id.startsWith(INTERNAL_ID_PREFIX) && id.includes("#");
  }

  function walk(value) {
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === "object") {
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === "@id" && isInternalGraphReference(value["@id"]) && !knownIds.has(value["@id"])) {
        violations.push(`${route}: dangling @id reference ${value["@id"]}`);
      } else {
        Object.values(value).forEach(walk);
      }
    }
  }
  nodes.forEach(walk);
  return violations;
}

export function checkTouristTripConfidence(source, route) {
  const violations = [];
  const trip = (source?.json_ld?.["@graph"] ?? []).find((n) => typesOf(n).includes("TouristTrip"));
  if (!trip) return violations;
  const traces = Array.isArray(source.source_trace) ? source.source_trace : [source.source_trace].filter(Boolean);
  const hasUnverified = traces.some((t) => t?.confidence && t.confidence !== "verified");
  if (hasUnverified) {
    violations.push(`${route}: TouristTrip emitted from non-verified source_trace`);
  }
  return violations;
}

async function checkRouteIndexSync(pagesDir, routeIndexPath) {
  const violations = [];
  const files = (await readdir(path.join(ROOT, pagesDir))).filter((f) => f.endsWith(".json"));
  const index = JSON.parse(await readFile(path.join(ROOT, routeIndexPath), "utf8"));
  const fileSet = new Set(files);
  const indexedRoutes = index.routes ?? [];
  if (files.length !== indexedRoutes.length) {
    violations.push(
      `route-output-index.json out of sync: ${files.length} files on disk, ${indexedRoutes.length} routes indexed`
    );
  }
  for (const route of indexedRoutes) {
    const expectedFile = path.basename(route.schemaOutput ?? "");
    if (!expectedFile || !fileSet.has(expectedFile)) {
      violations.push(`route-output-index.json out of sync: missing schemaOutput file for ${route.route}`);
    }
  }
  return violations;
}

async function main() {
  const files = (await readdir(path.join(ROOT, PAGES_DIR))).filter((f) => f.endsWith(".json"));
  let allViolations = [];

  for (const file of files) {
    const raw = await readFile(path.join(ROOT, PAGES_DIR, file), "utf8");
    const source = JSON.parse(raw);
    const graph = source.json_ld;
    const route = source.route ?? file;

    allViolations.push(
      ...checkNoMissingIds(graph, route),
      ...checkNoDuplicateSingletons(graph, route),
      ...checkNoZeroRatings(graph, route),
      ...checkDanglingReferences(graph, route),
      ...checkTouristTripConfidence(source, route)
    );
  }

  allViolations.push(...(await checkRouteIndexSync(PAGES_DIR, ROUTE_INDEX_PATH)));

  if (allViolations.length > 0) {
    console.log(`FAILED: ${allViolations.length} violation(s)`);
    allViolations.forEach((v) => console.log(`  - ${v}`));
    process.exit(1);
  }

  console.log(`OK: ${files.length} routes validated, 0 violations`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
node scripts/test/validate-schema.test.mjs
```

Expected: `validate-schema.test.mjs: all assertions passed`

- [ ] **Step 5: Add `validate:schema` script to `package.json`**

```json
    "validate:schema": "node scripts/validate-schema.mjs",
```

- [ ] **Step 6: Run against real output**

```bash
npm run validate:schema
```

Expected at this point (before Task A9/A10 add Person/GovernmentService/TouristTrip): `OK` or a small number of violations — record the exact output in the PR report either way, a failing run here is informative, not blocking.

- [ ] **Step 7: Commit**

```bash
git add scripts/validate-schema.mjs scripts/test/validate-schema.test.mjs package.json
git commit -m "feat(schema): add validate-schema.mjs gate with 6 checks + tests"
```

---

### Task A9: Emit `Person` nodes (founder + crew)

**Files:**
- Modify: `scripts/render-web-content-sources.mjs` (`buildSchemaOutput`)
- Create: `scripts/lib/build-person.mjs`

**Interfaces:**
- Consumes: `1-knowledge-and-evidence-core/people-and-crew/people.json` (Task A5).
- Produces: `buildPersonNode(personRecord): SchemaNode` with `@id: "{pageUrl}#person"`. Merged into the 11 existing crew `ProfilePage` routes only (per handoff §4 Fase 2) — match by matching the source route to `why-jvto/our-team/{slug}`.

Important current data-shape correction: `people.json` does **not** expose `crew` as an array. It exposes `crew.roster[]` for published crew and `crew.unpublished[]` for non-public records. Person schema emission must read `people.crew.roster[]` only and must not emit records where `public === false` or `rendered === false`. Match route slugs against `record.id || record.slug || record.code`; do not assume every record has `id`.

- [ ] **Step 1: Implement `scripts/lib/build-person.mjs`**

```javascript
export function buildPersonNode(record, pageUrl) {
  if (!record) return null;

  const hasCredential = (record.hasCredential ?? []).map((cred) => ({
    "@type": "EducationalOccupationalCredential",
    name: cred.name,
    ...(cred.credentialCategory ? { credentialCategory: cred.credentialCategory } : {}),
    ...(cred.dateIssued ? { dateIssued: cred.dateIssued } : {}),
    ...(cred.documentUrl ? { url: cred.documentUrl } : {}),
    ...(cred.recognizedBy ? { recognizedBy: { "@type": "GovernmentOrganization", name: cred.recognizedBy } } : {}),
    ...(cred.sha256
      ? { identifier: { "@type": "PropertyValue", propertyID: "SHA-256", name: `${cred.name} document SHA-256`, value: cred.sha256 } }
      : {}),
  }));

  return {
    "@id": `${pageUrl}#person`,
    "@type": "Person",
    name: record.name,
    ...(record.alternateNames?.length ? { alternateName: record.alternateNames } : {}),
    ...(record.jobTitle ? { jobTitle: record.jobTitle } : {}),
    ...(record.image?.length ? { image: record.image.map((i) => ({ "@type": "ImageObject", url: i.url, caption: i.caption })) } : {}),
    ...(record.sameAs?.length ? { sameAs: record.sameAs } : {}),
    ...(record.knowsAbout?.length ? { knowsAbout: record.knowsAbout } : {}),
    ...(hasCredential.length ? { hasCredential } : {}),
    ...(record.subjectOf?.length
      ? {
          subjectOf: record.subjectOf.map((s) => ({
            "@type": s.type,
            ...(s.headline ? { headline: s.headline } : {}),
            ...(s.datePublished ? { datePublished: s.datePublished } : {}),
            ...(s.url ? { url: s.url } : {}),
            ...(s.publisherName ? { publisher: { "@type": "Organization", name: s.publisherName } } : {}),
          })),
        }
      : {}),
  };
}
```

- [ ] **Step 2: Wire into `buildSchemaOutput`**

In `scripts/render-web-content-sources.mjs`, add near the top:

```javascript
import { buildPersonNode } from "./lib/build-person.mjs";
import { readFile as readFileP } from "node:fs/promises";

let peopleCache = null;
async function loadPeople() {
  if (!peopleCache) {
    peopleCache = JSON.parse(await readFileP(path.join(ROOT, "1-knowledge-and-evidence-core/people-and-crew/people.json"), "utf8"));
  }
  return peopleCache;
}
```

Inside `buildSchemaOutput`, after the FAQ block, before `composeGraph(nodes)`:

```javascript
  const teamMatch = source.route.match(/^\/why-jvto\/our-team\/([^/]+)$/);
  if (teamMatch) {
    const people = await loadPeople();
    const leadership = Array.isArray(people.leadership) ? people.leadership : [];
    const crewRoster = Array.isArray(people.crew?.roster) ? people.crew.roster : [];
    const publicPeople = leadership.concat(crewRoster).filter((p) => p.public !== false && p.rendered !== false);
    const record = publicPeople.find((p) => {
      const candidateSlug = p.id || p.slug || p.code;
      return candidateSlug === teamMatch[1];
    });
    const personNode = buildPersonNode(record, pageUrl);
    if (personNode) nodes.push(personNode);
  }
```

- [ ] **Step 3: Re-render and check**

```bash
npm run render:web-content
grep -l '"@type": "Person"' 5-experience-engine/json-ld/pages/*.json | wc -l
```

Expected: matches the number of `leadership`/`crew` records whose `id` matches an existing `/why-jvto/our-team/{slug}` route (report the actual number — if it's 0 because no `id` matches a route slug, that's a real finding to report, not a bug to silently patch around).

If the count is lower than the number of published crew profile routes, inspect the route slug vs `id`/`slug`/`code` mismatch and report the exact missing routes in the PR body. Do not silently include `crew.unpublished[]`.

- [ ] **Step 4: Run validator**

```bash
npm run validate:schema
```

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/build-person.mjs scripts/render-web-content-sources.mjs 5-experience-engine/json-ld/pages/
git commit -m "feat(schema): emit Person nodes for crew ProfilePage routes"
```

---

### Task A10: `GovernmentService` node + authority links

**Files:**
- Modify: `scripts/render-web-content-sources.mjs`

**Interfaces:**
- Consumes: `buildPoliceAuthorityNode` (Task A6).
- Produces: `GovernmentService` node emitted on the `/verify-jvto/police-safety` route only, referenced from Organization via `subjectOf` (see Task A6 Step 2 comment for the reasoning + the flag to confirm with the owner).

- [ ] **Step 1: Wire into `buildSchemaOutput`**

```javascript
import { buildPoliceAuthorityNode, POLICE_AUTHORITY_ID, policeAuthorityReference } from "./lib/build-police-authority.mjs";
```

Inside `buildSchemaOutput`, after the Organization node is pushed:

```javascript
  if (source.route === "/verify-jvto/police-safety") {
    const policeNode = await buildPoliceAuthorityNode(ROOT);
    nodes.push(policeNode);
    orgNode.subjectOf = [...(orgNode.subjectOf ?? []), policeAuthorityReference()];
  }
```

- [ ] **Step 2: Re-render, check, validate**

```bash
npm run render:web-content
grep -l '"@type": "GovernmentService"' 5-experience-engine/json-ld/pages/*.json
npm run validate:schema
```

Expected: exactly one file matches (the police-safety route).

- [ ] **Step 3: Note the TouristTrip/TouristAttraction gate — do NOT implement full emission**

Per the original handoff §4 Fase 3 and the "Known conflicts" section above: `standard-package-route-map.json` has `source_trace[].confidence: "inferred"` (origin `llm_wiki`) for every package checked during review. The gate (`checkTouristTripConfidence` in Task A8) already exists to block emission. **Do not build the `TouristTrip`/`TouristAttraction` emission path in this task** — write the list of packages and their confidence values to the PR report instead:

```bash
node -e "
const packages = require('./2-product-and-commercial-core/routes-and-itineraries/standard-package-route-map.json');
packages.forEach(p => {
  const confidences = (Array.isArray(p.source_trace) ? p.source_trace : [p.source_trace]).map(t => t?.confidence);
  console.log(p.package_id, '->', confidences.join(','));
});
" > /tmp/touristtrip-confidence-report.txt
cat /tmp/touristtrip-confidence-report.txt
```

Include this file's content verbatim in the PR report under "Packages skipped — confidence not verified", along with the note that `jvto-web/src/data/trust-bundle/schema/tourist-trip.json` (synced from `llm-wiki`) may already cover this and should be checked before anyone promotes these packages to `verified`.

- [ ] **Step 4: Commit**

```bash
git add scripts/render-web-content-sources.mjs 5-experience-engine/json-ld/pages/
git commit -m "feat(schema): emit GovernmentService node for police-safety route, reference from Organization"
```

---

### Task A11: `render-llms-txt.mjs`

**Files:**
- Create: `scripts/render-llms-txt.mjs`

**Interfaces:**
- Consumes: `5-experience-engine/knowledge-feed/public-web-content.feed-output.json`.
- Produces: `public/llms.txt`.

Per the "Known conflicts" section: this file will not be reachable at the canonical `javavolcano-touroperator.com/llms.txt` URL until Part B (Task B4) switches jvto-web's existing `/llms.txt` route to read from here instead of the `llm-wiki`-synced trust bundle. Build it anyway — Part A's job is to make the ekosistem output correct and ready; whether it's the one AI crawlers actually see is a Part B decision.

- [ ] **Step 1: Implement**

```javascript
#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FEED_PATH = "5-experience-engine/knowledge-feed/public-web-content.feed-output.json";
const OUTPUT_PATH = "public/llms.txt";

const PRIORITY_ROUTES = [
  "/why-jvto",
  "/verify-jvto",
  "/travel-guide/ijen-health-screening",
  "/travel-guide/rijik-monthly-closure",
  "/travel-guide/booking-information",
  "/travel-guide/police-escort-for-groups",
  "/isic/student-package",
  "/policy",
];

function truncateWords(text, maxWords) {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(" ") + "…";
}

async function main() {
  const feed = JSON.parse(await readFile(path.join(ROOT, FEED_PATH), "utf8"));
  const records = feed.records ?? feed;

  const selected = PRIORITY_ROUTES
    .map((route) => records.find((r) => r.route === route || r.route.startsWith(route)))
    .filter(Boolean)
    .slice(0, 20);

  if (selected.length < PRIORITY_ROUTES.length) {
    const missing = PRIORITY_ROUTES.filter((route) => !records.some((r) => r.route === route || r.route.startsWith(route)));
    console.log(`WARNING: ${missing.length} priority route(s) not found in feed: ${missing.join(", ")}`);
  }

  const lines = [
    "# Java Volcano Tour Operator (JVTO)",
    "> Private volcano tours in East Java, Indonesia — Bromo, Ijen, Tumpak Sewu.",
    "",
  ];
  for (const r of selected) {
    lines.push(`- [${r.title}](https://javavolcano-touroperator.com${r.route}): ${truncateWords(r.summary, 20)}`);
  }

  await writeFile(path.join(ROOT, OUTPUT_PATH), lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${OUTPUT_PATH} with ${selected.length} links`);
}

main();
```

- [ ] **Step 2: Add script and run**

In `package.json`:

```json
    "render:llms": "node scripts/render-llms-txt.mjs",
```

```bash
npm run render:llms
cat public/llms.txt
wc -l < public/llms.txt
```

Expected: file exists, ≤20 link lines plus 3 header lines.

- [ ] **Step 3: Commit**

```bash
git add scripts/render-llms-txt.mjs public/llms.txt package.json
git commit -m "feat(llms): add render-llms-txt.mjs, generate public/llms.txt"
```

---

### Task A12: `answerFirst` on the 3 confirmed priority pages

**Files:**
- Modify: `1-knowledge-and-evidence-core/travel-guide/rijik-monthly-closure.source.json`
- Modify: `1-knowledge-and-evidence-core/travel-guide/ijen-health-screening.source.json`
- Modify: `1-knowledge-and-evidence-core/travel-guide/police-escort-for-groups.source.json`

**Interfaces:**
- Produces: `meta.answerFirst: string` (40–60 words) on each of the 3 files, and the generated public website output must expose it as `page.answerFirst`.

Per the review discussion: the 4th topic in the handoff's priority list ("Ijen crater") has no file in `travel-guide/`/`why-jvto/`/`policies/` — it lives in `destination-knowledge/ijen-crater.json`, a folder `render-web-content-sources.mjs` never reads and `jvto-web` never fetches. **Do not add `answerFirst` or quantitative fields there in this task** — it would be writing into a pipeline that doesn't exist. Record this explicitly in the PR report as deferred, not silently dropped.

- [ ] **Step 1: Add `answerFirst` to `rijik-monthly-closure.source.json`**

Read the file first to write a fact-dense 40–60 word summary consistent with its existing `description`/`summary`/`content`, then add to `meta`:

```bash
node -e "console.log(JSON.stringify(require('./1-knowledge-and-evidence-core/travel-guide/rijik-monthly-closure.source.json').meta, null, 2))"
```

Add `"answerFirst"` key to the `meta` object (exact wording depends on the file's existing content — write it by hand after reading the full file, do not paraphrase from the summary alone; aim for 40–60 words, lead with the single most fact-dense sentence).

- [ ] **Step 2: Repeat for `ijen-health-screening.source.json`**

Same process — the file's existing `summary` field ("The mandatory Ijen health screening: real checks at your hotel, a BSrE-signed digital certificate, checked at the crater access gate.") is a good starting point but `answerFirst` should be longer (40-60 words vs the summary's ~20) and include the specific regulation citation (BBKSDA SE.1658/KSA.9/2024) already present in the file's FAQ answers.

- [ ] **Step 3: Repeat for `police-escort-for-groups.source.json`**

Same process.

- [ ] **Step 4: Validate JSON syntax on all 3**

```bash
for f in rijik-monthly-closure ijen-health-screening police-escort-for-groups; do
  node -e "JSON.parse(require('fs').readFileSync('1-knowledge-and-evidence-core/travel-guide/$f.source.json', 'utf8')); console.log('$f: JSON OK')"
done
```

- [ ] **Step 5: Make `answerFirst` survive the public website output pipeline**

In `scripts/render-web-content-sources.mjs`, update `buildWebsiteOutput(source)` so `answerFirst` is explicitly included in the `page` payload. This is mandatory; do not rely on arbitrary `meta` pass-through because `jvto-web` consumes the route-level website output, not the raw source file:

```javascript
    page: {
      title: source.meta?.title || "",
      summary: source.meta?.summary || "",
      answerFirst: source.meta?.answerFirst || "",
      owner: source.meta?.owner || "",
      lastReviewed: source.meta?.lastReviewed || "",
      content: source.content,
      faq: normalizeFaqForOutput(source.faq)
    },
```

- [ ] **Step 6: Re-render and confirm the field survives the pipeline**

```bash
npm run render:web-content
grep -l "answerFirst" 5-experience-engine/public-website/pages/*.json
```

Expected: exactly the 3 priority travel-guide output files match. Also inspect one output to confirm the field sits at `payload.page.answerFirst`, not only somewhere inside raw source metadata:

```bash
node -e "
const p = require('./5-experience-engine/public-website/pages/travel-guide__ijen-health-screening.website-output.json');
console.log(p.page.answerFirst);
"
```

- [ ] **Step 7: Commit**

```bash
git add 1-knowledge-and-evidence-core/travel-guide/rijik-monthly-closure.source.json \
        1-knowledge-and-evidence-core/travel-guide/ijen-health-screening.source.json \
        1-knowledge-and-evidence-core/travel-guide/police-escort-for-groups.source.json \
        5-experience-engine/public-website/pages/ \
        scripts/render-web-content-sources.mjs
git commit -m "feat(content): add answerFirst field to 3 priority travel-guide pages"
```

---

### Task A13: Expose generated JSON-LD page output through the ekosistem server

**Files:**
- Modify: `server.mjs`

**Interfaces:**
- Produces: `GET /api/schema/page?route=/travel-guide/ijen-health-screening`, returning the generated `5-experience-engine/json-ld/pages/{routeBase}.schema-output.json` payload.
- Consumed by: Part B (`jvto-web`) adapter `src/lib/ecosystemContent/schema.ts`.

This is required before Part B can be implemented cleanly. `jvto-web` should not fetch arbitrary filesystem paths or rely on the directory explorer `/api/file`; it needs a stable route-level API that mirrors the already deployed `/api/website/page` endpoint.

- [ ] **Step 1: Add `handleSchemaPage(req, res)` next to `handleWebsitePage(req, res)`**

Use the same `routeToOutputBase(route)` helper and the same error style as `handleWebsitePage`. The only difference is the output folder and filename suffix:

```javascript
async function handleSchemaPage(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.searchParams.get("route");
  if (!route || !route.startsWith("/")) {
    sendJson(res, 400, { error: "Missing or invalid route. Use /api/schema/page?route=/travel-guide" });
    return;
  }

  const outputPath = path.join(
    "5-experience-engine",
    "json-ld",
    "pages",
    `${routeToOutputBase(route)}.schema-output.json`
  );
  const { absolute, relative } = safeResolve(outputPath);

  try {
    const content = await readFile(absolute, "utf8");
    sendJson(res, 200, {
      route,
      outputPath: relative,
      payload: JSON.parse(content)
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(res, 404, { error: "Schema page output not found.", route });
      return;
    }
    throw error;
  }
}
```

- [ ] **Step 2: Register the endpoint in the server router**

Add this before `/health`:

```javascript
    if (url.pathname === "/api/schema/page") {
      await handleSchemaPage(req, res);
      return;
    }
```

- [ ] **Step 3: Smoke test locally**

Start the server if it is not already running:

```bash
npm run start
```

Then in a second shell:

```bash
curl -s "http://localhost:4178/api/schema/page?route=/travel-guide/ijen-health-screening" | node -e "
let body = '';
process.stdin.on('data', (chunk) => body += chunk);
process.stdin.on('end', () => {
  const parsed = JSON.parse(body);
  console.log(parsed.route);
  console.log(parsed.payload.json_ld['@graph'].length);
});
"
```

Expected: route prints `/travel-guide/ijen-health-screening`, and graph length is at least `2`.

- [ ] **Step 4: Commit**

```bash
git add server.mjs
git commit -m "feat(schema): expose generated JSON-LD page output through API"
```

---

### Task A14: Final validation + PR report

**Files:**
- None (verification + report task)

- [ ] **Step 1: Run every check**

```bash
npm run test:schema
npm run render:web-content
npm run validate:schema
npm run render:llms
node -e "fetch('http://localhost:4178/health').then(r => r.json()).then(console.log).catch(() => console.log('server not running; run Task A13 smoke test separately'))"
git diff --stat
git status
```

- [ ] **Step 2: Compile the `@type` before/after table**

```bash
echo "BEFORE (from baseline captured at plan time): WebPage 21, ProfilePage 11, CollectionPage 2"
echo "AFTER:"
grep -h '"@type"' -A1 5-experience-engine/json-ld/pages/*.json | grep -oE '"[A-Za-z]+"' | sort | uniq -c
```

- [ ] **Step 3: Write the PR body**

Include, verbatim:
- `@type` before → after table
- Route count with `FAQPage`
- `npm run validate:schema` output (exit code + violation list, even if it fails — report as-is)
- The "Known conflicts" section from the top of this plan (Trustpilot number mismatch, `TouristTrip`/`llm-wiki` collision) — do not resolve, just report
- List of packages skipped for `TouristTrip` (from Task A10 Step 3)
- Note that `destination-knowledge/` quantitative fields were deferred (Task A12) because the folder has no rendering pipeline
- Note that `/api/schema/page?route=...` was added for Part B consumption and include the Task A13 smoke-test result.
- Scope check: diff should touch only `scripts/`, `scripts/lib/`, `scripts/test/`, `server.mjs`, `package.json`, `public/llms.txt`, `1-knowledge-and-evidence-core/*.json`, and generated output under `5-experience-engine/`. Flag anything else.

- [ ] **Step 4: Open the PR (do not merge)**

```bash
gh pr create --base main --title "feat(schema): GEO engine — @id graph, Organization/FAQPage/Person/GovernmentService, llms.txt" --body-file /tmp/pr-body.md
```

---

# Part B — jvto-web (consumption switch)

**⚠️ Requires explicit separate owner approval before Step 1 of any task below runs.** This is a different repo (`../jvto-web`) with its own deploy pipeline (`javavolcano-touroperator.com` production traffic). Nothing in Part A depends on Part B being approved or executed — Part A is complete and mergeable on its own; Part B is what makes it *matter*.

This part is intentionally less granular than Part A: it was scoped from reading `jvto-web`'s source during review, not from working inside that repo's test setup (no test framework was confirmed there — check for one before writing test steps at execution time).

## File Structure (jvto-web)

| File | Status | Responsibility |
|---|---|---|
| `src/lib/publicContent/getPublicOrganizationProfile.ts` | modify | Switch from Prisma-only to ekosistem-first with DB/snapshot fallback |
| `src/lib/schemas/entityGraph.ts` | modify | `ORGANIZATION_SCHEMA`, `FOUNDER_SCHEMA`, `DOCTOR_SCHEMA`, `BBKSDA_REGULATION_SCHEMA` become generated from ekosistem output instead of hardcoded constants |
| `src/lib/llms-txt.ts` | modify | Source from ekosistem's `knowledge-feed` output instead of `trust-bundle` |
| `src/app/(website)/travel-guide/EcosystemTravelGuidePage.tsx` | modify | Render `answerFirst` field |
| `src/app/(website)/travel-guide/{rijik-monthly-closure,ijen-health-screening,police-escort-for-groups}/page.tsx` | modify | Pass `answerFirst` through to the shared component if not already generic |
| new: `src/lib/ecosystemContent/schema.ts` | create | Adapter that fetches `json-ld/pages/*` from `ekosistem.javavolcano-touroperator.com`, mirroring the existing `ecosystemContent/website.ts` pattern |

## Task B1: Implement the fetch mechanism

After Part A Task A13, ekosistem exposes generated page-level schema through `GET /api/schema/page?route=...`. Part B should consume that stable route-level endpoint. Do not fetch arbitrary repository files from `/api/file`; that endpoint is for the human directory viewer, not the website runtime.

- **Required fetch path:** `${DEFAULT_ECOSYSTEM_BASE_URL}/api/schema/page?route=${encodeURIComponent(route)}`
- **Fallback rule:** schema fetch failure must never break page rendering. Preserve the current hardcoded/Prisma/trust-bundle fallback path until the ekosistem fetch has proven stable in production.

- [ ] **Step 1: Confirm with the file's current fallback behavior**

Read `src/lib/ecosystemContent/website.ts` in full (only the top portion was read during this review) to confirm how it handles the ekosistem origin being unreachable, and replicate that exact fallback strategy for the new schema fetch path — a schema fetch failure must never break page rendering.

## Task B2: Switch Organization schema source

- [ ] **Step 1: Add `getOrganizationNodeFromEkosistem()` to the new adapter, matching the shape `build-organization.mjs` (Part A, Task A4) produces.**
- [ ] **Step 2: In `getPublicOrganizationProfile.ts`, try the ekosistem fetch first; fall back to the existing Prisma path on failure — do not remove the Prisma path, keep it as the safety net during rollout.**
- [ ] **Step 3: Manually diff the rendered `<script type="application/ld+json">` on the homepage before/after in a local dev run — confirm no required field regresses (cross-check against the gap list from the schema-comparison review: `sameAs`, `hasCredential`, `award`, `memberOf`, `subjectOf` must all still be present).**

## Task B3: Switch `FAQPage`, `Person`, `GovernmentService` sourcing

- [ ] **Step 1: `entityGraph.ts`'s `FOUNDER_SCHEMA`/`DOCTOR_SCHEMA`/`BBKSDA_REGULATION_SCHEMA` exports become thin wrappers that read the ekosistem-sourced data instead of returning hardcoded objects — keep the same export names and shapes so every existing import site (`buildCrewPersonSchema` callers, `PageJsonLdCombined`, etc.) needs zero changes.**
- [ ] **Step 2: `buildCrewPersonSchema()` — verify the `ktaId`/`ktaCardUrl`/`socialInstagram`/`socialFacebook`/`forensicEvidence` fields it expects are actually present in ekosistem's `people.json` `crew.roster[]` records (Task A5 only restructures `leadership[0]` and the medical partner; Task A9 reads `crew.roster[]` and excludes `crew.unpublished[]`).**

## Task B4: Switch `llms.txt` source

- [ ] **Step 1: Decide `llm-wiki`'s fate for this specific file.** `src/lib/llms-txt.ts` currently reads `trustClaims`/`trustAeoSnippets`/`organizationSchema` from `@/lib/trust-bundle` (synced from `llm-wiki`). Switching to ekosistem means either (a) `llm-wiki`'s `sync:trust` step stops feeding `llms.txt` specifically while continuing to feed `/trust` and `/verify-jvto` pages (which also import `trust-bundle`), or (b) ekosistem itself starts pulling from `llm-wiki` as an upstream source. **This is an owner decision, not an engineering default — do not pick silently.**
- [ ] **Step 2: Once decided, point `buildLlmsTxt()` at the ekosistem `knowledge-feed` fetch (same adapter as Task B1) instead of `trust-bundle`.**

## Task B5: Render `answerFirst` on travel-guide pages

- [ ] **Step 1: In `EcosystemTravelGuidePage.tsx`, locate where the route-level `page` payload is read and add `page.answerFirst` as a first-class field. Do not read it from `page.content.payload`; Task A12 explicitly emits it at `payload.page.answerFirst`.**
- [ ] **Step 2: Add a rendered block for it — placement (above the fold, near the title) matters for AEO purposes; check with design/content owner on exact placement rather than guessing.**
- [ ] **Step 3: Confirm the 3 specific route pages (`rijik-monthly-closure`, `ijen-health-screening`, `police-escort-for-groups`) render through `EcosystemTravelGuidePage.tsx` and not a different per-route component — this wasn't verified during review, only the file's existence was confirmed.**

## Task B6: Document `llm-wiki`'s ongoing role

- [ ] **Step 1: Write a short doc (in `jvto-web`, location per that repo's convention) stating explicitly which pages/features still depend on `llm-wiki` after B1–B5 land (`/trust`, `/verify-jvto`, `TrustFaqBlock`, `TrustClaimBlock`, `registry/pages.ts` were confirmed as consumers during review) and which no longer do. This prevents a future engineer from assuming `llm-wiki` was fully deprecated when only part of its output was replaced.**

---

## Self-Review

**Spec coverage:**
- Original handoff Fase 0 → Task A1 ✅
- Original handoff Fase 1 (contract + Organization + FAQPage) → Tasks A2–A4, A7 ✅
- Original handoff Fase 2 (Person + GovernmentService + authority links) → Tasks A5, A6, A9, A10 ✅ (expanded beyond the original handoff's scope to include the trust-data enrichment found during review — `sameAs`/`hasCredential`/`award`/`memberOf`/`subjectOf`/doctor+clinic)
- Original handoff Fase 3 (TouristTrip/TouristAttraction) → Task A10 Step 3 — explicitly NOT built, gate confirmed working, reported instead (per the handoff's own "report to owner" rule for `inferred` data)
- Original handoff §5 Validator → Task A8 ✅
- Original handoff Fase 4 (llms.txt) → Task A11 (ekosistem side) + Task B4 (jvto-web side, gated on owner approval)
- Original handoff Fase 5 (answer-first + fact density) → Task A12 (3 confirmed pages) + explicit deferral of destination quantitative fields (orphaned pipeline) + Task B5 (render side, gated)
- New: schema gap-fill discovered during review (organization enrichment, people.json restructure, GovernmentService structured source) → Tasks A2, A5, A6
- New: schema delivery endpoint for downstream web consumption → Task A13
- New: Part B integration (the actual point of doing any of this) → Tasks B1–B6, explicitly gated behind separate approval

**Placeholder scan:** no "TBD"/"handle appropriately" left in Part A tasks — every step has literal code, exact field values, or an exact command. Part B tasks B1, B4 contain explicit "open decision, resolve before coding" markers by design — these are genuine owner decisions found during review (fetch mechanism, `llm-wiki`'s fate), not placeholders for engineering work I could have specified but didn't.

**Type/name consistency:** `ORG_ID` exported from `build-organization.mjs` (Task A4) is imported by name in Tasks A7, A10, A6. `POLICE_AUTHORITY_ID` exported from `build-police-authority.mjs` (Task A6) used in Task A10. `composeGraph` (Task A3) signature `(nodes) => {"@context","@graph"}` matches its usage in Task A7. `buildPersonNode(record, pageUrl)` (Task A9) signature matches its call site.

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-13-geo-schema-engine-and-jvto-web-integration.md`.**
