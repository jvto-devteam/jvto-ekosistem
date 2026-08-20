# Schema Rendering Consolidation — Bagian 3 (TouristTrip/Offer) + Trigger

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `TouristTrip` + `Offer`/`AggregateOffer` JSON-LD assembly for the 17 tour-package PDP pages from jvto-web (live-assembled, inline in two `page.tsx` files) into jvto-ekosistem (17 brand-new pre-rendered `schema-output.json` files, produced by a new generator that plugs into the existing render pipeline). Wire that generator's regeneration into the two existing GitHub Actions workflows that already touch the relevant source data, and remove the now-redundant 6-hour cron from `sync-booking-data.yml`.

**Architecture:**
- **ekosistem side** — a new pure node-builder module (`scripts/lib/build-tourist-trip.mjs`, mirrors the existing `build-organization.mjs`/`build-person.mjs`/`build-police-authority.mjs` pattern) plus a new orchestrating generator script (`scripts/generate-tourist-trip-schema.mjs`, mirrors `render-web-content-sources.mjs`'s "read sources, write many outputs, update manifests" shape — **not** `run-generators.mjs`'s `GENERATORS` array, which assumes exactly one output file per generator and doesn't fit a 17-file fan-out; see Task 2 rationale). The generator is wired into **two** call sites that must stay in sync without clobbering each other's output — see the Global Constraints note on `route-output-index.json` merge safety.
- **jvto-web side** — a new local-first/HTTP-fallback reader (`src/lib/ecosystemContent/tourSchemaOutput.ts`, same dual-path pattern as `tourPackageDetail.ts`/`website.ts`) replaces the inline `TouristTrip`/`Offer`/`AggregateOffer` builder code in both PDP `page.tsx` files. `WebPage`, `BreadcrumbList`, `Product` (including its `aggregateRating`), and the `DefinedTerm` mentions/`subjectOf` augmentation are explicitly **out of scope** and stay locally built in jvto-web — the design spec's line citations (`182-195`, `271-303`, `321-329`) cover only `TouristTrip`/dynamicOffers/`AggregateOffer`.

**Tech Stack:** Node.js ESM (`.mjs`) in ekosistem, `node:assert/strict` tests (no framework, matches existing convention). TypeScript/Next.js App Router in jvto-web, existing `readFile`-local-first-then-`fetch`-remote pattern, no new dependencies in either repo.

**Spec:** `docs/superpowers/specs/2026-08-20-ekosistem-schema-rendering-consolidation-design.md` — this plan implements **Bagian 3** (`TouristTrip` + `Offer`) and **Trigger** only. Bagian 1 (`AggregateRating` on `buildOrganizationNode()`) and Bagian 2 (`Review` nodes) are separate plans; this plan only *consumes* Bagian 1's `buildOrganizationNode()` as-is (works whether or not Bagian 1 has landed — see Task 2) and only *wires a trigger call* toward Bagian 2's generator (a documented cross-plan assumption — see Task 5b).

## Global Constraints

- Node >= 18 in ekosistem (ESM `.mjs`, no TypeScript, no new npm dependencies). TypeScript in jvto-web, no new npm dependencies.
- ekosistem tests: plain `node:assert/strict`, run via `node <file>`, block-scoped `{ ... }` cases, final `console.log("<file>: all assertions passed")` — matches `scripts/test/schema-contract.test.mjs`'s style.
- Output write convention in ekosistem: `` `${JSON.stringify(content, null, 2)}\n` ``, matching every other generator in this repo.
- **17 new files, not a modification of existing ones.** Exact slugs (from `2-product-and-commercial-core/tour-products/*.product-contract.json`, verified by directory listing):
  - `tours__from-bali__bromo-ijen-3d2n.schema-output.json`
  - `tours__from-bali__ijen-bromo-madakaripura-3d2n.schema-output.json`
  - `tours__from-bali__ijen-papuma-tumpak-sewu-bromo-4d3n.schema-output.json`
  - `tours__from-bali__ijen-papuma-tumpak-sewu-bromo-5d4n.schema-output.json`
  - `tours__from-surabaya__bromo-1d1n.schema-output.json`
  - `tours__from-surabaya__bromo-2d1n.schema-output.json`
  - `tours__from-surabaya__bromo-madakaripura-ijen-3d2n.schema-output.json`
  - `tours__from-surabaya__ijen-2d1n.schema-output.json`
  - `tours__from-surabaya__ijen-bromo-madakaripura-3d2n.schema-output.json`
  - `tours__from-surabaya__ijen-bromo-madakaripura-4d3n.schema-output.json`
  - `tours__from-surabaya__ijen-bromo-madakaripura-malang-5d4n.schema-output.json`
  - `tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-4d3n.schema-output.json`
  - `tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-5d4n.schema-output.json`
  - `tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-malang-6d5n.schema-output.json`
  - `tours__from-surabaya__taman-safari-prigen-bromo-madakaripura-3d2n.schema-output.json`
  - `tours__from-surabaya__tumpak-sewu-bromo-3d2n.schema-output.json`
  - `tours__from-surabaya__tumpak-sewu-bromo-ijen-4d3n.schema-output.json`

  (4 from-bali + 13 from-surabaya = 17. Route count in `5-experience-engine/manifests/route-output-index.json` goes from 52 → 69.)
- **`@id` convention:** `TouristTrip` is `{route}#tour`, e.g. `https://javavolcano-touroperator.com/tours/from-bali/bromo-ijen-3d2n#tour` — confirmed live pattern, matches jvto-web's current inline builder.
- **Normalization discovered during investigation (call this out, don't silently "fix" it):** jvto-web's two PDP builders currently diverge in shape. `from-bali/[slug]/page.tsx` emits a separate top-level `AggregateOffer` node (`@id: {pageUrl}#aggregateOffer`) referenced from `Product.offers`. `from-surabaya/[slug]/page.tsx` instead inlines the whole `AggregateOffer` (with `availability`/`url` fields from-bali's version lacks) directly as the value of `Product.offers`, with no separate node/`@id`. The ekosistem generator emits **one canonical shape for both origins**: always a separate top-level `AggregateOffer` node, carrying the `availability`/`url` fields (superset of both originals — enrichment for from-bali, structural extraction for from-surabaya, data loss for neither). jvto-web's from-surabaya `Product.offers` must be updated from an inline object to an `{"@id": ...}` reference to match (Task 9).
- **Route-index merge safety (discovered risk, must be handled, not just "registered"):** `render-web-content-sources.mjs`'s `main()` calls `cleanGeneratedOutputs()` (full `rm -rf` of `5-experience-engine/json-ld/pages`) and then **overwrites** `route-output-index.json` from scratch, built only from `.source.json` files under `SOURCE_DIRS`. The 17 PDP routes have no `.source.json` — they're `product-contract.json`-driven. If the new PDP generator only ran from the booking-sync trigger and `render-web-content-sources.mjs` ever ran afterward (CMS-content-triggered, independent schedule), it would silently delete the 17 PDP files and drop their 17 entries from `route-output-index.json`. **Fix (Task 3):** `render-web-content-sources.mjs`'s `main()` calls the new generator's exported function at the end of its own run too, so `npm run render:web-content` always leaves the repo at the full 69-route state regardless of order. The new generator's own `route-output-index.json` write is a **merge** (filter out its own 17 routes, re-append, re-sort), not an overwrite, so it's safe to run standalone from the booking-sync trigger without touching the other 52 CMS-driven entries.
- **Scope boundary, restated:** the ekosistem generator emits exactly `Organization` (via the existing shared `buildOrganizationNode()`) + `TouristTrip` (+ nested/day `TouristTrip` sub-nodes) + `AggregateOffer`. It does **not** emit `WebPage`, `BreadcrumbList`, `Product`, or the `DefinedTerm` `mentions`/`subjectOf` augmentation currently merged onto the `TouristTrip` node in jvto-web (`DEFINED_TERM_IDS.NIB/TDUP/HPWKI/POLPAR/KTA/BBKSDA/SE1658`, `subjectOf: {"@id": ".../#agung-sambuko"}`) — those stay entirely local to jvto-web, merged onto the ekosistem-provided `TouristTrip` node by `@id` match at render time (Task 8/9).
- **Error handling tradeoff (per spec, restated explicitly because it matters more here than for rating):** if ekosistem is unreachable at jvto-web build/render time, the PDP page renders **without** `TouristTrip`/`AggregateOffer` in its `@graph` — not a full page failure. Unlike a missing `AggregateRating` (decorative), this means `Product.offers` becomes a dangling `{"@id": "...#aggregateOffer"}` reference with no resolving node in that request's HTML — price/availability schema is core commercial content, and its absence is a real (if rare and pipeline-detectable) SEO regression for that render, not a cosmetic one. This plan does not add extra machinery to work around it (matches the design spec's blessed failure mode) but flags it here per instruction so it isn't mistaken for an oversight.
- Cron removal: `.github/workflows/sync-booking-data.yml` keeps only `cron: '0 1 * * *'` (08:00 WIB) plus its existing `repository_dispatch`/`workflow_dispatch` triggers. The `cron: '0 */6 * * *'` line is deleted — explicit user decision this session, real-time `EcosystemSync::notify()` triggers from both Laravel repos plus the daily safety-net cron are sufficient, the 6-hour poll is redundant.
- **Cross-plan integration point (Bagian 2, may execute before or after this plan):** `sync-google-reviews.yml` needs a step that regenerates Bagian 2's Review schema output after every sync. This plan does not implement Bagian 2's generator. It adds a **guarded** workflow step that calls `scripts/generate-review-schema.mjs` **only if that file exists**, so this workflow never hard-fails regardless of whether Bagian 2 has landed yet. If Bagian 2's plan names its entry-point script differently, update this one line in the YAML to match — that's the only coupling between the two plans.
- Cross-repo plan: tasks say explicitly which repo's working directory they operate in. jvto-ekosistem is `/Users/macbook/Code/jvto-ekosistem` (branch `main`); jvto-web is `/Users/macbook/Code/jvto-web` (branch `live`).

---

## Task 1: TouristTrip/Offer node builder (pure function)

**Repo: jvto-ekosistem**

**Files:**
- Create: `scripts/lib/build-tourist-trip.mjs`
- Test: `scripts/test/build-tourist-trip.test.mjs`

**Interfaces:**
- Produces: `buildTouristTripOfferNodes(pkg: object, route: string): { touristTripNode, dayNodes: object[], aggregateOfferNode } | null`
  - `pkg` is a parsed `<slug>.product-contract.json`. `route` is e.g. `/tours/from-bali/bromo-ijen-3d2n`.
  - Returns `null` (no crash) if `pkg` is missing `name` or has no `itineraryDays` — the "data kosong/hilang (skip graceful, bukan crash)" case from the spec's Testing section.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/build-tourist-trip.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { buildTouristTripOfferNodes } from "../lib/build-tourist-trip.mjs";

const FULL_PKG = {
  name: "3 Day Bromo & Ijen Volcano Discovery from Bali",
  packageId: "package-BALI-3D2N-001",
  description: "<p>Cross-island volcano route.</p>",
  originCity: "Bali",
  imageUrl: "/uploads/3-day-bromo-ijen-volcano-discovery-from-bali_1.webp",
  gallery: ["/uploads/3-day-bromo-ijen-volcano-discovery-from-bali_0.webp"],
  marketing: { perfectFor: ["Adventure seekers", "Photography enthusiasts"] },
  offers: {
    aggregateOffer: { lowPrice: 2850000, highPrice: 7500000 },
    tiers: [
      { sku: "package-BALI-3D2N-001-1", paxMin: 11, paxMax: 0, pricePerPerson: 2850000 },
      { sku: "package-BALI-3D2N-001-6", paxMin: 2, paxMax: 2, pricePerPerson: 4050000 },
    ],
  },
  itineraryDays: [
    {
      day: 1,
      title: "Bali to the Bromo Side via East Java Crossing",
      summary: "Cross-island positioning day.",
      activities: [
        { type: "TravelAction", name: "Bali Morning Pick-up to Gilimanuk", description: "Morning pick up.", timeWindow: "08:00", durationMinutes: 240 },
        { type: "CheckInAction", name: "Bromo Hotel Check-in", description: "Check in and rest.", location: "Bromo Hotel", timeWindow: "19:00", durationMinutes: 10 },
      ],
    },
    {
      day: 2,
      title: "Ijen Climb and Return to Bali",
      summary: "Ijen segment then return.",
      activities: [
        { type: "TouristAttractionVisit", name: "Ijen sunrise hike", description: "Hike to the viewpoint.", location: "Ijen Area", timeWindow: "02:00", durationMinutes: 360 },
      ],
    },
  ],
};

const ROUTE = "/tours/from-bali/bromo-ijen-3d2n";
const PAGE_URL = "https://javavolcano-touroperator.com/tours/from-bali/bromo-ijen-3d2n";

{
  const result = buildTouristTripOfferNodes(FULL_PKG, ROUTE);
  assert.ok(result, "full data must build successfully");
  const { touristTripNode, dayNodes, aggregateOfferNode } = result;

  // TouristTrip required fields
  assert.equal(touristTripNode["@id"], `${PAGE_URL}#tour`);
  assert.equal(touristTripNode["@type"], "TouristTrip");
  assert.equal(touristTripNode.name, FULL_PKG.name);
  assert.equal(touristTripNode.url, PAGE_URL);
  assert.equal(touristTripNode.description, "Cross-island volcano route.", "description must be HTML-stripped");
  assert.deepEqual(touristTripNode.image, [`https://javavolcano-touroperator.com${FULL_PKG.imageUrl}`]);
  assert.equal(touristTripNode.duration, "P2D");
  assert.deepEqual(touristTripNode.touristType, FULL_PKG.marketing.perfectFor);
  assert.deepEqual(touristTripNode.tripOrigin, { "@type": "Place", name: "Bali" });
  assert.deepEqual(touristTripNode.provider, { "@id": "https://javavolcano-touroperator.com/#organization" });
  assert.deepEqual(touristTripNode.offers, { "@id": `${PAGE_URL}#aggregateOffer` });
  assert.deepEqual(touristTripNode.identifier, [
    { "@type": "PropertyValue", name: "Internal Package ID", value: "package-BALI-3D2N-001" },
  ]);

  // subTrip embed matches dayNodes exactly (same objects, same @ids)
  assert.equal(touristTripNode.subTrip.length, 2);
  assert.equal(touristTripNode.subTrip[0]["@id"], `${PAGE_URL}#day-1`);
  assert.deepEqual(touristTripNode.itinerary.itemListElement, [
    { "@type": "ListItem", position: 1, item: { "@id": `${PAGE_URL}#day-1` } },
    { "@type": "ListItem", position: 2, item: { "@id": `${PAGE_URL}#day-2` } },
  ]);

  // day nodes are proper standalone TouristTrip nodes (needed so the bare
  // {"@id"} references above resolve inside ekosistem's own graph — see
  // Global Constraints / validate-schema.mjs's checkDanglingReferences)
  assert.equal(dayNodes.length, 2);
  assert.equal(dayNodes[0]["@type"], "TouristTrip");
  assert.equal(dayNodes[0]["@id"], `${PAGE_URL}#day-1`);
  assert.equal(dayNodes[0].name, "Day 1: Bali to the Bromo Side via East Java Crossing");
  assert.equal(dayNodes[0].departureTime, "08:00");
  assert.equal(dayNodes[0].arrivalTime, "19:10", "arrival = last activity's timeWindow + durationMinutes");
  assert.deepEqual(dayNodes[0].provider, { "@id": "https://javavolcano-touroperator.com/#organization" });
  assert.deepEqual(dayNodes[0].partOfTrip, { "@id": `${PAGE_URL}#tour` });
  assert.equal(dayNodes[0].itinerary.itemListElement.length, 2);
  assert.equal(dayNodes[0].itinerary.itemListElement[0].item["@type"], "TouristAttraction");

  // AggregateOffer required fields
  assert.equal(aggregateOfferNode["@id"], `${PAGE_URL}#aggregateOffer`);
  assert.equal(aggregateOfferNode["@type"], "AggregateOffer");
  assert.equal(aggregateOfferNode.priceCurrency, "IDR");
  assert.equal(aggregateOfferNode.lowPrice, 2850000);
  assert.equal(aggregateOfferNode.highPrice, 7500000);
  assert.equal(aggregateOfferNode.offerCount, 2);
  assert.equal(aggregateOfferNode.availability, "https://schema.org/InStock");
  assert.equal(aggregateOfferNode.url, PAGE_URL);
  assert.equal(aggregateOfferNode.offers.length, 2);
  assert.deepEqual(aggregateOfferNode.offers[0], {
    "@type": "Offer",
    sku: "package-BALI-3D2N-001-1",
    price: 2850000,
    priceCurrency: "IDR",
    eligibleQuantity: { "@type": "QuantitativeValue", minValue: 11 },
    availability: "https://schema.org/InStock",
    url: PAGE_URL,
  });
  assert.deepEqual(aggregateOfferNode.offers[1].eligibleQuantity, { "@type": "QuantitativeValue", minValue: 2, maxValue: 2 });
}

{
  // Missing itineraryDays → graceful skip, not a crash.
  const result = buildTouristTripOfferNodes({ name: "x", offers: { tiers: [] } }, ROUTE);
  assert.equal(result, null);
}

{
  // Missing name → graceful skip.
  const result = buildTouristTripOfferNodes({ itineraryDays: [{ day: 1, activities: [] }] }, ROUTE);
  assert.equal(result, null);
}

{
  // Surabaya-origin, Ijen-relevant slug → Ijen geopark fallback image when no imageUrl/gallery.
  const pkg = { ...FULL_PKG, name: "Ijen route", imageUrl: undefined, gallery: [], originCity: "Surabaya" };
  const result = buildTouristTripOfferNodes(pkg, "/tours/from-surabaya/ijen-2d1n");
  assert.deepEqual(result.touristTripNode.image, ["https://javavolcano-touroperator.com/ops/ijen-geopark-briefing.png"]);
}

{
  // Surabaya-origin, Bromo-only slug → hero fallback image when no imageUrl/gallery.
  const pkg = { ...FULL_PKG, name: "Bromo route", imageUrl: undefined, gallery: [], originCity: "Surabaya" };
  const result = buildTouristTripOfferNodes(pkg, "/tours/from-surabaya/bromo-1d1n");
  assert.deepEqual(result.touristTripNode.image, ["https://javavolcano-touroperator.com/assets/img/hero/home.webp"]);
}

console.log("build-tourist-trip.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/macbook/Code/jvto-ekosistem && node scripts/test/build-tourist-trip.test.mjs`
Expected: FAIL — `Cannot find module '../lib/build-tourist-trip.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/build-tourist-trip.mjs`:

```javascript
import { ORG_ID } from "./build-organization.mjs";

const PRODUCTION_ORIGIN = "https://javavolcano-touroperator.com";

// Bali-origin PDPs have one fallback image; Surabaya-origin splits by
// whether the route ever touches Ijen — matches the two divergent
// FALLBACK_IMAGE constants in jvto-web's tours/from-bali/[slug]/page.tsx
// and tours/from-surabaya/[slug]/page.tsx as of 2026-08-20 (design spec
// Bagian 3: "struktur menyalin field yang sudah dipakai jvto-web sekarang").
const SURABAYA_BROMO_ONLY_SLUGS = new Set([
  "bromo-1d1n",
  "bromo-2d1n",
  "taman-safari-prigen-bromo-madakaripura-3d2n",
]);

function stripHtml(html) {
  if (!html) return "";
  return String(html).replace(/<[^>]*>?/gm, "");
}

function calculateEndTime(startTime, durationMinutes) {
  if (!startTime) return "17:00";
  try {
    const [hoursPart, minutesPart] = startTime.split(":");
    const date = new Date();
    date.setHours(parseInt(hoursPart, 10), parseInt(minutesPart, 10) + (durationMinutes ?? 0));
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } catch {
    return startTime;
  }
}

function getDestinationUrl(name) {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return `${PRODUCTION_ORIGIN}/destinations/${slug}`;
}

function absoluteImage(rawPath) {
  return rawPath.startsWith("http") ? rawPath : `${PRODUCTION_ORIGIN}${rawPath}`;
}

function fallbackImage(route, originCity) {
  if (originCity === "Surabaya") {
    const bareSlug = route.split("/").pop() ?? "";
    return SURABAYA_BROMO_ONLY_SLUGS.has(bareSlug)
      ? `${PRODUCTION_ORIGIN}/assets/img/hero/home.webp`
      : `${PRODUCTION_ORIGIN}/ops/ijen-geopark-briefing.png`;
  }
  return `${PRODUCTION_ORIGIN}/ops/ijen-geopark-briefing.png`;
}

function buildDayNode(dayItem, pageUrl) {
  const dayId = `${pageUrl}#day-${dayItem.day}`;
  const activities = dayItem.activities ?? [];
  const firstActivity = activities[0];
  const lastActivity = activities[activities.length - 1];
  const departureTime = firstActivity?.timeWindow || "08:00";
  const arrivalTime = lastActivity
    ? calculateEndTime(lastActivity.timeWindow || "18:00", lastActivity.durationMinutes ?? 0)
    : "18:00";

  return {
    "@id": dayId,
    "@type": "TouristTrip",
    name: `Day ${dayItem.day}: ${dayItem.title}`,
    description: dayItem.summary,
    departureTime,
    arrivalTime,
    itinerary: {
      "@type": "ItemList",
      itemListElement: activities.map((act, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "TouristAttraction",
          name: act.name,
          description: act.description,
          url: getDestinationUrl(act.location || act.name || ""),
        },
      })),
    },
    provider: { "@id": ORG_ID },
    partOfTrip: { "@id": `${pageUrl}#tour` },
  };
}

/**
 * Builds the TouristTrip (+ nested day TouristTrip nodes) + AggregateOffer
 * nodes for one tour-package PDP, from a parsed <slug>.product-contract.json.
 *
 * Field-for-field port of the inline builder in jvto-web's
 * tours/from-bali/[slug]/page.tsx:182-195,271-303 and the from-surabaya
 * equivalent — NOT a redesign. Two deliberate normalizations over the
 * original (see plan Global Constraints):
 *   1. AggregateOffer is always a separate top-level node with its own @id
 *      (from-bali's original shape, now also used for from-surabaya).
 *   2. WebPage/BreadcrumbList/Product/mainEntityOfPage/subjectOf/mentions
 *      (DefinedTerm augmentation) are out of scope — they stay locally
 *      built in jvto-web.
 *
 * Day nodes are returned BOTH nested (as `touristTripNode.subTrip`, matching
 * jvto-web's original output 1:1) AND standalone (as `dayNodes`) — the
 * caller must push `dayNodes` into the same top-level @graph as
 * `touristTripNode`, otherwise the bare {"@id": "...#day-N"} references
 * inside touristTripNode.itinerary.itemListElement dangle (validate-schema.mjs
 * checkDanglingReferences flags any internal #-reference that isn't a
 * top-level graph node).
 *
 * Returns null (no crash) when the product contract is missing the minimum
 * fields a TouristTrip needs.
 */
export function buildTouristTripOfferNodes(pkg, route) {
  if (!pkg?.name || !Array.isArray(pkg.itineraryDays) || pkg.itineraryDays.length === 0) {
    return null;
  }

  const pageUrl = `${PRODUCTION_ORIGIN}${route}`;
  const schemaImageUrl = pkg.imageUrl
    ? absoluteImage(pkg.imageUrl)
    : pkg.gallery?.[0]
      ? absoluteImage(pkg.gallery[0])
      : fallbackImage(route, pkg.originCity);

  const dynamicOffers = (pkg.offers?.tiers ?? []).map((tier) => ({
    "@type": "Offer",
    sku: tier.sku,
    price: tier.pricePerPerson,
    priceCurrency: "IDR",
    eligibleQuantity: {
      "@type": "QuantitativeValue",
      minValue: tier.paxMin,
      ...(tier.paxMax > 0 ? { maxValue: tier.paxMax } : {}),
    },
    availability: "https://schema.org/InStock",
    url: pageUrl,
  }));

  const dayNodes = pkg.itineraryDays.map((dayItem) => buildDayNode(dayItem, pageUrl));

  const touristTripNode = {
    "@id": `${pageUrl}#tour`,
    "@type": "TouristTrip",
    name: pkg.name,
    description: stripHtml(pkg.description),
    url: pageUrl,
    image: [schemaImageUrl],
    inLanguage: "en",
    duration: `P${pkg.itineraryDays.length}D`,
    touristType: pkg.marketing?.perfectFor?.length ? pkg.marketing.perfectFor : ["Adventure seekers"],
    tripOrigin: { "@type": "Place", name: pkg.originCity },
    itinerary: {
      "@type": "ItemList",
      itemListElement: dayNodes.map((day, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: { "@id": day["@id"] },
      })),
    },
    subTrip: dayNodes,
    provider: { "@id": ORG_ID },
    offers: { "@id": `${pageUrl}#aggregateOffer` },
    identifier: [{ "@type": "PropertyValue", name: "Internal Package ID", value: pkg.packageId }],
  };

  const aggregateOfferNode = {
    "@id": `${pageUrl}#aggregateOffer`,
    "@type": "AggregateOffer",
    priceCurrency: "IDR",
    lowPrice: pkg.offers?.aggregateOffer?.lowPrice,
    highPrice: pkg.offers?.aggregateOffer?.highPrice,
    offerCount: pkg.offers?.tiers?.length ?? 0,
    availability: "https://schema.org/InStock",
    url: pageUrl,
    offers: dynamicOffers,
  };

  return { touristTripNode, dayNodes, aggregateOfferNode };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test/build-tourist-trip.test.mjs`
Expected: `build-tourist-trip.test.mjs: all assertions passed`

- [ ] **Step 5: Commit**

```
git add scripts/lib/build-tourist-trip.mjs scripts/test/build-tourist-trip.test.mjs
git commit -m "feat(json-ld): add TouristTrip/AggregateOffer node builder for tour PDP pages"
```

---

## Task 2: PDP schema-output generator (17 files + manifest merges)

**Repo: jvto-ekosistem**

**Files:**
- Create: `scripts/generate-tourist-trip-schema.mjs`
- Test: `scripts/test/generate-tourist-trip-schema.test.mjs`

**Interfaces:**
- Produces: `generateTouristTripSchemaOutputs({ archiveRoot?: string }): Promise<{ written: string[] }>`
- Reads: every `2-product-and-commercial-core/tour-products/*.product-contract.json` (excludes `package-index.json`/`package-catalog-index.json` — those don't match the `.product-contract.json` suffix, no special-casing needed).
- Writes: 17 `5-experience-engine/json-ld/pages/tours__<origin>__<slug>.schema-output.json`, merges (not overwrites) `5-experience-engine/manifests/route-output-index.json` and `5-experience-engine/json-ld/schema-types-index.json`.

**Why not `run-generators.mjs`'s `GENERATORS` array:** that registry's contract is `{ outputPath: string, generate: (context) => content }` — one generator, one output file, one `writeFile` call in `runGenerators()`. This generator needs to fan out to 17 files plus merge two shared manifests, which doesn't fit that contract without distorting it. It stays a self-contained script in the style of `render-web-content-sources.mjs` (multi-file writer, its own `main()`), exporting one function two call sites share (Task 3, Task 4).

- [ ] **Step 1: Write the failing test**

Create `scripts/test/generate-tourist-trip-schema.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { mkdtemp, mkdir, cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { generateTouristTripSchemaOutputs } from "../generate-tourist-trip-schema.mjs";

const REAL_ROOT = path.resolve(new URL("../..", import.meta.url).pathname);

async function withTempRoot(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "generate-tourist-trip-schema-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Copies the real files this generator depends on (product contracts +
// buildOrganizationNode's sources) into an isolated temp root, so the test
// exercises real repo data (all 17 real packages) without writing into the
// tracked 5-experience-engine directory.
async function seedRealSources(root) {
  await cp(
    path.join(REAL_ROOT, "2-product-and-commercial-core/tour-products"),
    path.join(root, "2-product-and-commercial-core/tour-products"),
    { recursive: true }
  );
  await mkdir(path.join(root, "1-knowledge-and-evidence-core/organization-identity"), { recursive: true });
  await cp(
    path.join(REAL_ROOT, "1-knowledge-and-evidence-core/organization-identity/organization.json"),
    path.join(root, "1-knowledge-and-evidence-core/organization-identity/organization.json")
  );
  await cp(
    path.join(REAL_ROOT, "1-knowledge-and-evidence-core/organization-identity/external-entities.json"),
    path.join(root, "1-knowledge-and-evidence-core/organization-identity/external-entities.json")
  );
}

{
  await withTempRoot(async (archiveRoot) => {
    await seedRealSources(archiveRoot);

    const result = await generateTouristTripSchemaOutputs({ archiveRoot });
    assert.equal(result.written.length, 17, "all 17 real product-contract.json files must produce output");

    const pagesDir = path.join(archiveRoot, "5-experience-engine/json-ld/pages");
    const files = await readdir(pagesDir);
    assert.equal(files.filter((f) => f.endsWith(".schema-output.json")).length, 17);

    for (const outputPath of result.written) {
      const doc = JSON.parse(await readFile(path.join(archiveRoot, outputPath), "utf8"));
      assert.equal(doc.schema_version, "jvto/output/json-ld-page/v1");
      assert.equal(doc.domain, "tours");
      assert.ok(doc.route.startsWith("/tours/from-bali/") || doc.route.startsWith("/tours/from-surabaya/"));
      assert.equal(doc.source_trace.confidence, "verified");

      const graph = doc.json_ld["@graph"];
      const types = graph.map((n) => n["@type"]);
      assert.ok(types.some((t) => Array.isArray(t) ? t.includes("Organization") : t === "Organization"));
      const trip = graph.find((n) => n["@type"] === "TouristTrip" && n["@id"] === `https://javavolcano-touroperator.com${doc.route}#tour`);
      assert.ok(trip, `TouristTrip node with @id ${doc.route}#tour must exist`);
      const aggregateOffer = graph.find((n) => n["@type"] === "AggregateOffer");
      assert.ok(aggregateOffer);
      assert.equal(aggregateOffer["@id"], `${trip.url}#aggregateOffer`);
      // Every node has an @id (checkNoMissingIds parity)
      assert.ok(graph.every((n) => Boolean(n["@id"])));
      // Every bare {"@id"} internal reference resolves within the same graph
      // (checkDanglingReferences parity) — day nodes referenced from
      // itinerary.itemListElement must be present as top-level nodes too.
      const knownIds = new Set(graph.map((n) => n["@id"]));
      for (const item of trip.itinerary.itemListElement) {
        assert.ok(knownIds.has(item.item["@id"]), `dangling reference: ${item.item["@id"]}`);
      }
    }

    const routeIndex = JSON.parse(
      await readFile(path.join(archiveRoot, "5-experience-engine/manifests/route-output-index.json"), "utf8")
    );
    assert.equal(routeIndex.routes.length, 17);
    assert.ok(routeIndex.routes.every((r) => r.route.startsWith("/tours/")));
  });
}

{
  // Merge safety: an existing route-output-index.json with unrelated (CMS)
  // routes must survive untouched, and a re-run must not duplicate entries.
  await withTempRoot(async (archiveRoot) => {
    await seedRealSources(archiveRoot);
    await mkdir(path.join(archiveRoot, "5-experience-engine/manifests"), { recursive: true });
    await writeFile(
      path.join(archiveRoot, "5-experience-engine/manifests/route-output-index.json"),
      JSON.stringify({
        generated_at: "2026-01-01T00:00:00.000Z",
        routes: [{ route: "/", domain: "home", slug: "index", schemaOutput: "5-experience-engine/json-ld/pages/home.schema-output.json" }],
      })
    );

    await generateTouristTripSchemaOutputs({ archiveRoot });
    await generateTouristTripSchemaOutputs({ archiveRoot }); // re-run, must be idempotent

    const routeIndex = JSON.parse(
      await readFile(path.join(archiveRoot, "5-experience-engine/manifests/route-output-index.json"), "utf8")
    );
    assert.equal(routeIndex.routes.length, 18, "1 pre-existing CMS route + 17 PDP routes, no duplicates");
    assert.equal(routeIndex.routes.filter((r) => r.route === "/").length, 1);
  });
}

{
  // Graceful skip: a malformed product contract must not crash the whole run.
  await withTempRoot(async (archiveRoot) => {
    await seedRealSources(archiveRoot);
    await writeFile(
      path.join(archiveRoot, "2-product-and-commercial-core/tour-products/tours__from-bali__broken.product-contract.json"),
      JSON.stringify({ slug: "tours/from-bali/broken" }) // no name, no itineraryDays
    );

    const result = await generateTouristTripSchemaOutputs({ archiveRoot });
    assert.equal(result.written.length, 17, "the broken contract is skipped, the other 17 still succeed");
  });
}

console.log("generate-tourist-trip-schema.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test/generate-tourist-trip-schema.test.mjs`
Expected: FAIL — `Cannot find module '../generate-tourist-trip-schema.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/generate-tourist-trip-schema.mjs`:

```javascript
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { composeGraph } from "./lib/schema-contract.mjs";
import { buildOrganizationNode } from "./lib/build-organization.mjs";
import { buildTouristTripOfferNodes } from "./lib/build-tourist-trip.mjs";

const PRODUCTS_DIR = "2-product-and-commercial-core/tour-products";
const PAGES_DIR = "5-experience-engine/json-ld/pages";
const ROUTE_INDEX_PATH = "5-experience-engine/manifests/route-output-index.json";
const SCHEMA_TYPES_INDEX_PATH = "5-experience-engine/json-ld/schema-types-index.json";
// Matches only this generator's own output files — never touches the other
// (CMS-content-sourced) files that also live in PAGES_DIR.
const PDP_FILE_PATTERN = /^tours__(from-bali|from-surabaya)__.+\.schema-output\.json$/;

async function listProductContracts(root) {
  const entries = await readdir(path.join(root, PRODUCTS_DIR));
  return entries.filter((f) => f.endsWith(".product-contract.json")).sort();
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function readJsonIfExists(root, relativePath, fallback) {
  try {
    return await readJson(root, relativePath);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

function routeToOutputBase(route) {
  return route.split("/").filter(Boolean).join("__");
}

export async function generateTouristTripSchemaOutputs({ archiveRoot = process.cwd() } = {}) {
  const generatedAt = new Date().toISOString();
  const files = await listProductContracts(archiveRoot);

  const written = [];
  const pdpRouteEntries = [];
  const schemaTypeEntries = [];
  const expectedFilenames = new Set();

  for (const file of files) {
    const pkg = await readJson(archiveRoot, path.join(PRODUCTS_DIR, file));
    const route = `/${pkg.slug}`;
    const built = buildTouristTripOfferNodes(pkg, route);
    if (!built) {
      console.warn(`[generate-tourist-trip-schema] skipped ${file}: missing required fields for TouristTrip`);
      continue;
    }

    const { touristTripNode, dayNodes, aggregateOfferNode } = built;
    const orgNode = await buildOrganizationNode(archiveRoot, route);
    const nodes = [orgNode, touristTripNode, ...dayNodes, aggregateOfferNode];

    const base = routeToOutputBase(route);
    const outputPath = `${PAGES_DIR}/${base}.schema-output.json`;
    const slugParts = String(pkg.slug).split("/"); // ["tours", "from-bali", "<slug>"]
    const domain = slugParts[0];
    const slug = slugParts.slice(1).join("/");

    const document = {
      schema_version: "jvto/output/json-ld-page/v1",
      output_type: "json_ld_page",
      generated_at: generatedAt,
      route,
      domain,
      slug,
      json_ld: composeGraph(nodes),
      source_trace: {
        generated_at: generatedAt,
        source_files: [`${PRODUCTS_DIR}/${file}`],
        confidence: "verified",
        migration_note:
          "TouristTrip + Offer/AggregateOffer relocated from jvto-web's inline per-page builder " +
          "(tours/from-bali/[slug]/page.tsx and tours/from-surabaya/[slug]/page.tsx) to ekosistem, " +
          "consistent with every other JSON-LD node in this pipeline (design spec " +
          "2026-08-20-ekosistem-schema-rendering-consolidation-design.md, Bagian 3). WebPage, " +
          "BreadcrumbList, Product, and the DefinedTerm mentions/subjectOf augmentation stay local " +
          "to jvto-web — out of scope for this generator.",
      },
    };

    await mkdir(path.join(archiveRoot, PAGES_DIR), { recursive: true });
    await writeFile(path.join(archiveRoot, outputPath), `${JSON.stringify(document, null, 2)}\n`);
    written.push(outputPath);
    expectedFilenames.add(`${base}.schema-output.json`);

    pdpRouteEntries.push({ route, domain, slug, schemaOutput: outputPath });
    schemaTypeEntries.push({ route, title: pkg.name, schemaTypes: ["TouristTrip"], faqKey: null });
  }

  // Targeted stale-file cleanup — unlike render-web-content-sources.mjs's
  // full-directory wipe, this only ever removes files this generator itself
  // owns (a product-contract.json renamed/removed since the last run), so
  // the 52 CMS-content-sourced files sharing PAGES_DIR are never touched.
  const existingFiles = await readdir(path.join(archiveRoot, PAGES_DIR)).catch(() => []);
  for (const existing of existingFiles) {
    if (PDP_FILE_PATTERN.test(existing) && !expectedFilenames.has(existing)) {
      await rm(path.join(archiveRoot, PAGES_DIR, existing), { force: true });
    }
  }

  await mergeRouteIndex(archiveRoot, pdpRouteEntries, generatedAt);
  await mergeSchemaTypesIndex(archiveRoot, schemaTypeEntries);

  return { written };
}

async function mergeRouteIndex(archiveRoot, pdpRouteEntries, generatedAt) {
  const index = await readJsonIfExists(archiveRoot, ROUTE_INDEX_PATH, { routes: [] });
  const pdpRoutes = new Set(pdpRouteEntries.map((e) => e.route));
  const kept = (index.routes ?? []).filter((r) => !pdpRoutes.has(r.route));
  const routes = [...kept, ...pdpRouteEntries].sort((a, b) => a.route.localeCompare(b.route));

  await mkdir(path.join(archiveRoot, path.dirname(ROUTE_INDEX_PATH)), { recursive: true });
  await writeFile(
    path.join(archiveRoot, ROUTE_INDEX_PATH),
    `${JSON.stringify({ generated_at: generatedAt, routes }, null, 2)}\n`
  );
}

async function mergeSchemaTypesIndex(archiveRoot, schemaTypeEntries) {
  // This manifest is hand-authored/CMS-curated (44 of the 52 CMS routes, not
  // all 52) — if it doesn't exist yet in this archiveRoot (e.g. an isolated
  // test fixture), there's nothing to merge into; skip rather than invent it.
  const existing = await readJsonIfExists(archiveRoot, SCHEMA_TYPES_INDEX_PATH, null);
  if (!existing) return;

  const pdpByRoute = new Map(schemaTypeEntries.map((e) => [e.route, e]));
  const keptPages = (existing.pages ?? []).filter((p) => !pdpByRoute.has(p.route));
  const pages = [...keptPages, ...schemaTypeEntries].sort((a, b) => a.route.localeCompare(b.route));

  const keptTouristTripRoutes = (existing.schemaByType?.TouristTrip ?? []).filter((r) => !pdpByRoute.has(r));
  const touristTripRoutes = [...keptTouristTripRoutes, ...schemaTypeEntries.map((e) => e.route)].sort();

  const updated = {
    ...existing,
    pageCount: pages.length,
    knownOmissions: {
      ...existing.knownOmissions,
      TouristTrip_and_Offer:
        "REVERSED 2026-08-20 (was: intentionally absent). Design spec " +
        "2026-08-20-ekosistem-schema-rendering-consolidation-design.md Bagian 3 moved TouristTrip/Offer " +
        "assembly into ekosistem for the 17 tour-product PDP routes — see schemaByType.TouristTrip and " +
        "scripts/generate-tourist-trip-schema.mjs. The AggregateRating/Review omissions recorded " +
        "elsewhere in this object are UNRELATED and still stand (separate Bagian 1/2 of the same spec, " +
        "not touched by this generator).",
    },
    schemaByType: { ...existing.schemaByType, TouristTrip: touristTripRoutes },
    pages,
  };

  await writeFile(
    path.join(archiveRoot, SCHEMA_TYPES_INDEX_PATH),
    `${JSON.stringify(updated, null, 2)}\n`
  );
}

const isMainModule = path.resolve(process.argv[1] ?? "") === path.resolve(new URL(import.meta.url).pathname);
if (isMainModule) {
  const result = await generateTouristTripSchemaOutputs({});
  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test/generate-tourist-trip-schema.test.mjs`
Expected: `generate-tourist-trip-schema.test.mjs: all assertions passed`

Note: this test's first case runs against **all 17 real product-contract.json files** copied into an isolated temp root — this is the "unit test covering all 17 packages have valid output" requirement from the spec's Testing section, satisfied with real data rather than synthetic fixtures (higher fidelity, since a synthetic fixture could pass while a real file's actual shape breaks the generator).

- [ ] **Step 5: Run it against the real repo and inspect output manually**

Run: `node scripts/generate-tourist-trip-schema.mjs`
Expected: `{ "written": [ ...17 paths... ] }`. Then:
```
ls 5-experience-engine/json-ld/pages/tours__from-bali__*.schema-output.json 5-experience-engine/json-ld/pages/tours__from-surabaya__*.schema-output.json | wc -l
```
Expected: `17`. Inspect one file (e.g. `tours__from-bali__bromo-ijen-3d2n.schema-output.json`) by eye to confirm the `@graph` shape matches the design.

Do **not** commit yet — this is verified again after Task 3 wires it into the full pipeline, to confirm the 69-route final state in one commit.

---

## Task 3: Wire into `render-web-content-sources.mjs` (full-rebuild consistency)

**Repo: jvto-ekosistem**

**Files:**
- Modify: `scripts/render-web-content-sources.mjs`

**Why:** `npm run render:web-content` is the CMS-content-triggered full rebuild. Its own `cleanGeneratedOutputs()` wipes all of `5-experience-engine/json-ld/pages` and its own `main()` overwrites `route-output-index.json` from scratch. Without this wiring, any future `render:web-content` run would silently delete the 17 PDP files and their route-index entries. Calling the new generator at the end of `main()` makes `render:web-content` the single "produces the complete 69-route state" entry point, while the booking-sync trigger (Task 4) can still call the PDP generator standalone for a fast, targeted regeneration — both paths share the same generator function, so there is exactly one source of truth for PDP output shape.

- [ ] **Step 1: Add the import**

In `scripts/render-web-content-sources.mjs`, add near the other `lib` imports (after the `build-police-authority.mjs` import):

```javascript
import { generateTouristTripSchemaOutputs } from "./generate-tourist-trip-schema.mjs";
```

- [ ] **Step 2: Call it at the end of `main()`**

In `scripts/render-web-content-sources.mjs`, after the existing `writeFile` calls for `route-output-index.json` and `source-output-map.json` (still inside `main()`, before the final `console.log`), add:

```javascript
  const pdpResult = await generateTouristTripSchemaOutputs({ archiveRoot: ROOT });
```

Then update the final `console.log` block to include the PDP count for visibility:

```javascript
  console.log(JSON.stringify({
    generatedAt: GENERATED_AT,
    sourceCount: sources.length,
    websiteOutputCount: routeIndex.length,
    schemaOutputCount: routeIndex.length,
    feedRecordCount: feedRecords.length,
    pdpSchemaOutputCount: pdpResult.written.length
  }, null, 2));
```

- [ ] **Step 3: Run the full pipeline and verify 69 routes**

```
npm run render:web-content
npm run validate:schema
```

Expected: `validate:schema` prints `OK: 69 routes validated, 0 violations`. If it doesn't, read the violation list — it will name the exact route and rule (most likely a leftover from a manual Task 2 Step 5 run with stale `generated_at`, harmless, or a genuine dangling reference if Task 1/2 code was hand-edited after the tests passed).

- [ ] **Step 4: Run the full test suite**

```
node scripts/test/build-tourist-trip.test.mjs
node scripts/test/generate-tourist-trip-schema.test.mjs
npm run test:schema
npm run test:booking-sync
```

Expected: all pass.

- [ ] **Step 5: Commit**

```
git add scripts/generate-tourist-trip-schema.mjs scripts/test/generate-tourist-trip-schema.test.mjs scripts/render-web-content-sources.mjs 5-experience-engine/json-ld/pages 5-experience-engine/json-ld/schema-types-index.json 5-experience-engine/manifests/route-output-index.json
git commit -m "feat(json-ld): generate TouristTrip/AggregateOffer schema-output.json for all 17 tour PDP routes"
```

---

## Task 4: Wire trigger into `sync-booking-data.mjs`

**Repo: jvto-ekosistem**

**Files:**
- Modify: `scripts/sync-booking-data.mjs`

- [ ] **Step 1: Add the import**

In `scripts/sync-booking-data.mjs`, alongside the existing `run-generators.mjs` import:

```javascript
import { runGenerators } from "./run-generators.mjs";
import { generateTouristTripSchemaOutputs } from "./generate-tourist-trip-schema.mjs";
```

- [ ] **Step 2: Call it right after `runGenerators()`**

In `runSync()`, immediately after the existing `await runGenerators({ archiveRoot });` line (inside the same `hasChanges`-guarded branch, so it never runs on a dry-run or a no-op sync, matching the existing guard):

```javascript
  await runGenerators({ archiveRoot });
  await generateTouristTripSchemaOutputs({ archiveRoot });

  return { diff, report, detailResults };
```

Note (documented, not fixed here — out of scope): today, `product-contract.json` pricing/availability is manually maintained, not derived from booking-overview data, so this call will typically be a no-op diff (same content, only `generated_at`/`source_trace.generated_at` timestamps differ — and since the 17 files are always rewritten fully with a fresh timestamp, git will show a diff on every triggered run even with unchanged package data). This is intentional/accepted: it's cheap (no network I/O, 17 local file reads), keeps the two generators' regeneration timing coupled per the spec's explicit Trigger section instruction, and is forward-compatible if `product-contract.json`'s `pricing`/`offers`/`availability` fields are ever wired to a live booking-derived source later.

- [ ] **Step 3: Verify with a dry run**

```
node scripts/sync-booking-data.mjs --dry-run
```

Expected: no crash, `[dry-run] would fetch/keep ... detail(s); no files written.` — confirms `generateTouristTripSchemaOutputs()` is correctly gated behind `hasChanges` (never invoked on a dry run, since `dryRun || !hasChanges` returns before that point in the function).

- [ ] **Step 4: Commit**

```
git add scripts/sync-booking-data.mjs
git commit -m "feat(booking-sync): regenerate TouristTrip/Offer schema output after every successful sync"
```

---

## Task 5: Workflow wiring (cron removal + review-schema trigger)

**Repo: jvto-ekosistem**

**Files:**
- Modify: `.github/workflows/sync-booking-data.yml`
- Modify: `.github/workflows/sync-google-reviews.yml`

### 5a. `sync-booking-data.yml` — remove the redundant 6-hour cron

No step needs to be added: `runGenerators()`/`generateTouristTripSchemaOutputs()` now run at the **script** level (Task 4), inside `sync-booking-data.mjs`, which the existing `Run booking sync` step already invokes via `npm run sync:booking`. The existing `Commit and push if changed` step already `git add`s `5-experience-engine` (the whole directory), which covers `5-experience-engine/json-ld/pages/*`, `5-experience-engine/manifests/route-output-index.json`, and `5-experience-engine/json-ld/schema-types-index.json`. **No other change needed in this workflow besides the cron line.**

- [ ] **Step 1: Remove the 6-hour cron**

In `.github/workflows/sync-booking-data.yml`, change:

```yaml
on:
  repository_dispatch:
    types: [booking-changed]
  schedule:
    - cron: '0 */6 * * *'   # every 6 hours, fallback in case webhooks are missed
    - cron: '0 1 * * *'     # 08:00 WIB daily — guaranteed morning check, independent of the above
  workflow_dispatch:
```

to:

```yaml
on:
  repository_dispatch:
    types: [booking-changed]
  schedule:
    - cron: '0 1 * * *'     # 08:00 WIB daily — guaranteed morning check, safety net for repository_dispatch
  workflow_dispatch:
```

### 5b. `sync-google-reviews.yml` — guarded trigger for Bagian 2's review-schema regeneration

This is the cross-plan integration point. Bagian 2 is a separate plan and may land before or after this one. The step below is written to be a **no-op** (not a failure) if Bagian 2's generator script doesn't exist yet.

- [ ] **Step 1: Add the guarded regeneration step**

In `.github/workflows/sync-google-reviews.yml`, insert a new step between `Run reviews sync` and `Commit and push if changed`:

```yaml
      - name: Run reviews sync
        env:
          GBP_CLIENT_ID: ${{ secrets.GBP_CLIENT_ID }}
          GBP_CLIENT_SECRET: ${{ secrets.GBP_CLIENT_SECRET }}
          GBP_REFRESH_TOKEN: ${{ secrets.GBP_REFRESH_TOKEN }}
          GBP_ACCOUNT_ID: ${{ secrets.GBP_ACCOUNT_ID }}
          GBP_LOCATION_ID: ${{ secrets.GBP_LOCATION_ID }}
        run: npm run sync:google-reviews

      # Bagian 2 (Review nodes) of the same design spec (docs/superpowers/specs/
      # 2026-08-20-ekosistem-schema-rendering-consolidation-design.md) owns
      # scripts/generate-review-schema.mjs, generated by a SEPARATE plan that
      # may land before or after this one. Guarded so this workflow never
      # hard-fails while Bagian 2 hasn't shipped yet. If Bagian 2's plan names
      # this file differently, update the path below to match — that's the
      # only coupling point between the two plans.
      - name: Regenerate review + rating schema output (Bagian 2, if present)
        run: |
          if [ -f scripts/generate-review-schema.mjs ]; then
            node scripts/generate-review-schema.mjs
          else
            echo "scripts/generate-review-schema.mjs not present yet (Bagian 2 not landed) — skipping."
          fi

      - name: Commit and push if changed
```

- [ ] **Step 2: Widen the commit step's `git add` to cover schema output**

The current `Commit and push if changed` step only stages the two raw source files. Once Bagian 2's generator writes into `5-experience-engine`, that output needs to be staged too. Change:

```yaml
            git add \
              1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json \
              1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json
```

to:

```yaml
            git add \
              1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json \
              1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json \
              5-experience-engine
```

- [ ] **Step 3: Verify the guard locally**

```
cd /Users/macbook/Code/jvto-ekosistem
[ -f scripts/generate-review-schema.mjs ] && echo "would run" || echo "would skip (expected: Bagian 2 not landed yet)"
```

Expected: `would skip (expected: Bagian 2 not landed yet)` — confirms the guard is correctly written before this workflow ever runs in CI.

- [ ] **Step 4: Commit**

```
git add .github/workflows/sync-booking-data.yml .github/workflows/sync-google-reviews.yml
git commit -m "chore(workflows): remove redundant 6h booking-sync cron, wire review-schema regeneration trigger"
```

---

## Task 6: Ekosistem-side final verification

**Repo: jvto-ekosistem**

- [ ] **Step 1: Full regeneration from a clean state**

```
npm run render:web-content
npm run validate:schema
```

Expected: `OK: 69 routes validated, 0 violations`.

- [ ] **Step 2: Full test suite**

```
npm run test:schema
npm run test:booking-sync
node scripts/test/build-tourist-trip.test.mjs
node scripts/test/generate-tourist-trip-schema.test.mjs
```

Expected: all pass, 0 failures.

- [ ] **Step 3: Spot-check `schema-types-index.json`**

```
node -e "const d = require('./5-experience-engine/json-ld/schema-types-index.json'); console.log(d.pageCount, d.schemaByType.TouristTrip.length, d.knownOmissions.TouristTrip_and_Offer.slice(0, 40))"
```

Expected: `pageCount` = 44 + 17 = 61, `schemaByType.TouristTrip.length` = 17, and the `knownOmissions.TouristTrip_and_Offer` string starts with `"REVERSED 2026-08-20"`.

- [ ] **Step 4: Diff review before moving to jvto-web**

```
git status
git diff --stat HEAD
```

Confirm the diff is confined to: `scripts/lib/build-tourist-trip.mjs`, `scripts/generate-tourist-trip-schema.mjs`, `scripts/render-web-content-sources.mjs`, `scripts/sync-booking-data.mjs`, `scripts/test/build-tourist-trip.test.mjs`, `scripts/test/generate-tourist-trip-schema.test.mjs`, `.github/workflows/sync-booking-data.yml`, `.github/workflows/sync-google-reviews.yml`, the 17 new files under `5-experience-engine/json-ld/pages/`, `5-experience-engine/manifests/route-output-index.json`, `5-experience-engine/json-ld/schema-types-index.json`. Nothing under `2-product-and-commercial-core` should be modified (the generator only reads product contracts, never writes to them).

This task has no separate commit — Tasks 3-5 already committed their own changes; this is a checkpoint before switching repos.

---

## Task 7: jvto-web — new ekosistem schema-output reader

**Repo: jvto-web**

**Files:**
- Create: `src/lib/ecosystemContent/tourSchemaOutput.ts`

**Interfaces:**
- Produces: `getEcosystemTourSchemaNodes(slug: string): Promise<Record<string, unknown>[] | null>`
  - `slug` matches the convention already used by `getEcosystemTourPackageDetail()`, e.g. `"tours/from-bali/bromo-ijen-3d2n"`.
  - Returns the ekosistem-generated `@graph` array (`Organization` + `TouristTrip` + day `TouristTrip` nodes + `AggregateOffer`), or `null` on any read failure (local miss AND remote miss/error) — per spec Error handling, the caller renders the page without these nodes rather than failing the build.

This is genuinely new wiring (no existing reader targets `*.schema-output.json` in jvto-web today), so it's built from scratch, following the exact same local-first/HTTP-fallback pattern already established twice in this codebase (`tourPackageDetail.ts`'s `readLocal`/`fetchRemote`, `website.ts`'s `readLocalJson`/`fetchJson`).

- [ ] **Step 1: Create the reader module**

Create `src/lib/ecosystemContent/tourSchemaOutput.ts`:

```typescript
// src/lib/ecosystemContent/tourSchemaOutput.ts
//
// Reads a tour-package PDP's pre-rendered TouristTrip + AggregateOffer (+
// per-day TouristTrip) nodes from jvto-ekosistem
// (5-experience-engine/json-ld/pages/<route>.schema-output.json).
//
// Same local-first / HTTP-fallback pattern as ecosystemContent/tourPackageDetail.ts
// and ecosystemContent/website.ts. New as of the schema-rendering consolidation
// (design spec 2026-08-20-ekosistem-schema-rendering-consolidation-design.md,
// Bagian 3): these 17 PDP routes had no pre-rendered ekosistem json-ld before —
// TouristTrip/Offer were previously built inline in this repo's page.tsx files.
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ECOSYSTEM_BASE_URL = "https://ekosistem.javavolcano-touroperator.com";
const DEFAULT_REVALIDATE_SECONDS = 300;
const SOURCE_DIR = "5-experience-engine/json-ld/pages";

const REVALIDATE_SECONDS = Number(
  process.env.JVTO_EKOSYSTEM_CONTENT_REVALIDATE_SECONDS ?? DEFAULT_REVALIDATE_SECONDS,
);

function ecosystemContentRoot(): string {
  return (
    process.env.JVTO_EKOSYSTEM_CONTENT_ROOT ??
    path.resolve(process.cwd(), "..", "jvto-ekosistem")
  );
}

function slugToFilename(slug: string): string {
  return `${slug.replace(/\//g, "__")}.schema-output.json`;
}

type EcosystemSchemaOutput = {
  schema_version: string;
  route: string;
  domain: string;
  slug: string;
  json_ld: { "@context": string; "@graph": Record<string, unknown>[] };
};

async function readLocal(slug: string): Promise<EcosystemSchemaOutput | null> {
  try {
    const raw = await readFile(
      path.join(ecosystemContentRoot(), SOURCE_DIR, slugToFilename(slug)),
      "utf8",
    );
    return JSON.parse(raw) as EcosystemSchemaOutput;
  } catch {
    return null;
  }
}

async function fetchRemote(slug: string): Promise<EcosystemSchemaOutput | null> {
  const configuredBase = process.env.JVTO_EKOSYSTEM_CONTENT_BASE_URL?.trim();
  const baseUrl = configuredBase || DEFAULT_ECOSYSTEM_BASE_URL;

  try {
    const url = new URL("/api/file", baseUrl);
    url.searchParams.set("path", `${SOURCE_DIR}/${slugToFilename(slug)}`);

    const response = await fetch(url, {
      next: {
        revalidate: REVALIDATE_SECONDS,
        tags: ["jvto-ekosistem-content", `jvto-ekosistem-tour-schema-${slug}`],
      },
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { content?: string };
    if (typeof body.content !== "string") return null;
    return JSON.parse(body.content) as EcosystemSchemaOutput;
  } catch {
    return null;
  }
}

/**
 * Pre-rendered Organization + TouristTrip (+ per-day TouristTrip) +
 * AggregateOffer nodes for one tour-package PDP.
 *
 * Returns null (not []) on any read failure so callers can render the page
 * without these nodes rather than fail the whole build — see design spec
 * Error handling: for this page, that means Product.offers (built locally,
 * unaffected by this reader) becomes a dangling @id reference in that
 * request's HTML rather than the page failing outright. Accepted tradeoff,
 * not additionally engineered around here.
 *
 * The Organization node in the returned array is a full definition (same
 * shared buildOrganizationNode() every other ekosistem page uses) and will
 * duplicate-by-@id against this page's own toOrganizationReferenceOnly()
 * stub already in `globalNodes` — normalizeJsonLd() (src/lib/seo/jsonld/normalize.ts)
 * dedupes by @id keeping the FIRST occurrence, and globalNodes is always
 * spread before this array's nodes in <JsonLd data={[...]}>, so the existing
 * page-local reference wins and the ekosistem duplicate is silently dropped.
 * No special-casing needed here — this is by design, not a bug to fix later.
 */
export async function getEcosystemTourSchemaNodes(
  slug: string,
): Promise<Record<string, unknown>[] | null> {
  const output = (await readLocal(slug)) ?? (await fetchRemote(slug));
  if (!output?.json_ld?.["@graph"]) return null;
  return output.json_ld["@graph"];
}
```

- [ ] **Step 2: Sanity-check locally against Task 3's real output**

```
cd /Users/macbook/Code/jvto-web
cat ../jvto-ekosistem/5-experience-engine/json-ld/pages/tours__from-bali__bromo-ijen-3d2n.schema-output.json | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.json_ld['@graph'].map(n=>n['@type']))"
```

Expected: prints an array including `Organization`, `TouristTrip` (multiple — one main + one per day), `AggregateOffer` — confirms the file this reader targets is well-formed and reachable at the expected path before wiring it into `page.tsx`.

- [ ] **Step 3: Commit**

```
git add src/lib/ecosystemContent/tourSchemaOutput.ts
git commit -m "feat(ecosystem-content): add reader for pre-rendered PDP TouristTrip/Offer schema output"
```

---

## Task 8: jvto-web — `tours/from-bali/[slug]/page.tsx`

**Repo: jvto-web**

**Files:**
- Modify: `src/app/(website)/tours/from-bali/[slug]/page.tsx`

- [ ] **Step 1: Add the import**

Add alongside the other `ecosystemContent` imports:

```typescript
import { getEcosystemTourSchemaNodes } from "@/lib/ecosystemContent/tourSchemaOutput";
```

- [ ] **Step 2: Replace `StructuredData`'s body**

Replace the entire `StructuredData` function (from `function StructuredData({` through its closing `}`, i.e. everything currently between the "4. INTERNAL COMPONENT" comment and the "5. METADATA GENERATION" comment) with:

```typescript
function StructuredData({
  data,
  globalNodes,
  googleStats,
  tourAugment,
  ecosystemNodes,
}: {
  data: TourPackageDetailResponse;
  globalNodes: any[];
  googleStats: { rating: number; count: number } | null;
  tourAugment?: { subjectOf: { "@id": string }; mentions: { "@id": string }[] } | null;
  ecosystemNodes: Record<string, unknown>[] | null;
}) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://javavolcano-touroperator.com";
  const pkg = data.product;

  const slugString = Array.isArray(pkg.slug) ? pkg.slug.join("/") : pkg.slug;
  const pageUrl = `${siteUrl}/${
    slugString.startsWith("/") ? slugString.substring(1) : slugString
  }`;

  // Wiki 82c1270: all Bali tours include Ijen → Geopark briefing as fallback image.
  const FALLBACK_IMAGE = `${siteUrl}/ops/ijen-geopark-briefing.png`;
  const rawImage = pkg.imageUrl || (pkg.gallery && pkg.gallery[0]) || FALLBACK_IMAGE;
  const schemaImageUrl =
    rawImage && !rawImage.startsWith("http")
      ? `${siteUrl}${rawImage}`
      : rawImage;

  // TouristTrip + per-day TouristTrip + AggregateOffer now come pre-rendered
  // from ekosistem (design spec Bagian 3, 2026-08-20). Augment the TouristTrip
  // node with the DefinedTerm mentions/subjectOf that stay page-local (never
  // sent to ekosistem — see plan Global Constraints) by @id match, rather
  // than rebuilding the node here.
  const augmentedEcosystemNodes = (ecosystemNodes ?? []).map((node) =>
    node["@id"] === `${pageUrl}#tour` && tourAugment
      ? { ...node, subjectOf: tourAugment.subjectOf, mentions: tourAugment.mentions }
      : node,
  );

  const graphSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: pkg.name,
        description: stripHtml(pkg.description).substring(0, 160),
        inLanguage: "en",
        dateModified: new Date().toISOString(),
        primaryImageOfPage: { "@type": "ImageObject", url: schemaImageUrl },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Tours",
            item: `${siteUrl}/tours`,
          },
          { "@type": "ListItem", position: 3, name: "From Bali", item: `${siteUrl}/tours/from-bali` },
          { "@type": "ListItem", position: 4, name: pkg.name, item: pageUrl },
        ],
      },
      ...augmentedEcosystemNodes,
      {
        "@type": "Product",
        "@id": `${pageUrl}#product`,
        name: pkg.name,
        description: stripHtml(pkg.description),
        image: [schemaImageUrl],
        sku: pkg.packageId,
        productID: pkg.packageId,
        brand: { "@id": `${siteUrl}/#organization` },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: pkg.aggregateRating?.ratingValue || String(googleStats?.rating ?? 4.8),
          reviewCount: pkg.aggregateRating?.reviewCount || String(googleStats?.count ?? 141),
        },
        offers: { "@id": `${pageUrl}#aggregateOffer` },
        potentialAction: { "@type": "ReserveAction", target: pageUrl },
      },
    ],
  };

  return (
    <JsonLd data={[...globalNodes, graphSchema]} />
  );
}
```

(Note: `getDestinationUrl` and `calculateEndTime` are no longer used by this file — they moved to `scripts/lib/build-tourist-trip.mjs` in ekosistem. Leave them defined for now since `stripHtml`/`formatCurrency` in the same "2. HELPER FUNCTIONS" block are still used elsewhere in this file (`generateMetadata`, `adaptToTourDetailSeed`) — do not delete the whole block, only the `StructuredData` function body above. If your linter flags `getDestinationUrl`/`calculateEndTime` as unused after this change, delete just those two functions in a follow-up step, not before.)

- [ ] **Step 3: Wire `ecosystemNodes` into `Page()`**

In the `Promise.all` inside `export default async function Page`, add the new fetch (parallel — it only needs the route `slug` param, not the resolved `data`):

```typescript
  const [data, reviews, org, allClaims, googleStats, reviewProfiles, ijenCraterRequirements, ecosystemNodes] = await Promise.all([
    getTourData(slug),
    getReviewsData(),
    getOrganizationProfile(),
    getEcosystemNarrativeClaims(),
    getPublicAggregateRating(),
    // Per-platform badge figures for TrustBar (client bundle — must be drilled in).
    getEcosystemReviewProfiles(),
    // Ijen Crater mandatory-requirements table + FAQ for TourRequirements (client bundle — must be drilled in).
    getEcosystemIjenCraterRequirements(),
    // Pre-rendered TouristTrip/AggregateOffer nodes (design spec Bagian 3).
    getEcosystemTourSchemaNodes(`tours/from-bali/${slug}`),
  ]);
```

And pass it through to `StructuredData`:

```typescript
      <StructuredData data={data} globalNodes={globalNodes} googleStats={googleStats} tourAugment={tourAugment} ecosystemNodes={ecosystemNodes} />
```

- [ ] **Step 4: Remove now-dead helper functions**

Delete `getDestinationUrl` and `calculateEndTime` from the "2. HELPER FUNCTIONS" section (both were only used by the removed `StructuredData` code). Keep `stripHtml` and `formatCurrency` — both are still used elsewhere in this file.

- [ ] **Step 5: Type-check + build**

```
cd /Users/macbook/Code/jvto-web
npx tsc --noEmit
```

Expected: no new type errors. (Full `next build` deferred to Task 10, after both PDP files are updated, to avoid a redundant build.)

- [ ] **Step 6: Commit**

```
git add "src/app/(website)/tours/from-bali/[slug]/page.tsx"
git commit -m "refactor(tours): read pre-rendered TouristTrip/Offer from ekosistem instead of building inline"
```

---

## Task 9: jvto-web — `tours/from-surabaya/[slug]/page.tsx`

**Repo: jvto-web**

**Files:**
- Modify: `src/app/(website)/tours/from-surabaya/[slug]/page.tsx`

Same shape as Task 8, with two differences from the from-bali file: (a) the `FALLBACK_IMAGE` logic uses `BROMO_ONLY_SLUGS` — that stays, since `Product`/`WebPage` still compute `schemaImageUrl` locally (this is expected duplication with ekosistem's own copy of the same fallback logic in `scripts/lib/build-tourist-trip.mjs` — two systems now independently need it, not a bug); (b) `Product.offers` must change from an **inline** `AggregateOffer` object to an `{"@id": ...}` **reference**, matching the normalization decided in Global Constraints.

- [ ] **Step 1: Add the import**

```typescript
import { getEcosystemTourSchemaNodes } from "@/lib/ecosystemContent/tourSchemaOutput";
```

- [ ] **Step 2: Replace `StructuredData`'s body**

Replace the entire `StructuredData` function with:

```typescript
function StructuredData({
  data,
  globalNodes,
  googleStats,
  tourAugment,
  ecosystemNodes,
}: {
  data: TourPackageDetailResponse;
  globalNodes: any[];
  googleStats: { rating: number; count: number } | null;
  tourAugment?: { subjectOf: { "@id": string }; mentions: { "@id": string }[] } | null;
  ecosystemNodes: Record<string, unknown>[] | null;
}) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://javavolcano-touroperator.com";
  const pkg = data.product;

  const slugString = Array.isArray(pkg.slug) ? pkg.slug.join("/") : pkg.slug;
  const pageUrl = `${siteUrl}/${
    slugString.startsWith("/") ? slugString.substring(1) : slugString
  }`;

  // Wiki 82c1270: canonical fallback images when no tour-specific photo in DB.
  // Bromo/Safari-only (no Ijen) → hero landscape. All others (Ijen-relevant) → Geopark briefing.
  const BROMO_ONLY_SLUGS = new Set(['bromo-1d1n', 'bromo-2d1n', 'taman-safari-prigen-bromo-madakaripura-3d2n']);
  const bareSlug = slugString.split('/').pop() ?? '';
  const FALLBACK_IMAGE = BROMO_ONLY_SLUGS.has(bareSlug)
    ? `${siteUrl}/assets/img/hero/home.webp`
    : `${siteUrl}/ops/ijen-geopark-briefing.png`;
  const rawImage = pkg.imageUrl || (pkg.gallery && pkg.gallery[0]) || FALLBACK_IMAGE;
  const schemaImageUrl =
    rawImage && !rawImage.startsWith("http")
      ? `${siteUrl}${rawImage}`
      : rawImage;

  // TouristTrip + per-day TouristTrip + AggregateOffer now come pre-rendered
  // from ekosistem (design spec Bagian 3, 2026-08-20). Augment the TouristTrip
  // node with the DefinedTerm mentions/subjectOf that stay page-local, by @id
  // match, rather than rebuilding the node here.
  const augmentedEcosystemNodes = (ecosystemNodes ?? []).map((node) =>
    node["@id"] === `${pageUrl}#tour` && tourAugment
      ? { ...node, subjectOf: tourAugment.subjectOf, mentions: tourAugment.mentions }
      : node,
  );

  const graphSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: pkg.name,
        description: stripHtml(pkg.description).substring(0, 160),
        inLanguage: "en",
        dateModified: new Date().toISOString(),
        primaryImageOfPage: { "@type": "ImageObject", url: schemaImageUrl },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Tours",
            item: `${siteUrl}/tours`,
          },
          { "@type": "ListItem", position: 3, name: "From Surabaya", item: `${siteUrl}/tours/from-surabaya` },
          { "@type": "ListItem", position: 4, name: pkg.name, item: pageUrl },
        ],
      },
      ...augmentedEcosystemNodes,
      {
        "@type": "Product",
        "@id": `${pageUrl}#product`,
        name: pkg.name,
        description: stripHtml(pkg.description),
        image: [schemaImageUrl],
        sku: pkg.packageId,
        productID: pkg.packageId,
        brand: { "@id": `${siteUrl}/#organization` },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: pkg.aggregateRating?.ratingValue || String(googleStats?.rating ?? 4.8),
          reviewCount: pkg.aggregateRating?.reviewCount || String(googleStats?.count ?? 141),
        },
        offers: { "@id": `${pageUrl}#aggregateOffer` },
        potentialAction: { "@type": "ReserveAction", target: pageUrl },
      },
    ],
  };

  return (
    <JsonLd data={[...globalNodes, graphSchema]} />
  );
}
```

Note the `Product.offers` line is now `{ "@id": \`${pageUrl}#aggregateOffer\` }` — previously an inline `AggregateOffer` object with `dynamicOffers` nested inside. This is the normalization from Global Constraints: from-surabaya's `AggregateOffer` is now the same separate top-level node shape as from-bali's (and both origins' `@id`s resolve to the same ekosistem-generated node, since ekosistem emits one canonical shape for both).

- [ ] **Step 3: Wire `ecosystemNodes` into `Page()`**

```typescript
  const [data, reviews, org, allClaims, googleStats, reviewProfiles, ijenCraterRequirements, ecosystemNodes] = await Promise.all([
    getTourData(slug),
    getReviewsData(),
    getOrganizationProfile(),
    getEcosystemNarrativeClaims(),
    getPublicAggregateRating(),
    // Per-platform badge figures for TrustBar (client bundle — must be drilled in).
    getEcosystemReviewProfiles(),
    // Ijen Crater mandatory-requirements table + FAQ for TourRequirements (client bundle — must be drilled in).
    getEcosystemIjenCraterRequirements(),
    // Pre-rendered TouristTrip/AggregateOffer nodes (design spec Bagian 3).
    getEcosystemTourSchemaNodes(`tours/from-surabaya/${slug}`),
  ]);
```

```typescript
      <StructuredData data={data} globalNodes={globalNodes} googleStats={googleStats} tourAugment={tourAugment} ecosystemNodes={ecosystemNodes} />
```

- [ ] **Step 4: Remove now-dead helper functions**

Delete `getDestinationUrl` and `calculateEndTime` from the "2. HELPER FUNCTIONS" section. Keep `stripHtml` and `formatCurrency`.

- [ ] **Step 5: Type-check**

```
cd /Users/macbook/Code/jvto-web
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 6: Commit**

```
git add "src/app/(website)/tours/from-surabaya/[slug]/page.tsx"
git commit -m "refactor(tours): read pre-rendered TouristTrip/Offer from ekosistem instead of building inline, normalize AggregateOffer to a referenced node"
```

---

## Task 10: jvto-web — build + full-reconciliation live verification

**Repo: jvto-web**

**Files:** none (verification only).

Per spec Testing: "Verifikasi live manual (pola yang sudah dipakai sesi ini): `curl` langsung ke halaman production setelah deploy, cek `@type` yang diharapkan muncul di HTML — bukan cuma percaya build sukses" and this session's established pattern of full reconciliation across **all** affected pages, not a sample (a prior sample previously missed one item and had to be caught by a full re-check).

- [ ] **Step 1: Local build**

```
cd /Users/macbook/Code/jvto-web
npm run build
```

Expected: build succeeds, all 17 PDP routes present in the `generateStaticParams()` output for both `[slug]` routes (4 from-bali + 13 from-surabaya).

- [ ] **Step 2: `validate:jsonld-schema`**

```
npm run validate:jsonld-schema
```

Expected: no missing/duplicate-node violations reported for any of the 17 PDP routes.

- [ ] **Step 3: Full-reconciliation live curl check (all 17 URLs, not a sample)**

After deploy, run against every one of the 17 production PDP URLs (derived from `KNOWN_TOUR_SLUGS` in `src/lib/ecosystemContent/tourPackageDetail.ts`):

```bash
SLUGS=(
  "tours/from-bali/bromo-ijen-3d2n"
  "tours/from-bali/ijen-bromo-madakaripura-3d2n"
  "tours/from-bali/ijen-papuma-tumpak-sewu-bromo-4d3n"
  "tours/from-bali/ijen-papuma-tumpak-sewu-bromo-5d4n"
  "tours/from-surabaya/bromo-1d1n"
  "tours/from-surabaya/bromo-2d1n"
  "tours/from-surabaya/bromo-madakaripura-ijen-3d2n"
  "tours/from-surabaya/ijen-2d1n"
  "tours/from-surabaya/ijen-bromo-madakaripura-3d2n"
  "tours/from-surabaya/ijen-bromo-madakaripura-4d3n"
  "tours/from-surabaya/ijen-bromo-madakaripura-malang-5d4n"
  "tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-4d3n"
  "tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-5d4n"
  "tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-malang-6d5n"
  "tours/from-surabaya/taman-safari-prigen-bromo-madakaripura-3d2n"
  "tours/from-surabaya/tumpak-sewu-bromo-3d2n"
  "tours/from-surabaya/tumpak-sewu-bromo-ijen-4d3n"
)

for slug in "${SLUGS[@]}"; do
  html=$(curl -s "https://javavolcano-touroperator.com/${slug}")
  hasTrip=$(echo "$html" | grep -c '"@type":"TouristTrip"')
  hasOffer=$(echo "$html" | grep -c '"@type":"AggregateOffer"')
  echo "${slug} -> TouristTrip:${hasTrip} AggregateOffer:${hasOffer}"
done
```

Expected: every one of the 17 lines shows `TouristTrip:1` (or more, since day-nodes also carry `"@type":"TouristTrip"` — grep count will legitimately be > 1) and `AggregateOffer:1`. Any line showing `0` for either is a real regression on that specific route and must be investigated before considering this task done — do not stop at the first N successes and assume the rest are fine.

- [ ] **Step 4: Spot-check one from-surabaya page's `Product.offers` shape**

```bash
curl -s "https://javavolcano-touroperator.com/tours/from-surabaya/bromo-1d1n" | grep -o '"@id":"[^"]*#aggregateOffer"' | sort -u
```

Expected: exactly one unique `#aggregateOffer` `@id` value appears (confirms the Task 9 normalization — `Product.offers`'s reference and the standalone `AggregateOffer` node's own `@id` point to the same string, no duplicate/mismatched ids).

- [ ] **Step 5: No commit for this task** — verification only. If any URL fails Step 3 or 4, return to Task 8/9 and fix before considering Bagian 3 done.

---

## Task summary

| # | Repo | What |
|---|------|------|
| 1 | ekosistem | `buildTouristTripOfferNodes()` pure node builder + unit test |
| 2 | ekosistem | `generateTouristTripSchemaOutputs()` — 17 files + manifest merges + unit test |
| 3 | ekosistem | Wire into `render-web-content-sources.mjs` (full-rebuild consistency) |
| 4 | ekosistem | Wire trigger into `sync-booking-data.mjs` |
| 5 | ekosistem | Workflow edits: remove 6h cron, guarded Bagian-2 trigger + git-add widening |
| 6 | ekosistem | Full regeneration + test suite + manifest spot-check |
| 7 | jvto-web | New `tourSchemaOutput.ts` reader |
| 8 | jvto-web | `tours/from-bali/[slug]/page.tsx` rewire |
| 9 | jvto-web | `tours/from-surabaya/[slug]/page.tsx` rewire + AggregateOffer normalization |
| 10 | jvto-web | Build + full-reconciliation live verification across all 17 URLs |
