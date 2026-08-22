#!/usr/bin/env node
/**
 * validate-schema.mjs (REFACTORED)
 * 
 * Now uses shared schema-validator module.
 * Maintains same CLI interface and behavior.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  schemaValidators,
  checkTouristTripConfidence,
  checkRouteIndexSync,
  loadPeopleIds,
  loadRegistryIds,
} from "./lib/validate-schema-helpers.mjs";

const ROOT = process.cwd();
const PAGES_DIR = "5-experience-engine/json-ld/pages";
const ROUTE_INDEX_PATH = "5-experience-engine/manifests/route-output-index.json";

async function main() {
  const registryIds = new Set([
    ...(await loadRegistryIds()),
    ...(await loadPeopleIds()),
  ]);
  const files = (await readdir(path.join(ROOT, PAGES_DIR))).filter((file) => file.endsWith(".json"));
  let allViolations = [];

  for (const file of files) {
    const raw = await readFile(path.join(ROOT, PAGES_DIR, file), "utf8");
    const source = JSON.parse(raw);
    const graph = source.json_ld;
    const route = source.route ?? file;

    allViolations.push(
      ...schemaValidators.checkNoMissingIds(graph, route),
      ...schemaValidators.checkNoDuplicateSingletons(graph, route),
      ...schemaValidators.checkNoZeroRatings(graph, route),
      ...schemaValidators.checkDanglingReferences(graph, route, registryIds),
      ...schemaValidators.checkOrganizationIdentity(graph, route),
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
