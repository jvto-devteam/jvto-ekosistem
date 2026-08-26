import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildLeanOrganizationReference } from "./lib/build-organization.mjs";
import { composeGraph } from "./lib/schema-contract.mjs";
import {
  buildPdpReviewNodes,
  BASE_URL,
  HUB_ROUTE,
  buildHubReviewNodes,
  buildReviewDetailProductNode,
  isValidStar,
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

/**
 * Same degrade-gracefully contract as build-organization.mjs's loadReviewProfiles():
 * a missing file is not a crash, it's a fallback. Only ENOENT is swallowed — a
 * malformed/unreadable-for-other-reasons file still propagates, since that's a real
 * bug worth surfacing rather than silently masking. Named/shaped to match the
 * identical helper introduced for the same problem in the Bagian 3 plan's generators.
 */
async function readJsonIfExists(root, relativePath, fallback) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
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
  const hub = await readJsonIfExists(ROOT, HUB_OUTPUT_PATH, null);
  if (!hub) {
    console.warn("[generate-review-schema] hub file not found, skipping hub update");
    return 0;
  }
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
 * One standalone schema-output.json per review, each carrying a LEAN Organization
 * reference (not the full node — see buildLeanOrganizationReference) so the Product
 * node's `brand` bare {"@id": ORG_ID} reference still resolves within this single
 * file — required by checkDanglingReferences in scripts/validate-schema.mjs, which
 * only inspects one file's own @graph at a time — without duplicating the business's
 * aggregateRating, sameAs, credentials, etc. onto 217 pages that aren't about the
 * business. jvto-web only reads this file's Product node and discards Organization
 * entirely (verified safe — see the whole-branch review finding this addresses).
 */
async function writeDetailFile(review) {
  const route = detailRoute(review.id);
  const orgNode = await buildLeanOrganizationReference(ROOT);
  if (review.star !== null && review.star !== undefined && !isValidStar(review.star)) {
    console.warn(
      `[generate-review-schema] review id=${review.id} has an invalid star rating (${JSON.stringify(review.star)}); falling back to ratingValue 5 in the detail page`,
    );
  }
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
  const index = await readJsonIfExists(ROOT, ROUTE_INDEX_PATH, { routes: [] });
  const nonReviewRoutes = (index.routes ?? []).filter((r) => !REVIEW_ROUTE_RE.test(r.route));
  const routes = [...nonReviewRoutes, ...reviewEntries].sort((a, b) => a.route.localeCompare(b.route));
  await writeJson(ROUTE_INDEX_PATH, { generated_at: GENERATED_AT, routes });
}


/** PDP schema-output files, the same pattern generate-tourist-trip-schema.mjs uses. */
const PDP_FILE_PATTERN = /^tours__(from-bali|from-surabaya)__.+\.schema-output\.json$/;

/**
 * How many Review nodes one PDP may carry.
 *
 * One package has 87 attributed reviews. Emitting all of them puts roughly 26KB of
 * JSON-LD on a single page for well past the point where another quotation adds
 * anything. Twenty, newest first, keeps the quotations that matter and the page
 * light — and the generator prints how many were available for each route, so the
 * cap is a stated number rather than a silent truncation.
 */
const PDP_REVIEW_CAP = 20;

/**
 * Attaches each package's own reviews to its TouristTrip node.
 *
 * Reviews carry a packageSlug naming the route they were left for; 150 of 221 records
 * have one, covering five packages. The remaining twelve PDPs get nothing, which is
 * the honest outcome — a review states which tour someone actually took.
 *
 * Idempotent in the same way updateHub is: existing Review nodes and any prior
 * `review` array on the Product are dropped before rebuilding, so running this
 * without a preceding render never accumulates or freezes stale quotations.
 */
async function updatePdpReviews(reviews) {
  const dir = path.join(ROOT, PAGES_DIR);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => PDP_FILE_PATTERN.test(f)).sort();
  } catch {
    return { routes: 0, nodes: 0, perRoute: {} };
  }

  let routes = 0;
  let nodes = 0;
  const perRoute = {};

  for (const file of files) {
    const rel = `${PAGES_DIR}/${file}`;
    const doc = await readJsonIfExists(ROOT, rel, null);
    const route = doc?.route;
    if (!doc || typeof route !== "string") continue;

    const all = buildPdpReviewNodes(reviews, route, { baseUrl: BASE_URL });
    const kept = [...all]
      .sort((a, b) => String(b.datePublished ?? "").localeCompare(String(a.datePublished ?? "")))
      .slice(0, PDP_REVIEW_CAP);

    const graph = (doc.json_ld?.["@graph"] ?? []).filter((node) => node["@type"] !== "Review");
    // ekosistem names the package node #tour (TouristTrip). jvto-web builds a
    // separate #product node for the same package at render time; referencing
    // that from here would not resolve inside this file, which validate-schema
    // checks one file at a time.
    const productId = `${BASE_URL}${route}#tour`;
    let touched = false;
    for (const node of graph) {
      if (node["@id"] !== productId) continue;
      delete node.review;
      if (kept.length) node.review = kept.map((n) => ({ "@id": n["@id"] }));
      touched = true;
    }
    if (!touched) continue;

    doc.json_ld = composeGraph([...graph, ...kept]);
    doc.generated_at = GENERATED_AT;
    const existing = doc.source_trace?.source_files ?? [];
    doc.source_trace = {
      ...doc.source_trace,
      source_files: existing.includes(REVIEWS_SOURCE_PATH)
        ? existing
        : [...existing, REVIEWS_SOURCE_PATH],
    };
    await writeJson(rel, doc);

    if (kept.length) {
      routes += 1;
      nodes += kept.length;
      perRoute[route] = all.length > kept.length ? `${kept.length} of ${all.length}` : `${kept.length}`;
    }
  }

  return { routes, nodes, perRoute };
}

async function main() {
  await mkdir(path.join(ROOT, PAGES_DIR), { recursive: true });

  const reviewsFile = await readJson(REVIEWS_SOURCE_PATH);
  const reviews = Array.isArray(reviewsFile.reviews) ? reviewsFile.reviews : [];

  const hubReviewNodeCount = await updateHub(reviews);
  const pdp = await updatePdpReviews(reviews);

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
        pdpRoutesWithReviews: pdp.routes,
        pdpReviewNodes: pdp.nodes,
        pdpPerRoute: pdp.perRoute,
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
