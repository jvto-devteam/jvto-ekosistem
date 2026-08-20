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

// Minimal realistic shape mirroring the real
// 5-experience-engine/json-ld/schema-types-index.json (dataStatus, pageCount,
// knownOmissions, schemaByType, pages) — used to exercise mergeSchemaTypesIndex's
// actual filter/append/sort logic instead of always hitting its early-return-on-missing-file
// path. `extraPages`/`extraTouristTripRoutes` let individual tests inject pre-existing
// (unrelated or stale) entries.
function buildSchemaTypesIndexFixture({ extraPages = [], extraTouristTripRoutes = [] } = {}) {
  const unrelatedPage = {
    route: "/destinations",
    title: "East Java Destinations",
    schemaTypes: ["CollectionPage"],
    faqKey: "destinations",
  };
  const pages = [unrelatedPage, ...extraPages];
  return {
    dataStatus: "extracted",
    pageCount: pages.length,
    knownOmissions: {
      AggregateRating: "unrelated omission note — must survive this generator's merge untouched.",
      TouristTrip_and_Offer: "stale placeholder note predating this generator — expected to be overwritten.",
    },
    schemaByType: {
      CollectionPage: ["/destinations"],
      ...(extraTouristTripRoutes.length ? { TouristTrip: extraTouristTripRoutes } : {}),
    },
    pages,
  };
}

async function writeSchemaTypesIndexFixture(root, fixture) {
  await mkdir(path.join(root, "5-experience-engine/json-ld"), { recursive: true });
  await writeFile(
    path.join(root, "5-experience-engine/json-ld/schema-types-index.json"),
    JSON.stringify(fixture, null, 2)
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
  // Also exercises mergeSchemaTypesIndex's real merge logic (not just its
  // early-return-on-missing-file path): unrelated pre-existing entries must
  // survive, the 17 new TouristTrip routes must be merged into both
  // schemaByType.TouristTrip and pages, and a re-run must stay idempotent.
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
    await writeSchemaTypesIndexFixture(archiveRoot, buildSchemaTypesIndexFixture());

    await generateTouristTripSchemaOutputs({ archiveRoot });
    await generateTouristTripSchemaOutputs({ archiveRoot }); // re-run, must be idempotent

    const routeIndex = JSON.parse(
      await readFile(path.join(archiveRoot, "5-experience-engine/manifests/route-output-index.json"), "utf8")
    );
    assert.equal(routeIndex.routes.length, 18, "1 pre-existing CMS route + 17 PDP routes, no duplicates");
    assert.equal(routeIndex.routes.filter((r) => r.route === "/").length, 1);

    const schemaTypesIndex = JSON.parse(
      await readFile(path.join(archiveRoot, "5-experience-engine/json-ld/schema-types-index.json"), "utf8")
    );
    // (a) pre-existing unrelated entry survives untouched
    const destinationsPage = schemaTypesIndex.pages.find((p) => p.route === "/destinations");
    assert.deepEqual(destinationsPage, {
      route: "/destinations",
      title: "East Java Destinations",
      schemaTypes: ["CollectionPage"],
      faqKey: "destinations",
    });
    assert.deepEqual(schemaTypesIndex.schemaByType.CollectionPage, ["/destinations"]);
    assert.equal(
      schemaTypesIndex.knownOmissions.AggregateRating,
      "unrelated omission note — must survive this generator's merge untouched."
    );
    // (b) the 17 new TouristTrip routes are merged into schemaByType.TouristTrip and pages
    assert.equal(schemaTypesIndex.schemaByType.TouristTrip.length, 17, "no duplicates across the 2 runs");
    assert.ok(schemaTypesIndex.schemaByType.TouristTrip.every((r) => r.startsWith("/tours/")));
    assert.equal(new Set(schemaTypesIndex.schemaByType.TouristTrip).size, 17, "route set has no duplicates");
    const pdpPages = schemaTypesIndex.pages.filter((p) => p.route.startsWith("/tours/"));
    assert.equal(pdpPages.length, 17, "no duplicates across the 2 runs");
    assert.ok(pdpPages.every((p) => p.schemaTypes.includes("TouristTrip")));
    // (c) pageCount reflects the merged pages array (1 unrelated + 17 PDP)
    assert.equal(schemaTypesIndex.pageCount, 18);
  });
}

{
  // Regression coverage for the manifest-cleanup fix: a PDP route left over
  // from a previous run whose product-contract.json has since been
  // renamed/removed must be dropped from BOTH route-output-index.json and
  // schema-types-index.json — not just have its output file deleted. Before
  // the fix, cleanup only removed manifest entries that matched the CURRENT
  // run's route set, which can never include an already-removed route, so
  // the stale entry would linger forever.
  await withTempRoot(async (archiveRoot) => {
    await seedRealSources(archiveRoot);
    const ghostRoute = "/tours/from-bali/ghost-package";

    await mkdir(path.join(archiveRoot, "5-experience-engine/manifests"), { recursive: true });
    await writeFile(
      path.join(archiveRoot, "5-experience-engine/manifests/route-output-index.json"),
      JSON.stringify({
        generated_at: "2026-01-01T00:00:00.000Z",
        routes: [
          { route: "/", domain: "home", slug: "index", schemaOutput: "5-experience-engine/json-ld/pages/home.schema-output.json" },
          {
            route: ghostRoute,
            domain: "tours",
            slug: "from-bali/ghost-package",
            schemaOutput: "5-experience-engine/json-ld/pages/tours__from-bali__ghost-package.schema-output.json",
          },
        ],
      })
    );
    await writeSchemaTypesIndexFixture(
      archiveRoot,
      buildSchemaTypesIndexFixture({
        extraPages: [{ route: ghostRoute, title: "Ghost Package (removed)", schemaTypes: ["TouristTrip"], faqKey: null }],
        extraTouristTripRoutes: [ghostRoute],
      })
    );

    await generateTouristTripSchemaOutputs({ archiveRoot });

    const routeIndex = JSON.parse(
      await readFile(path.join(archiveRoot, "5-experience-engine/manifests/route-output-index.json"), "utf8")
    );
    assert.equal(routeIndex.routes.length, 18, "1 CMS route + 17 real PDP routes; ghost route dropped");
    assert.ok(!routeIndex.routes.some((r) => r.route === ghostRoute), "stale ghost route must be removed");
    assert.equal(routeIndex.routes.filter((r) => r.route === "/").length, 1);

    const schemaTypesIndex = JSON.parse(
      await readFile(path.join(archiveRoot, "5-experience-engine/json-ld/schema-types-index.json"), "utf8")
    );
    assert.ok(
      !schemaTypesIndex.pages.some((p) => p.route === ghostRoute),
      "stale ghost page entry must be removed from pages"
    );
    assert.ok(
      !schemaTypesIndex.schemaByType.TouristTrip.includes(ghostRoute),
      "stale ghost route must be removed from schemaByType.TouristTrip"
    );
    assert.equal(schemaTypesIndex.schemaByType.TouristTrip.length, 17);
    assert.ok(schemaTypesIndex.pages.some((p) => p.route === "/destinations"), "unrelated entry still survives");
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
