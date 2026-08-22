/**
 * validate-schema-helpers.mjs
 * 
 * Helper functions extracted from validate-schema.mjs that don't belong in shared modules
 * (they're ekosistem-specific). Re-exported with shared validators for convenience.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { schemaValidators } from "./lib/shared/schema-validator.mjs";

const ROOT = process.cwd();
const EXTERNAL_ENTITIES_PATH = "1-knowledge-and-evidence-core/organization-identity/external-entities.json";
const PEOPLE_PATH = "1-knowledge-and-evidence-core/people-and-crew/people.json";

/**
 * Load Person @id values for the founder and published crew.
 * These are defined in full on their own /why-jvto/our-team/<code> route
 * and referenced from elsewhere.
 */
export async function loadPeopleIds() {
  try {
    const raw = await readFile(path.join(ROOT, PEOPLE_PATH), "utf8");
    const people = JSON.parse(raw);
    const site = "https://javavolcano-touroperator.com";
    const ids = new Set();
    for (const person of people.leadership ?? []) {
      if (person.public !== false && person.id) {
        ids.add(`${site}/why-jvto/our-team/${person.id}#person`);
      }
    }
    for (const member of people.crew?.roster ?? []) {
      if (member.public !== false && member.rendered !== false && member.code) {
        ids.add(`${site}/why-jvto/our-team/${member.code}#person`);
      }
    }
    ids.add(`${site}/#agung-sambuko`);
    return ids;
  } catch {
    return new Set();
  }
}

/**
 * Load @id values from the external-entity registry.
 */
export async function loadRegistryIds() {
  try {
    const raw = await readFile(path.join(ROOT, EXTERNAL_ENTITIES_PATH), "utf8");
    return new Set((JSON.parse(raw).records ?? []).map((record) => record.id));
  } catch {
    return new Set();
  }
}

/**
 * Helper: extract @type as array.
 */
function typesOf(node) {
  const type = node["@type"];
  return Array.isArray(type) ? type : [type];
}

/**
 * Check that TouristTrip is only emitted from verified sources.
 */
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

/**
 * Check that route-output-index.json is in sync with files on disk.
 */
export async function checkRouteIndexSync(pagesDir, routeIndexPath) {
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

/**
 * Re-export shared validators for convenience.
 */
export { schemaValidators };
