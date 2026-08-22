/**
 * external-entities.mjs (REFACTORED)
 * 
 * Now uses shared entity-resolver module.
 * Maintains backward compatibility with original API.
 */

import { loadRegistry as loadRegistryShared, resolveEntity as resolveEntityShared, entityReference as entityReferenceShared, entityFullNode as entityFullNodeShared, emitEntity as emitEntityShared } from "./shared/entity-resolver.mjs";
import path from "node:path";

const SOURCE_PATH = "1-knowledge-and-evidence-core/organization-identity/external-entities.json";

let cache = null;

/**
 * Load the external-entity registry once per process.
 *
 * The registry exists to stop third-party organisations rendering as anonymous
 * nodes. Before it, "Detik.com" on one page and "Detik.com" on another were two
 * unrelated blobs, so JVTO's chain of authority — recognised by BKPM, covered by
 * Detik.com, listed by DuMont — was invisible to a machine.
 */
export async function loadExternalEntities(root) {
  if (cache) return cache;
  
  const filepath = path.join(root, SOURCE_PATH);
  cache = await loadRegistryShared(filepath);
  
  return cache;
}

/**
 * Resolve a raw name from source data to a registry record, or null.
 */
export function resolveEntity(registry, name) {
  return resolveEntityShared(registry, name);
}

/**
 * A bare `{"@id": …}` pointer — what every page other than `definedOn` emits.
 */
export function entityReference(record) {
  return entityReferenceShared(record);
}

/**
 * The full definition, emitted only on the record's `definedOn` route.
 */
export function entityFullNode(record, registry, route) {
  return entityFullNodeShared(record, registry, route);
}

/**
 * What to emit for `name` on `route`: the full definition if this is the page
 * that owns the entity, otherwise a reference. Returns null when the name is
 * not in the registry, so callers can fall back to their previous behaviour
 * rather than dropping data.
 */
export function emitEntity(registry, name, route) {
  return emitEntityShared(registry, name, route);
}
