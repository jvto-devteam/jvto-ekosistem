# Review Schema Rendering Consolidation (Bagian 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move schema.org `Review` JSON-LD rendering for both the `/why-jvto/reviews` hub page and the 217 (growing daily) individual `/why-jvto/reviews/{id}` detail pages from jvto-web's live assembly to jvto-ekosistem's pre-rendered `5-experience-engine/json-ld/pages/` output, with jvto-web reduced to a reader of that output.

**Architecture:** jvto-ekosistem gets a new generator (`scripts/generate-review-schema.mjs`, backed by pure functions in `scripts/lib/review-schema/build-review-nodes.mjs`) that reads the 217-record `reviews.json` and produces two distinct shapes: (1) a flat array of top-level `Review` nodes merged into the existing hub file `why-jvto__reviews.schema-output.json`, and (2) 217 separate `why-jvto__reviews__<id>.schema-output.json` files, each holding a `Product` node with a nested `Review` (mirroring the shape jvto-web currently builds inline). Both shapes reuse the shared `buildOrganizationNode()`/`ORG_ID` from `scripts/lib/build-organization.mjs` so `itemReviewed`/`brand`/`publisher` references always resolve within their own file (a hard requirement of `scripts/validate-schema.mjs`'s per-file checks). `route-output-index.json` is updated in the same run so `checkRouteIndexSync` stays green at 269 total pages (52 existing CMS pages + 1 hub, already counted, + 217 new detail pages). On jvto-web, the hub page needs almost no new code — `PageJsonLdCombined` already fetches and merges the ekosistem schema for a page's route, so once the hub file carries `Review` nodes they appear automatically; only the now-dead `buildIndividualReviewSchemas()` call is removed. The detail page (`[id]/page.tsx`, not statically generated) gets a new local-file-first + HTTP-fallback reader (`getEcosystemReviewSchema`, mirroring the 3-tier pattern in `ecosystemContent/website.ts`) that replaces its inline `Product`+`Review` builder, with an explicit `notFound()` fallback when the per-id file hasn't been generated yet (accepted risk, same class as booking-records).

**Tech Stack:** Node.js `node:assert/strict` for ekosistem unit tests (no framework, matching `scripts/lib/booking-sync/generators/*`), plain ESM `.mjs` generator scripts, Next.js App Router server components + TypeScript on jvto-web, GitHub Actions for the trigger workflow.

**Spec:** `/Users/macbook/Code/jvto-ekosistem/docs/superpowers/specs/2026-08-20-ekosistem-schema-rendering-consolidation-design.md` (Bagian 2 section; Error handling and Testing sections apply repo-wide)

## Global Constraints

- Error handling: if ekosistem is unreachable, the page renders WITHOUT the Review node (not a full failure) — this is the default policy for Bagian 1/2/3 broadly; the one documented exception is the per-review **detail** page's `notFound()` fallback described below, which the spec explicitly calls out as an accepted deviation, not a contradiction of this rule.
- The `id` field on each individual review must be preserved verbatim from `reviews.json` (never renumbered) — this is load-bearing since it's baked into the live `@id` and URL already.
- 217 output files is a big jump for this repo's generator conventions — the plan needs a task that verifies whatever route-count/index files exist stay in sync (do NOT let this trip route-index-sync validation).
- Testing: ekosistem generator needs a unit test (node:assert/strict). jvto-web side needs `npm run validate:jsonld-schema` + a live `curl` verification step against a sample of individual review pages (this session's established habit: verify live, don't trust build success alone).
- This is a cross-repo plan — tasks will be executed by dispatching implementer subagents to each repo; be explicit in each task about which repo's working directory it operates in.

---

## File Structure

**jvto-ekosistem** (working directory: `/Users/macbook/Code/jvto-ekosistem`):
- `scripts/lib/review-schema/build-review-nodes.mjs` — new. Pure functions: `buildHubReviewNodes(reviews)` → array of top-level `Review` nodes; `buildReviewDetailProductNode(review)` → one `Product`+nested-`Review` node. No I/O.
- `scripts/generate-review-schema.mjs` — new. Driver script (same style as `scripts/render-web-content-sources.mjs`): reads `reviews.json`, merges hub `Review` nodes into the existing hub file, writes 217 detail files, updates `route-output-index.json`.
- `scripts/test/review-schema/build-review-nodes.test.mjs` — new. Unit tests for the pure functions.
- `package.json` — modified. Chain `render:web-content` to also run the new generator; add `render:review-schema` and `test:review-schema` scripts.
- `.github/workflows/sync-google-reviews.yml` — modified. Add regenerate + validate + expanded commit steps.
- `.github/workflows/deploy-vps.yml` — modified. Fix the hardcoded "52 routes" check, which the new 217 files break.

**jvto-web** (working directory: `/Users/macbook/Code/jvto-web`):
- `src/lib/schemas/buildWhyJvtoSchemas.ts` — modified. Remove `buildIndividualReviewSchemas()` and its now-unused imports.
- `src/app/(website)/why-jvto/reviews/page.tsx` — modified. Stop calling the removed function; `PageJsonLdCombined` already merges in ekosistem's hub `Review` nodes for this route.
- `src/lib/ecosystemContent/schema.ts` — modified. Add `getEcosystemReviewSchema(id)`, a local-file-first + HTTP-fallback reader for the dynamic per-review file.
- `src/app/(website)/why-jvto/reviews/[id]/page.tsx` — modified. Replace the inline `Product`+`Review` builder with a call to `getEcosystemReviewSchema`, with `notFound()` when it's missing.

---

### Task 1: Ekosistem — pure Review node builder functions + unit tests

**Files:**
- Create: `/Users/macbook/Code/jvto-ekosistem/scripts/lib/review-schema/build-review-nodes.mjs`
- Test: `/Users/macbook/Code/jvto-ekosistem/scripts/test/review-schema/build-review-nodes.test.mjs`

**Interfaces:**
- Consumes: `ORG_ID` (string constant) exported from `/Users/macbook/Code/jvto-ekosistem/scripts/lib/build-organization.mjs`.
- Produces (consumed by Task 2's driver script):
  - `export const BASE_URL = "https://javavolcano-touroperator.com"`
  - `export const HUB_ROUTE = "/why-jvto/reviews"`
  - `export function buildHubReviewNodes(reviews, { baseUrl = BASE_URL } = {}) => object[]` — one flat top-level `Review` node per eligible record.
  - `export function buildReviewDetailProductNode(review, { baseUrl = BASE_URL } = {}) => object` — one `Product` node with a nested `Review`, for a single record.

- [ ] **Step 1: Write the failing test**

Create `/Users/macbook/Code/jvto-ekosistem/scripts/test/review-schema/build-review-nodes.test.mjs`:

```js
import assert from "node:assert/strict";
import {
  buildHubReviewNodes,
  buildReviewDetailProductNode,
  BASE_URL,
  HUB_ROUTE,
} from "../../lib/review-schema/build-review-nodes.mjs";
import { ORG_ID } from "../../lib/build-organization.mjs";

const googleReview = {
  id: 78,
  platform: "Google",
  customerName: "HuiYuan Yeoh",
  date: "2026-07-12",
  star: 5,
  review: "Booked the 4d3n tour to Tumpak Sewu, Mt Bromo and Kawah Ijen from the JVTO website.",
  photos: { source: "Google Business Profile reviewMediaItems", count: 7, items: [] },
  url: "https://business.google.com/n/11306571900359184784/reviews/Ci9DQUlR",
  urlReference: "accounts/113259255222289357013/locations/11306571900359184784/reviews/AbFvOqn",
  packageSlug: null,
  packageName: null,
  crewCodes: ["taufik", "fauzi"],
};

const trustpilotReview = {
  id: 65,
  platform: "Trustpilot",
  customerName: "Patarachai Sereerat",
  date: "2026-01-18",
  star: 5,
  review: "Amazing trip! Had an amazing trip visiting Bromo, Ijen Crater, and Tumpak Sewu Waterfall!",
  photos: null,
  url: "https://www.trustpilot.com/reviews/696ccc50a8dcb95a58473ac5",
  urlReference: "https://www.trustpilot.com/reviews/696ccc50a8dcb95a58473ac5",
  packageSlug: "tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-4d3n",
  packageName: "4 Day Ijen, Papuma Beach, Tumpak Sewu & Bromo Journey from Surabaya",
  crewCodes: ["yandi", "boy"],
};

const facebookReview = { ...trustpilotReview, id: 999, platform: "Facebook" };
const emptyTextReview = { ...trustpilotReview, id: 998, review: "" };
const noStarReview = { ...trustpilotReview, id: 997, star: null };

// --- buildHubReviewNodes: eligibility filter (mirrors jvto-web's now-removed
// getReviewsForSchema() + buildIndividualReviewSchemas() combined filter: star is a
// number >= 1, platform is one of the three tracked platforms, review text non-empty) ---
{
  const nodes = buildHubReviewNodes([
    googleReview,
    trustpilotReview,
    facebookReview,
    emptyTextReview,
    noStarReview,
  ]);
  assert.equal(nodes.length, 2, "only the Google and Trustpilot reviews are eligible for the hub array");

  const google = nodes.find((n) => n["@id"] === `${BASE_URL}/#review-78`);
  assert.ok(google, "Google review node must be present with the exact #review-{id} @id");
  assert.equal(google["@type"], "Review");
  assert.deepEqual(google.author, { "@type": "Person", name: "HuiYuan Yeoh" });
  assert.deepEqual(google.reviewRating, {
    "@type": "Rating",
    ratingValue: "5",
    bestRating: "5",
    worstRating: "1",
  });
  assert.equal(google.reviewBody, googleReview.review);
  assert.equal(google.datePublished, "2026-07-12");
  assert.equal(google.url, googleReview.url, "url must win over urlReference when both are present");
  assert.deepEqual(google.itemReviewed, { "@id": ORG_ID });
  assert.equal(google.publisher["@type"], "Organization");
  assert.equal(google.publisher.name, "Google");
  assert.equal(
    google.publisher["@id"],
    `${BASE_URL}${HUB_ROUTE}#platform-google`,
    "publisher must carry its own @id — an anonymous Organization node fails checkOrganizationIdentity",
  );

  const trustpilot = nodes.find((n) => n["@id"] === `${BASE_URL}/#review-65`);
  assert.ok(trustpilot);
  assert.equal(trustpilot.publisher["@id"], `${BASE_URL}${HUB_ROUTE}#platform-trustpilot`);
}

{
  // url falls back to urlReference when the primary url is absent.
  const noUrlReview = { ...trustpilotReview, id: 996, url: null };
  const nodes = buildHubReviewNodes([noUrlReview]);
  assert.equal(nodes[0].url, trustpilotReview.urlReference);
}

{
  // neither url nor urlReference present — the url key must be omitted, not null.
  const noUrlAtAll = { ...trustpilotReview, id: 995, url: null, urlReference: null };
  const nodes = buildHubReviewNodes([noUrlAtAll]);
  assert.equal("url" in nodes[0], false);
}

{
  // empty input must not throw — "data kosong" graceful case.
  assert.deepEqual(buildHubReviewNodes([]), []);
}

// --- buildReviewDetailProductNode: one node per record, unconditional (every id in
// reviews.json must get a detail file, regardless of the hub's stricter eligibility
// filter — the [id] page reads by id directly, not through the hub's filtered list) ---
{
  const product = buildReviewDetailProductNode(googleReview);
  assert.equal(product["@id"], `${BASE_URL}${HUB_ROUTE}/78#product`);
  assert.equal(product["@type"], "Product");
  assert.equal(product.name, "Java Volcano Tour Package", "packageName null must fall back to the generic name");
  assert.deepEqual(product.brand, { "@id": ORG_ID });
  assert.equal(product.url, `${BASE_URL}/tours`, "packageSlug null must fall back to the tours hub URL");

  const review = product.review;
  assert.equal(review["@type"], "Review");
  assert.equal(review["@id"], `${BASE_URL}/#review-78`);
  assert.deepEqual(review.reviewRating, { "@type": "Rating", ratingValue: 5, bestRating: 5, worstRating: 1 });
  assert.deepEqual(review.author, { "@type": "Person", name: "HuiYuan Yeoh" });
  assert.equal(review.reviewBody, googleReview.review);
  assert.equal(review.datePublished, new Date(googleReview.date).toISOString());
  assert.deepEqual(review.itemReviewed, { "@id": ORG_ID });
  assert.deepEqual(review.publisher, { "@id": ORG_ID });
}

{
  const product = buildReviewDetailProductNode(trustpilotReview);
  assert.equal(product.name, trustpilotReview.packageName);
  assert.equal(
    product.url,
    `${BASE_URL}/${trustpilotReview.packageSlug}`,
    "a packageSlug already prefixed with tours/ must not be double-prefixed",
  );
}

{
  // star missing/null must not crash and must fall back to 5, matching the previous
  // inline builder's `review.star ?? 5`.
  const product = buildReviewDetailProductNode({ ...trustpilotReview, star: null });
  assert.equal(product.review.reviewRating.ratingValue, 5);
}

console.log("build-review-nodes.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/macbook/Code/jvto-ekosistem && node scripts/test/review-schema/build-review-nodes.test.mjs`
Expected: FAIL — `Cannot find module '../../lib/review-schema/build-review-nodes.mjs'`

- [ ] **Step 3: Write the implementation**

Create `/Users/macbook/Code/jvto-ekosistem/scripts/lib/review-schema/build-review-nodes.mjs`:

```js
import { ORG_ID } from "../build-organization.mjs";

export const BASE_URL = "https://javavolcano-touroperator.com";
export const HUB_ROUTE = "/why-jvto/reviews";

const ALLOWED_PLATFORMS = new Set(["Trustpilot", "TripAdvisor", "Google"]);

function isHubEligible(review) {
  return (
    typeof review.star === "number" &&
    review.star >= 1 &&
    ALLOWED_PLATFORMS.has(review.platform) &&
    typeof review.review === "string" &&
    review.review !== ""
  );
}

function platformSlug(platform) {
  return String(platform).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * One nested Organization-class node per Review, scoped to the hub page's own URL
 * (`#platform-<slug>`) rather than resolved through the external-entities registry
 * (1-knowledge-and-evidence-core/organization-identity/external-entities.json) —
 * that registry is for third-party organisations with owner-verified `sameAs` URLs
 * ("Never add a sameAs URL without verifying it"), and Google/Trustpilot/TripAdvisor
 * as review PLATFORMS are out of this task's scope. A full inline node (not a bare
 * {"@id"} reference) is required either way: checkDanglingReferences in
 * scripts/validate-schema.mjs only exempts bare references that resolve to a
 * top-level node in the same file OR the external-entities registry, and
 * checkOrganizationIdentity requires every Organization-class node to carry an @id.
 * Duplicated per review on purpose — cheap, always self-consistent, no cross-review
 * dedup bookkeeping needed.
 */
function platformPublisherNode(platform, pageUrl) {
  return {
    "@id": `${pageUrl}#platform-${platformSlug(platform)}`,
    "@type": "Organization",
    name: platform,
  };
}

/**
 * Flat top-level `Review` nodes for the hub page
 * (why-jvto__reviews.schema-output.json), one per eligible review record — mirrors
 * jvto-web's now-removed buildIndividualReviewSchemas()
 * (src/lib/schemas/buildWhyJvtoSchemas.ts) in shape, including the same eligibility
 * filter jvto-web's getReviewsForSchema() used to apply upstream (star is a number
 * >= 1, platform is one of the three tracked platforms, review text is non-empty).
 */
export function buildHubReviewNodes(reviews, { baseUrl = BASE_URL } = {}) {
  const pageUrl = `${baseUrl}${HUB_ROUTE}`;
  return reviews.filter(isHubEligible).map((review) => ({
    "@id": `${baseUrl}/#review-${review.id}`,
    "@type": "Review",
    author: { "@type": "Person", name: review.customerName },
    reviewRating: {
      "@type": "Rating",
      ratingValue: String(review.star),
      bestRating: "5",
      worstRating: "1",
    },
    reviewBody: review.review,
    datePublished: review.date,
    ...(review.url || review.urlReference ? { url: review.url || review.urlReference } : {}),
    itemReviewed: { "@id": ORG_ID },
    publisher: platformPublisherNode(review.platform, pageUrl),
  }));
}

function packageUrlFor(slug, { baseUrl = BASE_URL } = {}) {
  if (!slug) return `${baseUrl}/tours`;
  return slug.startsWith("tours/") ? `${baseUrl}/${slug}` : `${baseUrl}/tours/${slug}`;
}

/**
 * `Product` node with a nested `Review` for one individual review detail page
 * (why-jvto__reviews__<id>.schema-output.json, route /why-jvto/reviews/<id>) —
 * mirrors the shape jvto-web's why-jvto/reviews/[id]/page.tsx built inline before
 * this migration, plus two additions the design spec calls for explicitly: an @id
 * on the nested Review (`#review-<id>`) and an itemReviewed pointing at ORG_ID
 * (safe here because the caller always puts the full Organization node in the same
 * file's @graph — see generate-review-schema.mjs).
 *
 * `review.id` is preserved verbatim from reviews.json (see that file's `_comment`)
 * — never renumber it, it is baked into the live #review-{id} @id and the
 * /why-jvto/reviews/{id} URL already. Called unconditionally for every record in
 * reviews.json — unlike the hub, this is not filtered by platform/star/review-text
 * eligibility, because the [id] page looks reviews up by id directly.
 */
export function buildReviewDetailProductNode(review, { baseUrl = BASE_URL } = {}) {
  const packageName = review.packageName ?? "Java Volcano Tour Package";
  return {
    "@id": `${baseUrl}${HUB_ROUTE}/${review.id}#product`,
    "@type": "Product",
    name: packageName,
    brand: { "@id": ORG_ID },
    url: packageUrlFor(review.packageSlug, { baseUrl }),
    review: {
      "@type": "Review",
      "@id": `${baseUrl}/#review-${review.id}`,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.star ?? 5,
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: review.customerName },
      reviewBody: review.review,
      datePublished: new Date(review.date).toISOString(),
      itemReviewed: { "@id": ORG_ID },
      publisher: { "@id": ORG_ID },
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/macbook/Code/jvto-ekosistem && node scripts/test/review-schema/build-review-nodes.test.mjs`
Expected: `build-review-nodes.test.mjs: all assertions passed`

- [ ] **Step 5: Register the test script and commit**

Edit `/Users/macbook/Code/jvto-ekosistem/package.json` — add to `"scripts"` (alongside the existing `"test:booking-sync"` / `"test:schema"` entries):

```json
    "test:review-schema": "node scripts/test/review-schema/build-review-nodes.test.mjs",
```

```bash
cd /Users/macbook/Code/jvto-ekosistem
git add scripts/lib/review-schema/build-review-nodes.mjs scripts/test/review-schema/build-review-nodes.test.mjs package.json
git commit -m "feat(review-schema): add pure Review/Product node builders + unit tests"
```

---

### Task 2: Ekosistem — generator driver script + route-index sync

**Files:**
- Create: `/Users/macbook/Code/jvto-ekosistem/scripts/generate-review-schema.mjs`
- Modify: `/Users/macbook/Code/jvto-ekosistem/package.json`

**Interfaces:**
- Consumes: `BASE_URL`, `HUB_ROUTE`, `buildHubReviewNodes`, `buildReviewDetailProductNode` from Task 1's `scripts/lib/review-schema/build-review-nodes.mjs`; `buildOrganizationNode(root, route)` from `scripts/lib/build-organization.mjs`; `composeGraph(nodes)` from `scripts/lib/schema-contract.mjs`.
- Produces: on disk, `5-experience-engine/json-ld/pages/why-jvto__reviews.schema-output.json` (updated), `5-experience-engine/json-ld/pages/why-jvto__reviews__<id>.schema-output.json` (217 new files), `5-experience-engine/manifests/route-output-index.json` (updated with 217 new route entries). npm script `render:review-schema` runnable standalone; `render:web-content` now runs this generator automatically after `render-web-content-sources.mjs`.

- [ ] **Step 1: Write the driver script**

Create `/Users/macbook/Code/jvto-ekosistem/scripts/generate-review-schema.mjs`:

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOrganizationNode } from "./lib/build-organization.mjs";
import { composeGraph } from "./lib/schema-contract.mjs";
import {
  BASE_URL,
  HUB_ROUTE,
  buildHubReviewNodes,
  buildReviewDetailProductNode,
} from "./lib/review-schema/build-review-nodes.mjs";

const ROOT = process.cwd();
const GENERATED_AT = new Date().toISOString();
const REVIEWS_SOURCE_PATH =
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json";
const PAGES_DIR = "5-experience-engine/json-ld/pages";
const ROUTE_INDEX_PATH = "5-experience-engine/manifests/route-output-index.json";
const HUB_OUTPUT_PATH = `${PAGES_DIR}/why-jvto__reviews.schema-output.json`;
// Matches routes this generator itself writes — used to make route-output-index.json
// updates idempotent across repeated runs without an intervening render:web-content
// (which is what actually rebuilds the hub's non-Review nodes from CMS source).
const REVIEW_ROUTE_RE = /^\/why-jvto\/reviews\/\d+$/;

function detailOutputPath(id) {
  return `${PAGES_DIR}/why-jvto__reviews__${id}.schema-output.json`;
}

function detailRoute(id) {
  return `${HUB_ROUTE}/${id}`;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function writeJson(relativePath, value) {
  await writeFile(path.join(ROOT, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Merges the freshly-built Review array into the hub file render-web-content-sources.mjs
 * already wrote this run (Organization + WebPage + FAQPage nodes, no reviews — reviews.json
 * isn't one of that script's SOURCE_DIRS). Filters out any Review nodes already present
 * before re-adding, so re-running this script alone (without a preceding
 * render-web-content-sources.mjs run) is idempotent and self-correcting rather than
 * accumulating or freezing stale review content.
 */
async function updateHub(reviews) {
  const hub = await readJson(HUB_OUTPUT_PATH);
  const baseNodes = (hub.json_ld?.["@graph"] ?? []).filter((node) => node["@type"] !== "Review");
  const reviewNodes = buildHubReviewNodes(reviews, { baseUrl: BASE_URL });
  hub.json_ld = composeGraph([...baseNodes, ...reviewNodes]);
  hub.generated_at = GENERATED_AT;

  const existingSourceFiles = hub.source_trace?.source_files ?? [];
  hub.source_trace = {
    ...hub.source_trace,
    source_files: existingSourceFiles.includes(REVIEWS_SOURCE_PATH)
      ? existingSourceFiles
      : [...existingSourceFiles, REVIEWS_SOURCE_PATH],
  };

  await writeJson(HUB_OUTPUT_PATH, hub);
  return reviewNodes.length;
}

/**
 * One standalone schema-output.json per review, each carrying the FULL Organization
 * node (not a bare reference) so the Product node's `brand`/`publisher` and the
 * nested Review's `itemReviewed`/`publisher` bare {"@id": ORG_ID} references all
 * resolve within this single file — required by checkDanglingReferences in
 * scripts/validate-schema.mjs, which only inspects one file's own @graph at a time.
 */
async function writeDetailFile(review) {
  const route = detailRoute(review.id);
  const orgNode = await buildOrganizationNode(ROOT, route);
  const productNode = buildReviewDetailProductNode(review, { baseUrl: BASE_URL });
  const output = {
    schema_version: "jvto/output/json-ld-page/v1",
    output_type: "json_ld_page",
    generated_at: GENERATED_AT,
    route,
    domain: "why-jvto",
    slug: `reviews/${review.id}`,
    json_ld: composeGraph([orgNode, productNode]),
    source_trace: {
      generated_at: GENERATED_AT,
      source_files: [REVIEWS_SOURCE_PATH],
      migration_note: `Generated by scripts/generate-review-schema.mjs from reviews.json record id=${review.id} (Bagian 2 of the schema rendering consolidation).`,
    },
  };
  const outputPath = detailOutputPath(review.id);
  await writeJson(outputPath, output);
  return { route, domain: "why-jvto", slug: `reviews/${review.id}`, schemaOutput: outputPath };
}

async function updateRouteIndex(reviewEntries) {
  const index = await readJson(ROUTE_INDEX_PATH);
  const nonReviewRoutes = (index.routes ?? []).filter((r) => !REVIEW_ROUTE_RE.test(r.route));
  const routes = [...nonReviewRoutes, ...reviewEntries].sort((a, b) => a.route.localeCompare(b.route));
  await writeJson(ROUTE_INDEX_PATH, { generated_at: GENERATED_AT, routes });
}

async function main() {
  await mkdir(path.join(ROOT, PAGES_DIR), { recursive: true });

  const reviewsFile = await readJson(REVIEWS_SOURCE_PATH);
  const reviews = Array.isArray(reviewsFile.reviews) ? reviewsFile.reviews : [];

  const hubReviewNodeCount = await updateHub(reviews);

  const reviewEntries = [];
  for (const review of reviews) {
    reviewEntries.push(await writeDetailFile(review));
  }

  await updateRouteIndex(reviewEntries);

  console.log(
    JSON.stringify(
      {
        generatedAt: GENERATED_AT,
        reviewRecordCount: reviews.length,
        hubReviewNodeCount,
        detailFilesWritten: reviewEntries.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Wire npm scripts**

Edit `/Users/macbook/Code/jvto-ekosistem/package.json`. Change:

```json
    "render:web-content": "node scripts/render-web-content-sources.mjs",
```

to:

```json
    "render:web-content": "node scripts/render-web-content-sources.mjs && node scripts/generate-review-schema.mjs",
    "render:review-schema": "node scripts/generate-review-schema.mjs",
```

(Add `render:review-schema` as its own entry right after `render:web-content`; keep every other existing script line as-is.)

- [ ] **Step 3: Run it for real and inspect the output**

```bash
cd /Users/macbook/Code/jvto-ekosistem
npm run render:web-content
node -e "
const fs = require('node:fs');
const idx = JSON.parse(fs.readFileSync('5-experience-engine/manifests/route-output-index.json', 'utf8'));
const files = fs.readdirSync('5-experience-engine/json-ld/pages').filter(f => f.endsWith('.json'));
console.log('routes indexed:', idx.routes.length);
console.log('files on disk:', files.length);
const hub = JSON.parse(fs.readFileSync('5-experience-engine/json-ld/pages/why-jvto__reviews.schema-output.json', 'utf8'));
console.log('hub Review node count:', hub.json_ld['@graph'].filter(n => n['@type'] === 'Review').length);
"
```

Expected: `routes indexed:` and `files on disk:` both equal `269` (52 existing CMS/hub routes + 217 review detail routes), and `hub Review node count:` equals the number of reviews.json records that pass the eligibility filter (Trustpilot/TripAdvisor/Google, star ≥ 1, non-empty review text — expect close to but not necessarily exactly 217, since a handful of records may not pass).

- [ ] **Step 4: Run validate:schema**

```bash
cd /Users/macbook/Code/jvto-ekosistem
npm run validate:schema
```

Expected: `OK: 269 routes validated, 0 violations`. If it reports violations, they will name the exact route and rule broken (`checkNoMissingIds`, `checkNoDuplicateSingletons`, `checkDanglingReferences`, `checkOrganizationIdentity`, `checkNoZeroRatings`, `checkTouristTripConfidence`, or the `route-output-index.json out of sync` message from `checkRouteIndexSync`) — fix the generator, don't patch the output files by hand.

- [ ] **Step 5: Run all tests together and commit**

```bash
cd /Users/macbook/Code/jvto-ekosistem
npm run test:review-schema
npm run test:schema
git add scripts/generate-review-schema.mjs package.json
git commit -m "feat(review-schema): add generator driver for hub + 217 detail schema outputs"
```

Note: do not commit the regenerated `5-experience-engine/json-ld/pages/*` or `manifests/route-output-index.json` output from this local run — those are pipeline-generated artifacts; Task 3's CI workflow is what commits them going forward (`git status` will show them as modified/untracked after Step 3 — leave them out of this commit, or `git checkout -- 5-experience-engine/json-ld/pages 5-experience-engine/manifests/route-output-index.json 5-experience-engine/public-website/pages 5-experience-engine/knowledge-feed` afterward if you want a clean tree; check `git status` first since this discards the local render).

---

### Task 3: Ekosistem — wire into the sync-google-reviews workflow, fix the deploy-vps route-count gate

**Files:**
- Modify: `/Users/macbook/Code/jvto-ekosistem/.github/workflows/sync-google-reviews.yml`
- Modify: `/Users/macbook/Code/jvto-ekosistem/.github/workflows/deploy-vps.yml`

**Interfaces:**
- Consumes: `npm run render:web-content` (now chained, Task 2), `npm run validate:schema` (existing).
- Produces: nothing new consumed by later tasks — this task only affects CI behavior.

- [ ] **Step 1: Add regenerate + validate + expand the commit step in sync-google-reviews.yml**

Edit `/Users/macbook/Code/jvto-ekosistem/.github/workflows/sync-google-reviews.yml`. Replace the block from `- name: Run reviews sync` through the end of the file with:

```yaml
      - name: Run reviews sync
        env:
          GBP_CLIENT_ID: ${{ secrets.GBP_CLIENT_ID }}
          GBP_CLIENT_SECRET: ${{ secrets.GBP_CLIENT_SECRET }}
          GBP_REFRESH_TOKEN: ${{ secrets.GBP_REFRESH_TOKEN }}
          GBP_ACCOUNT_ID: ${{ secrets.GBP_ACCOUNT_ID }}
          GBP_LOCATION_ID: ${{ secrets.GBP_LOCATION_ID }}
        run: npm run sync:google-reviews

      - name: Regenerate schema (rating + review)
        run: npm run render:web-content

      - name: Validate schema
        run: npm run validate:schema

      - name: Commit and push if changed
        run: |
          set -euo pipefail
          git config user.name "jvto-ekosistem-bot"
          git config user.email "actions@users.noreply.github.com"
          if git status --porcelain | grep -q .; then
            git add \
              1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json \
              1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json \
              5-experience-engine/json-ld/pages/why-jvto__reviews.schema-output.json \
              5-experience-engine/json-ld/pages/why-jvto__reviews__*.schema-output.json \
              5-experience-engine/manifests/route-output-index.json
            git commit -m "chore(reviews): sync Google reviews + rating + review schema $(date -u +%Y-%m-%dT%H:%M:%SZ)"
            git push
          else
            echo "No changes to commit."
          fi
```

Note on scope: `npm run render:web-content` also re-renders the other 51 CMS pages (their `generated_at` timestamp changes on every run, unrelated to reviews) — the `git add` list above stays scoped to only the review-related paths on purpose, so those unrelated timestamp-only diffs never get committed. They're discarded when the ephemeral runner is torn down.

- [ ] **Step 2: Validate the YAML**

```bash
cd /Users/macbook/Code/jvto-ekosistem
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/sync-google-reviews.yml'))" && echo "YAML OK"
```

If PyYAML isn't installed locally, skip this and rely on GitHub's own workflow syntax check when the branch is pushed — do not install new dependencies just for this check.

- [ ] **Step 3: Fix the hardcoded 52-route check in deploy-vps.yml**

The existing `- name: Verify generated route count` step in `deploy-vps.yml` throws unless `route-output-index.json` has **exactly 52** routes. After this plan lands, the index will have 52 CMS routes + N review detail routes (N = `reviews.json`'s record count, currently 217, growing daily) — the hardcoded `52` check must be split so the CMS-route guard still catches real content regressions while the review-route count is validated against `reviews.json` itself instead of a number that would need bumping every day.

Edit `/Users/macbook/Code/jvto-ekosistem/.github/workflows/deploy-vps.yml`. Replace the `- name: Verify generated route count` step body with:

```yaml
      - name: Verify generated route count
        run: |
          node - <<'NODE'
          const fs = require('node:fs');
          const index = JSON.parse(fs.readFileSync('5-experience-engine/manifests/route-output-index.json', 'utf8'));
          const reviewRouteRe = /^\/why-jvto\/reviews\/\d+$/;
          const reviewRoutes = index.routes.filter((r) => reviewRouteRe.test(r.route));
          const contentRoutes = index.routes.filter((r) => !reviewRouteRe.test(r.route));

          if (contentRoutes.length !== 52) {
            throw new Error(`Expected 52 live-aligned CMS routes, got ${contentRoutes.length}`);
          }

          const reviews = JSON.parse(
            fs.readFileSync(
              '1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json',
              'utf8',
            ),
          );
          const expectedReviewRoutes = (reviews.reviews ?? []).length;
          if (reviewRoutes.length !== expectedReviewRoutes) {
            throw new Error(
              `Expected ${expectedReviewRoutes} review detail routes (1 per reviews.json record), got ${reviewRoutes.length}`,
            );
          }

          console.log(`Route count OK: ${contentRoutes.length} CMS routes + ${reviewRoutes.length} review detail routes`);
          NODE
```

- [ ] **Step 4: Validate the YAML and commit**

```bash
cd /Users/macbook/Code/jvto-ekosistem
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-vps.yml'))" && echo "YAML OK"
git add .github/workflows/sync-google-reviews.yml .github/workflows/deploy-vps.yml
git commit -m "ci(reviews): regenerate + validate review schema after sync; unhardcode route-count gate"
```

---

### Task 4: jvto-web — hub page: remove the dead individual-review builder

**Files:**
- Modify: `/Users/macbook/Code/jvto-web/src/lib/schemas/buildWhyJvtoSchemas.ts`
- Modify: `/Users/macbook/Code/jvto-web/src/app/(website)/why-jvto/reviews/page.tsx`

**Interfaces:**
- Consumes: nothing new — `PageJsonLdCombined` (`src/components/seo/PageJsonLdCombined.tsx`) already calls `getEcosystemPageSchema(pageRow.route)` for every page and merges its `ecosystemNodes` (which will include the hub's new `Review` array from Task 2/3) ahead of `extraSchemas`, deduping by `@id` via `mergeGraphNodes`. No new reader code is needed for the hub.
- Produces: nothing new for later tasks (this task only removes dead code).

**Note:** if this task runs after Bagian 1's plan (`2026-08-20-schema-rendering-bagian1-rating.md`) has already landed, `buildWhyJvtoSchemas.ts`'s `buildWhyJvtoReviewsAggregateRatingSchema` function and its `getPublicAggregateRating()` import in `why-jvto/reviews/page.tsx` will already be gone — in that case skip re-editing those specific lines and only remove `buildIndividualReviewSchemas` as described below. If it runs before Bagian 1, leave `buildWhyJvtoReviewsAggregateRatingSchema` and the rating-related import/call untouched — they are that plan's responsibility, not this one's.

- [ ] **Step 1: Remove `buildIndividualReviewSchemas` and its now-unused imports**

Edit `/Users/macbook/Code/jvto-web/src/lib/schemas/buildWhyJvtoSchemas.ts`. Change the top import block from:

```ts
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
```

to (dropping only the `Review` and `ReviewForSchema` type imports that this task's deleted function used — keep `AggregateRating`/`BreadcrumbList`/`ItemList`/`ListItem`/`WebPage`/`WithContext` and the `BEST_RATING`/`WORST_RATING` import exactly as they are, since `buildWhyJvtoReviewsAggregateRatingSchema` and other builders in this file still use them unless Bagian 1 already removed that function):

```ts
import type {
  AggregateRating,
  BreadcrumbList,
  ItemList,
  ListItem,
  WebPage,
  WithContext,
} from 'schema-dts';

import { BEST_RATING, WORST_RATING } from '@/lib/publicContent/getAggregateRating';
```

Then delete this entire function (including its JSDoc comment):

```ts
/**
 * Individual @type:Review nodes for /why-jvto/reviews — one node per DB review row.
 * Returns a flat array spread individually into the caller's extraSchemas; not wrapped in @graph.
 * itemReviewed cross-refs Organization @id (globally injected); url omitted when null.
 */
export function buildIndividualReviewSchemas(reviews: ReviewForSchema[]): WithContext<Review>[] {
  return reviews
    .filter((r): r is ReviewForSchema & { star: number } => r.star != null)
    .map((r) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    '@id': `${BASE_URL}/#review-${r.id}`,
    author: {
      '@type': 'Person',
      name: r.customer_name,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: String(r.star),
      bestRating: '5',
      worstRating: '1',
    },
    reviewBody: r.review,
    datePublished: r.date.toISOString().split('T')[0],
    ...(r.url || r.url_reference ? { url: (r.url || r.url_reference) as string } : {}),
    itemReviewed: { '@id': `${BASE_URL}/#organization` },
    publisher: {
      '@type': 'Organization',
      name: r.platform,
    },
  }));
}
```

Note: `Migrated 2026-04-29` header comment at the top of the file, `BASE_URL`, and (if Bagian 1 hasn't landed yet) `buildWhyJvtoReviewsAggregateRatingSchema` all stay untouched — this task removes exactly one function.

- [ ] **Step 2: Update the hub page to stop calling it**

Edit `/Users/macbook/Code/jvto-web/src/app/(website)/why-jvto/reviews/page.tsx`.

**If Bagian 1 has already landed** (no `buildWhyJvtoReviewsAggregateRatingSchema` import/call present), change:

```tsx
import { getReviewsForSchema } from "@/lib/queries/schemaReviews";
import { buildIndividualReviewSchemas } from "@/lib/schemas/buildWhyJvtoSchemas";
```

to:

```tsx
import { getReviewsForSchema } from "@/lib/queries/schemaReviews";
```

and change:

```tsx
  // aggregateRating no longer assembled here — it's an inline property of the
  // Organization node PageJsonLdCombined already reads from ekosistem
  // (Bagian 1 of the 2026-08-20 schema-rendering-consolidation design).
  const extraSchemas = buildIndividualReviewSchemas(reviewsData);
```

to:

```tsx
  // aggregateRating no longer assembled here — it's an inline property of the
  // Organization node PageJsonLdCombined already reads from ekosistem
  // (Bagian 1 of the 2026-08-20 schema-rendering-consolidation design).
  // Individual Review nodes are no longer built here either (Bagian 2) — they now
  // come from jvto-ekosistem's why-jvto__reviews.schema-output.json, merged in
  // automatically by PageJsonLdCombined's ecosystemNodes fetch for this route.
  const extraSchemas: unknown[] = [];
```

**If Bagian 1 has NOT landed yet** (the original rating-builder imports/call are still present), change the import block:

```tsx
import { getReviewsForSchema } from "@/lib/queries/schemaReviews";
import {
  buildIndividualReviewSchemas,
  buildWhyJvtoReviewsAggregateRatingSchema,
} from "@/lib/schemas/buildWhyJvtoSchemas";
```

to:

```tsx
import { getReviewsForSchema } from "@/lib/queries/schemaReviews";
import { buildWhyJvtoReviewsAggregateRatingSchema } from "@/lib/schemas/buildWhyJvtoSchemas";
```

and change:

```tsx
  const extraSchemas = [
    // Google Maps only — the single figure allowed to be presented as THE rating.
    buildWhyJvtoReviewsAggregateRatingSchema(await getPublicAggregateRating()),
    ...buildIndividualReviewSchemas(reviewsData),
  ].filter(Boolean);
```

to:

```tsx
  const extraSchemas = [
    // Google Maps only — the single figure allowed to be presented as THE rating.
    buildWhyJvtoReviewsAggregateRatingSchema(await getPublicAggregateRating()),
    // Individual Review nodes are no longer built here (Bagian 2, 2026-08-20) — they
    // now come from jvto-ekosistem's why-jvto__reviews.schema-output.json, merged in
    // automatically by PageJsonLdCombined's ecosystemNodes fetch for this route.
  ].filter(Boolean);
```

`getReviewsForSchema()` and the `reviewsData` variable it feeds stay exactly as they are in both cases — they're still used a few lines below for `excerptReviews` (display copy, not JSON-LD), which is explicitly out of scope (spec: `getPublicAggregateRating()`-style raw-fact readers stay).

- [ ] **Step 3: Type-check and commit**

```bash
cd /Users/macbook/Code/jvto-web
npx tsc --noEmit
```

Expected: no errors referencing `buildWhyJvtoSchemas.ts` or `why-jvto/reviews/page.tsx` (pre-existing unrelated errors elsewhere in the repo, if any, are not this task's concern).

```bash
git add src/lib/schemas/buildWhyJvtoSchemas.ts "src/app/(website)/why-jvto/reviews/page.tsx"
git commit -m "refactor(reviews): remove dead individual-review JSON-LD builder, read from ekosistem"
```

---

### Task 5: jvto-web — dynamic per-review schema reader

**Files:**
- Modify: `/Users/macbook/Code/jvto-web/src/lib/ecosystemContent/schema.ts`

**Interfaces:**
- Consumes: `ecosystemBaseUrl()`, `getEcosystemPageSchema(route: string)` (both already defined in the same file); reads `JVTO_EKOSYSTEM_CONTENT_ROOT` / `JVTO_EKOSYSTEM_CONTENT_BASE_URL` env vars (same names `ecosystemContent/website.ts` and `ecosystemContent/reviews.ts` already use).
- Produces (consumed by Task 6): `export async function getEcosystemReviewSchema(id: number): Promise<{ "@context"?: string; "@graph": SchemaNode[] } | null>`.

- [ ] **Step 1: Add the reader function**

Edit `/Users/macbook/Code/jvto-web/src/lib/ecosystemContent/schema.ts`. Add these imports at the top of the file (it currently has none):

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
```

Then append the following at the end of the file (after `graphNodesFromSchema`):

```ts
function ecosystemContentRoot(): string {
  return (
    process.env.JVTO_EKOSYSTEM_CONTENT_ROOT ??
    path.resolve(process.cwd(), "..", "jvto-ekosistem")
  );
}

function reviewSchemaOutputRelativePath(id: number): string {
  return path.join(
    "5-experience-engine",
    "json-ld",
    "pages",
    `why-jvto__reviews__${id}.schema-output.json`,
  );
}

async function readLocalReviewSchema(
  id: number,
): Promise<{ "@context"?: string; "@graph": SchemaNode[] } | null> {
  try {
    const raw = await readFile(
      path.join(ecosystemContentRoot(), reviewSchemaOutputRelativePath(id)),
      "utf8",
    );
    const payload = JSON.parse(raw) as {
      json_ld?: { "@context"?: string; "@graph"?: unknown[] };
    };
    const graph = payload.json_ld;
    if (!graph || !Array.isArray(graph["@graph"])) return null;
    return graph as { "@context"?: string; "@graph": SchemaNode[] };
  } catch {
    return null;
  }
}

/**
 * Same local-file-first / HTTP-fallback pattern as ecosystemContent/website.ts's
 * getEcosystemWebsitePage — but for a DYNAMIC per-review route
 * (/why-jvto/reviews/{id}) that has no static list, so it can't rely on
 * getEcosystemPageSchema's single generic /api/schema/page reader alone without an
 * extra local-disk tier: the id count grows daily and this repo has no
 * page-by-page manifest of which review ids exist.
 *
 * Tier 1 — local dev shortcut: read the pre-rendered file straight off disk when no
 *   remote base URL is configured (JVTO_EKOSYSTEM_CONTENT_BASE_URL unset).
 * Tier 2 — remote ekosistem API (/api/schema/page?route=/why-jvto/reviews/{id}) —
 *   the real production source of truth. jvto-ekosistem's server.mjs
 *   (handleSchemaPage) resolves this route to the same
 *   why-jvto__reviews__{id}.schema-output.json file via its own routeToOutputBase,
 *   so no server-side change is needed on the ekosistem side for this to work.
 * Tier 3 — local fallback file (same path as tier 1) if the remote call fails.
 *
 * Returns null if none of the three tiers find the file. The caller decides what
 * "no schema" means for its route — see why-jvto/reviews/[id]/page.tsx, which calls
 * notFound() rather than soft-omitting the node, because a missing file here is
 * indistinguishable from "this id hasn't been generated by ekosistem yet" (accepted
 * risk, same class as booking-records).
 */
export async function getEcosystemReviewSchema(
  id: number,
): Promise<{ "@context"?: string; "@graph": SchemaNode[] } | null> {
  if (!process.env.JVTO_EKOSYSTEM_CONTENT_BASE_URL) {
    const local = await readLocalReviewSchema(id);
    if (local) return local;
  }

  const remote = await getEcosystemPageSchema(`/why-jvto/reviews/${id}`);
  if (remote) return remote;

  return readLocalReviewSchema(id);
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/macbook/Code/jvto-web
npx tsc --noEmit
```

Expected: no errors in `ecosystemContent/schema.ts`.

- [ ] **Step 3: Manual smoke test against a local ekosistem checkout**

Requires Task 2's `npm run render:web-content` to have been run in `/Users/macbook/Code/jvto-ekosistem` at least once so `why-jvto__reviews__78.schema-output.json` exists on disk.

If `tsx` is available:

```bash
cd /Users/macbook/Code/jvto-web
JVTO_EKOSYSTEM_CONTENT_ROOT=/Users/macbook/Code/jvto-ekosistem npx tsx -e "
import { getEcosystemReviewSchema } from './src/lib/ecosystemContent/schema';
getEcosystemReviewSchema(78).then((r) => console.log(JSON.stringify(r, null, 2)));
"
```

Expected: a `{"@graph": [...]}` object containing an `Organization` node and a `Product` node with a nested `review`. If `tsx` isn't installed, skip this step and rely on Task 6's dev-server check instead.

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook/Code/jvto-web
git add src/lib/ecosystemContent/schema.ts
git commit -m "feat(reviews): add local-file-first + HTTP-fallback reader for per-review schema"
```

---

### Task 6: jvto-web — detail page: read ekosistem's Product node, add notFound() fallback

**Files:**
- Modify: `/Users/macbook/Code/jvto-web/src/app/(website)/why-jvto/reviews/[id]/page.tsx`

**Interfaces:**
- Consumes: `getEcosystemReviewSchema(id: number)` from Task 5's `src/lib/ecosystemContent/schema.ts`.
- Produces: nothing consumed by later tasks — this is the last code change; Task 7 verifies it.

- [ ] **Step 1: Add the import**

Edit `/Users/macbook/Code/jvto-web/src/app/(website)/why-jvto/reviews/[id]/page.tsx`. Change:

```tsx
import { getOrganizationProfile } from "@/lib/content/getOrganizationProfile";
import { getEcosystemReviewById } from "@/lib/ecosystemContent/reviews";
import {
  buildOrganizationJsonLd,
  toOrganizationReferenceOnly,
  buildWebSiteJsonLd,
} from "@/lib/seo/jsonld/builders";
```

to:

```tsx
import { getOrganizationProfile } from "@/lib/content/getOrganizationProfile";
import { getEcosystemReviewById } from "@/lib/ecosystemContent/reviews";
import { getEcosystemReviewSchema } from "@/lib/ecosystemContent/schema";
import {
  buildOrganizationJsonLd,
  toOrganizationReferenceOnly,
  buildWebSiteJsonLd,
} from "@/lib/seo/jsonld/builders";
```

- [ ] **Step 2: Replace the inline Product+Review builder**

Change the `export default async function ReviewDetailPage` body from:

```tsx
export default async function ReviewDetailPage({ params }: PageProps) {
  const { id } = await params;

  const reviewId = Number(id);

  const [review, org] = await Promise.all([
    Number.isFinite(reviewId) ? getEcosystemReviewById(reviewId) : Promise.resolve(null),
    getOrganizationProfile(),
  ]);

  if (!review) {
    notFound();
  }

  const resolvedName = review.packageName;
  const resolvedSlug = review.packageSlug;
  const packageName = resolvedName ?? "Java Volcano Tour Package";
  const packageUrl = packageUrlFor(resolvedSlug);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      toOrganizationReferenceOnly(buildOrganizationJsonLd(org as any, SITE_URL)),
      buildWebSiteJsonLd(SITE_URL),
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/why-jvto/reviews/${review.id}#webpage`,
        url: `${SITE_URL}/why-jvto/reviews/${review.id}`,
        name: `${review.customerName} Review | ${packageName}`,
        description:
          review.review?.slice(0, 160) ??
          `Customer review for ${packageName} with Java Volcano Tour Operator.`,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Product",
        "@id": `${SITE_URL}/why-jvto/reviews/${review.id}#product`,
        name: packageName,
        brand: { "@id": `${SITE_URL}/#organization` },
        url: packageUrl,
        review: {
          "@type": "Review",
          reviewRating: {
            "@type": "Rating",
            ratingValue: review.star ?? 5,
            bestRating: 5,
            worstRating: 1,
          },
          author: {
            "@type": "Person",
            name: review.customerName,
          },
          reviewBody: review.review,
          datePublished: new Date(review.date).toISOString(),
          publisher: { "@id": `${SITE_URL}/#organization` },
        },
      },
    ],
  };
```

to:

```tsx
export default async function ReviewDetailPage({ params }: PageProps) {
  const { id } = await params;

  const reviewId = Number(id);

  const [review, org] = await Promise.all([
    Number.isFinite(reviewId) ? getEcosystemReviewById(reviewId) : Promise.resolve(null),
    getOrganizationProfile(),
  ]);

  if (!review) {
    notFound();
  }

  // Migrated (Bagian 2, 2026-08-20): the Review-nested-in-Product JSON-LD node is now
  // pre-rendered by jvto-ekosistem (scripts/generate-review-schema.mjs), one file per
  // review id, instead of being built inline here. A missing file 404s this page
  // rather than rendering without the node — either ekosistem is unreachable, or (same
  // accepted risk as booking-records) this review was just synced into reviews.json
  // but the schema regeneration step for it hasn't run yet. The visible review content
  // above/below (customerName, star, review text) comes straight from reviews.json via
  // getEcosystemReviewById and is unaffected by this migration.
  const reviewSchema = await getEcosystemReviewSchema(review.id);
  const productNode = reviewSchema?.["@graph"].find((node) => node["@type"] === "Product") ?? null;
  if (!productNode) {
    notFound();
  }

  const resolvedName = review.packageName;
  const resolvedSlug = review.packageSlug;
  const packageName = resolvedName ?? "Java Volcano Tour Package";

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      toOrganizationReferenceOnly(buildOrganizationJsonLd(org as any, SITE_URL)),
      buildWebSiteJsonLd(SITE_URL),
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/why-jvto/reviews/${review.id}#webpage`,
        url: `${SITE_URL}/why-jvto/reviews/${review.id}`,
        name: `${review.customerName} Review | ${packageName}`,
        description:
          review.review?.slice(0, 160) ??
          `Customer review for ${packageName} with Java Volcano Tour Operator.`,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
      productNode,
    ],
  };
```

`resolvedSlug`/`packageUrlFor(resolvedSlug)` are no longer needed for the JSON-LD `Product.url` field (that now comes from ekosistem's `productNode`), but `resolvedSlug` and `resolvedName` are still read further down in the JSX (the "Related Tour Package" section, lines ~180-195) — keep `resolvedName`/`resolvedSlug` exactly as declared above; only delete the now-unused `const packageUrl = packageUrlFor(resolvedSlug);` line and, further down in the JSX, replace the two remaining uses of `packageUrl` (the `href={packageUrl}` on the "View Tour Details" link) with `packageUrlFor(resolvedSlug)` inline, since the local `packageUrl` binding above it was removed:

```tsx
          {resolvedSlug && (
            <a
              href={packageUrlFor(resolvedSlug)}
              className="inline-block mt-2 text-orange-600 font-semibold hover:underline"
            >
              View Tour Details →
            </a>
          )}
```

The `packageUrlFor` helper function itself (defined near the top of the file, above `generateMetadata`) stays untouched — it's still used here in the JSX; keep the function definition as-is.

- [ ] **Step 3: Type-check**

```bash
cd /Users/macbook/Code/jvto-web
npx tsc --noEmit
```

Expected: no errors in `why-jvto/reviews/[id]/page.tsx` (in particular, no "unused variable `packageUrl`" or "Property 'find' does not exist" type errors — `SchemaNode` from `ecosystemContent/schema.ts` is `Record<string, any>`, so `.find` on `reviewSchema["@graph"]` type-checks).

- [ ] **Step 4: Manual dev-server check**

```bash
cd /Users/macbook/Code/jvto-web
JVTO_EKOSYSTEM_CONTENT_ROOT=/Users/macbook/Code/jvto-ekosistem npm run dev &
sleep 5
curl -s http://localhost:3000/why-jvto/reviews/78 | grep -o '"@type":"Product"'
curl -s http://localhost:3000/why-jvto/reviews/999999999 -o /dev/null -w '%{http_code}\n'
kill %1
```

Expected: first curl prints `"@type":"Product"` (confirms the ekosistem-sourced node rendered); second curl prints `404` (confirms a genuinely-nonexistent id still 404s via the existing `if (!review) notFound()` path — unrelated to this task's new fallback, but a good regression check to run alongside it).

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook/Code/jvto-web
git add "src/app/(website)/why-jvto/reviews/[id]/page.tsx"
git commit -m "refactor(reviews): read Product/Review JSON-LD from ekosistem on the detail page"
```

---

### Task 7: Cross-repo verification — build, validate:jsonld-schema, live curl checks

**Files:** none modified — verification only.

**Interfaces:** none — terminal task.

- [ ] **Step 1: Full jvto-web build**

```bash
cd /Users/macbook/Code/jvto-web
npm run build
```

Expected: build succeeds with no type or lint errors attributable to the files touched in Tasks 4-6.

- [ ] **Step 2: Run validate:jsonld-schema against production**

```bash
cd /Users/macbook/Code/jvto-web
npm run validate:jsonld-schema
```

Expected: `OK: 0 violations.` This covers `/why-jvto/reviews` (the hub, which is in `sitemap.xml`) but **not** the 217 individual `/why-jvto/reviews/{id}` pages — those are deliberately excluded from `sitemap.data.ts` (confirmed: `src/app/(website)/why-jvto/sitemap.data.ts` hardcodes its route list and does not include per-review ids), so Step 3 below is the only check that covers them.

Run this both against a deploy preview/staging URL if one exists (`--base-url=...`) before the change ships to production, and again against production immediately after deploy — do not treat a passing preview run as sufficient on its own.

- [ ] **Step 3: Live curl verification — hub page**

```bash
curl -s https://javavolcano-touroperator.com/why-jvto/reviews | grep -o '"@type":"Review"' | wc -l
```

Expected: a number greater than 0, matching (or close to) the eligible-review count logged by Task 2's generator run (`hubReviewNodeCount`).

- [ ] **Step 4: Live curl verification — sample of individual review detail pages**

Pick at least 3 review ids spanning different platforms (use the ones from Task 1's tests as a starting point: `78` = Google, `65` = Trustpilot; add one TripAdvisor id from `reviews.json`):

```bash
for id in 78 65 321; do
  echo "=== /why-jvto/reviews/$id ==="
  curl -s "https://javavolcano-touroperator.com/why-jvto/reviews/$id" \
    | grep -o '"@type":"Product"\|"@type":"Review"' | sort | uniq -c
done
```

Expected: each id prints exactly one `"@type":"Product"` and one `"@type":"Review"` line (the nested review). If any id 404s or is missing a node, cross-check that `why-jvto__reviews__<id>.schema-output.json` exists in the deployed ekosistem checkout and that `JVTO_EKOSYSTEM_CONTENT_BASE_URL`/`JVTO_ECOSYSTEM_BASE_URL` on jvto-web's production environment actually points at the ekosistem host serving `/api/schema/page`.

- [ ] **Step 5: Record the verification result**

No commit needed for this task — it's the final sign-off. If any step fails, return to the relevant earlier task, fix, and re-run this task from Step 1.

---

## Self-Review

**Spec coverage:**
- Two distinct outputs (hub array + 217 detail files) — Tasks 1-2.
- `itemReviewed: {"@id": ORG_ID}` on every Review node, using the shared `ORG_ID` export — Task 1 (both hub and detail nodes carry it; detail additionally gets the full Organization node in-file so the reference resolves, per `checkDanglingReferences`).
- `id` preserved verbatim — Task 1's `buildReviewDetailProductNode`/`buildHubReviewNodes` both key off `review.id` directly, never regenerate it.
- Trigger wiring into `sync-google-reviews.yml` — Task 3.
- Error handling (soft-omit on ekosistem-unreachable as the default, `notFound()` carve-out for the detail page) — Task 5 (reader returns `null` on any failure, tier-agnostic) + Task 6 (`notFound()` call site, with the reasoning documented inline).
- Ekosistem unit tests covering complete/missing/graceful-skip/required-fields — Task 1.
- `validate-schema.mjs` checks (`checkNoDuplicateSingletons`, `checkDanglingReferences`, `checkNoMissingIds`, `checkOrganizationIdentity`) staying green — Task 2, Step 4.
- route-output-index.json / route-count sync at 217-file scale — Task 2 (generator itself) + Task 3, Step 3 (fixes the deploy-vps hardcoded-52 gate this would otherwise break).
- `npm run validate:jsonld-schema` + live curl on jvto-web — Task 7.

**Cross-plan note:** Task 4 is written to work whether this plan (Bagian 2) executes before or after Bagian 1 (`2026-08-20-schema-rendering-bagian1-rating.md`) — both orderings are handled explicitly with their own before/after code blocks, since both plans touch `buildWhyJvtoSchemas.ts` and `why-jvto/reviews/page.tsx`.

### Critical Files for Implementation

- /Users/macbook/Code/jvto-ekosistem/scripts/lib/review-schema/build-review-nodes.mjs
- /Users/macbook/Code/jvto-ekosistem/scripts/generate-review-schema.mjs
- /Users/macbook/Code/jvto-ekosistem/scripts/lib/build-organization.mjs
- /Users/macbook/Code/jvto-web/src/lib/ecosystemContent/schema.ts
- /Users/macbook/Code/jvto-web/src/app/(website)/why-jvto/reviews/[id]/page.tsx
