import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { composeGraph } from "./lib/schema-contract.mjs";
import { buildLeanOrganizationReference } from "./lib/build-organization.mjs";
import { buildTouristTripOfferNodes } from "./lib/build-tourist-trip.mjs";

const PRODUCTS_DIR = "2-product-and-commercial-core/tour-products";
const PAGES_DIR = "5-experience-engine/json-ld/pages";
const ROUTE_INDEX_PATH = "5-experience-engine/manifests/route-output-index.json";
const SCHEMA_TYPES_INDEX_PATH = "5-experience-engine/json-ld/schema-types-index.json";
// Matches only this generator's own output files — never touches the other
// (CMS-content-sourced) files that also live in PAGES_DIR.
const PDP_FILE_PATTERN = /^tours__(from-bali|from-surabaya)__.+\.schema-output\.json$/;
// Category match (mirrors PDP_FILE_PATTERN's file-level approach, and
// generate-review-schema.mjs's REVIEW_ROUTE_RE) — used for manifest-entry
// cleanup so a route whose product-contract.json was renamed/removed since
// the last run is dropped from route-output-index.json and
// schema-types-index.json too, not just its output file. Filtering by "was
// this route in THIS run's output" instead would leave that stale entry
// behind forever, since a removed route is by definition never in the
// current run's set either way.
const PDP_ROUTE_RE = /^\/tours\/(from-bali|from-surabaya)\//;

async function listProductContracts(root) {
  try {
    const entries = await readdir(path.join(root, PRODUCTS_DIR));
    return entries.filter((f) => f.endsWith(".product-contract.json")).sort();
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
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
    // Lean reference, not the full ~4.5KB node — jvto-web always discards
    // ekosistem's Organization node in favor of its own local one
    // (dedup-by-@id, first-wins), so the full node is pure waste on all 17
    // PDP files. Matches the precedent generate-review-schema.mjs already
    // established for the same reason (build-organization.mjs:127).
    const orgNode = await buildLeanOrganizationReference(archiveRoot);
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
  const kept = (index.routes ?? []).filter((r) => !PDP_ROUTE_RE.test(r.route));
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

  const keptPages = (existing.pages ?? []).filter((p) => !PDP_ROUTE_RE.test(p.route));
  const pages = [...keptPages, ...schemaTypeEntries].sort((a, b) => a.route.localeCompare(b.route));

  const keptTouristTripRoutes = (existing.schemaByType?.TouristTrip ?? []).filter((r) => !PDP_ROUTE_RE.test(r));
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
