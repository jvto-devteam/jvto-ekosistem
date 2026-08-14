#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const PAGES_DIR = "5-experience-engine/json-ld/pages";
const ROUTE_INDEX_PATH = "5-experience-engine/manifests/route-output-index.json";
const INTERNAL_ID_PREFIX = "https://javavolcano-touroperator.com/";

function typesOf(node) {
  const type = node["@type"];
  return Array.isArray(type) ? type : [type];
}

const ORGANIZATION_CLASS = new Set(["Organization", "TravelAgency", "LocalBusiness"]);

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

export function checkNoZeroRatings(graph, route) {
  const violations = [];
  for (const node of graph["@graph"] ?? []) {
    const rating = node.aggregateRating;
    if (rating && (Number(rating.reviewCount) < 1 || Number(rating.ratingValue) <= 0)) {
      violations.push(`${route}: aggregateRating with reviewCount=${rating.reviewCount} ratingValue=${rating.ratingValue}`);
    }
  }
  return violations;
}

export function checkDanglingReferences(graph, route) {
  const nodes = graph["@graph"] ?? [];
  const knownIds = new Set(nodes.map((node) => node["@id"]));
  const violations = [];

  function isInternalGraphReference(id) {
    return typeof id === "string" && id.startsWith(INTERNAL_ID_PREFIX) && id.includes("#");
  }

  function walk(value) {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;

    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "@id" && isInternalGraphReference(value["@id"]) && !knownIds.has(value["@id"])) {
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
      ...checkDanglingReferences(graph, route),
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
