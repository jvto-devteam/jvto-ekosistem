#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const PAGES_DIR = "5-experience-engine/json-ld/pages";
const ROUTE_INDEX_PATH = "5-experience-engine/manifests/route-output-index.json";
const INTERNAL_ID_PREFIX = "https://javavolcano-touroperator.com/";
const EXTERNAL_ENTITIES_PATH = "1-knowledge-and-evidence-core/organization-identity/external-entities.json";
// Tour-product PDP routes only — matches generate-tourist-trip-schema.mjs's own
// PDP_ROUTE_RE. Used below to exempt each PDP route's own `#webpage` self-reference
// from the dangling-reference check.
const PDP_ROUTE_RE = /^\/tours\/(from-bali|from-surabaya)\//;

/**
 * @id values from the external-entity registry. These are defined in full on one
 * route and referenced from every other, so a per-route dangling check would
 * flag every reference. Cross-route resolution is the point of the registry.
 */
async function loadRegistryIds() {
  try {
    const raw = await readFile(path.join(ROOT, EXTERNAL_ENTITIES_PATH), "utf8");
    return new Set((JSON.parse(raw).records ?? []).map((record) => record.id));
  } catch {
    return new Set();
  }
}

function typesOf(node) {
  const type = node["@type"];
  return Array.isArray(type) ? type : [type];
}

const ORGANIZATION_CLASS = new Set(["Organization", "TravelAgency", "LocalBusiness"]);
// Broader than the singleton set on purpose: the singleton rule is about JVTO's
// own node, while the identity rule below applies to every organisation in the
// graph, third parties included.
const ORGANIZATION_ANY = new Set([
  "Organization",
  "TravelAgency",
  "LocalBusiness",
  "GovernmentOrganization",
  "NGO",
  "Corporation",
  "EducationalOrganization",
]);

/**
 * Every organisation node must carry an @id — either a full definition or a bare
 * reference. An anonymous organisation cannot be linked across pages, which is
 * what left "Detik.com" on one page unrelated to "Detik.com" on another and made
 * JVTO's chain of authority unreadable to a machine.
 */
export function checkOrganizationIdentity(graph, route) {
  const violations = [];
  function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    const types = typesOf(value).filter(Boolean);
    if (types.some((type) => ORGANIZATION_ANY.has(type)) && !value["@id"]) {
      violations.push(`${route}: organization node without @id (${value.name ?? "unnamed"})`);
    }
    Object.values(value).forEach(walk);
  }
  walk(graph["@graph"] ?? []);
  return violations;
}

function singletonClassOf(node) {
  const types = typesOf(node);
  if (types.some((type) => ORGANIZATION_CLASS.has(type))) return "Organization";
  if (types.includes("FAQPage")) return "FAQPage";
  if (types.some((type) => typeof type === "string" && type.endsWith("Page") && type !== "FAQPage")) {
    return "WebPage-class";
  }
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

/**
 * Also walks nested `node.review?.reviewRating` (a Review node embedded inside a
 * Product, e.g. the 217 review-detail pages), not just top-level
 * `node.aggregateRating` — a zero/malformed nested rating (e.g. a sync defaulting
 * an unmapped Google star enum to `star: 0`, or a non-number star) used to sail
 * through undetected because this check only ever inspected the top level. Nested
 * reviewRating has no `reviewCount` field, so that half of the check doesn't apply
 * there; it's judged on `ratingValue` alone, including a non-numeric value (e.g. a
 * string star that reached the output graph) via an explicit NaN check.
 */
export function checkNoZeroRatings(graph, route) {
  const violations = [];
  for (const node of graph["@graph"] ?? []) {
    const rating = node.aggregateRating;
    if (rating && (Number(rating.reviewCount) < 1 || Number(rating.ratingValue) <= 0)) {
      violations.push(`${route}: aggregateRating with reviewCount=${rating.reviewCount} ratingValue=${rating.ratingValue}`);
    }

    const nestedReviews = Array.isArray(node.review) ? node.review : node.review ? [node.review] : [];
    for (const nestedReview of nestedReviews) {
      const reviewRating = nestedReview?.reviewRating;
      if (!reviewRating) continue;
      const numericValue = Number(reviewRating.ratingValue);
      if (Number.isNaN(numericValue) || numericValue <= 0) {
        violations.push(`${route}: review.reviewRating with ratingValue=${JSON.stringify(reviewRating.ratingValue)}`);
      }
    }
  }
  return violations;
}

export function checkDanglingReferences(graph, route, registryIds = new Set()) {
  const nodes = graph["@graph"] ?? [];
  const knownIds = new Set(nodes.map((node) => node["@id"]));
  const violations = [];

  function isInternalGraphReference(id) {
    return typeof id === "string" && id.startsWith(INTERNAL_ID_PREFIX) && id.includes("#");
  }

  // TouristTrip's `mainEntityOfPage` on the 17 PDP routes points at this route's
  // own `#webpage` node — but WebPage is deliberately NOT emitted by ekosistem for
  // these routes (scripts/lib/build-tourist-trip.mjs's own scope-boundary doc:
  // "WebPage/BreadcrumbList/Product/... stay locally built in jvto-web"). jvto-web
  // builds that WebPage node itself and merges it into the same combined @graph at
  // render time, so the reference resolves there — it only looks dangling here
  // because this check inspects one ekosistem file's @graph in isolation. Exempt
  // only the current route's own #webpage id, and only on PDP routes, so a real
  // missing/mistyped WebPage reference elsewhere still gets caught.
  const expectedExternalWebPageId =
    typeof route === "string" && PDP_ROUTE_RE.test(route)
      ? `${INTERNAL_ID_PREFIX.slice(0, -1)}${route}#webpage`
      : null;

  function walk(value) {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;

    const keys = Object.keys(value);
    if (
      keys.length === 1 &&
      keys[0] === "@id" &&
      isInternalGraphReference(value["@id"]) &&
      !knownIds.has(value["@id"]) &&
      !registryIds.has(value["@id"]) &&
      value["@id"] !== expectedExternalWebPageId
    ) {
      violations.push(`${route}: dangling @id reference ${value["@id"]}`);
      return;
    }
    Object.values(value).forEach(walk);
  }

  nodes.forEach(walk);
  return violations;
}

export function checkTouristTripConfidence(source, route) {
  const violations = [];
  const trip = (source?.json_ld?.["@graph"] ?? []).find((node) => typesOf(node).includes("TouristTrip"));
  if (!trip) return violations;

  const traces = Array.isArray(source.source_trace) ? source.source_trace : [source.source_trace].filter(Boolean);
  const hasUnverified = traces.some((trace) => trace?.confidence && trace.confidence !== "verified");
  if (hasUnverified) {
    violations.push(`${route}: TouristTrip emitted from non-verified source_trace`);
  }
  return violations;
}

async function checkRouteIndexSync(pagesDir, routeIndexPath) {
  const violations = [];
  const files = (await readdir(path.join(ROOT, pagesDir))).filter((file) => file.endsWith(".json"));
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
  const registryIds = await loadRegistryIds();
  const files = (await readdir(path.join(ROOT, PAGES_DIR))).filter((file) => file.endsWith(".json"));
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
      ...checkDanglingReferences(graph, route, registryIds),
      ...checkOrganizationIdentity(graph, route),
      ...checkTouristTripConfidence(source, route)
    );
  }

  allViolations.push(...(await checkRouteIndexSync(PAGES_DIR, ROUTE_INDEX_PATH)));

  if (allViolations.length > 0) {
    console.log(`FAILED: ${allViolations.length} violation(s)`);
    allViolations.forEach((violation) => console.log(`  - ${violation}`));
    process.exit(1);
  }

  console.log(`OK: ${files.length} routes validated, 0 violations`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
