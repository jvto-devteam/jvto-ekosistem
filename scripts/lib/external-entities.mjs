import { readFile } from "node:fs/promises";
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
  const raw = await readFile(path.join(root, SOURCE_PATH), "utf8");
  const data = JSON.parse(raw);

  const byKey = new Map();
  const byAlias = new Map();

  for (const record of data.records ?? []) {
    byKey.set(record.key, record);
    // Canonical name and every alias resolve to the same record. Source data
    // carries trailing spaces on some names, so match on a normalised form.
    for (const name of [record.canonicalName, ...(record.aliases ?? [])]) {
      if (name) byAlias.set(normalize(name), record);
    }
  }

  cache = { data, byKey, byAlias, emitted: new Map() };
  return cache;
}

/** Mark-and-test helper: has this @id already been defined in full on `route`? */
function seenOnRoute(registry, route, id) {
  if (!registry.emitted.has(route)) registry.emitted.set(route, new Set());
  const seen = registry.emitted.get(route);
  if (seen.has(id)) return true;
  seen.add(id);
  return false;
}

function normalize(name) {
  return String(name).trim().toLowerCase();
}

/** Resolve a raw name from source data to a registry record, or null. */
export function resolveEntity(registry, name) {
  if (!name) return null;
  return registry.byAlias.get(normalize(name)) ?? null;
}

/** A bare `{"@id": …}` pointer — what every page other than `definedOn` emits. */
export function entityReference(record) {
  return { "@id": record.id };
}

/**
 * The full definition, emitted only on the record's `definedOn` route.
 *
 * These are nested inside memberOf / publisher / recognizedBy rather than pushed
 * as root graph nodes, because schema-contract treats Organization as a
 * singleton class: a second Organization-class node at the root of a route
 * throws. Nested nodes are not subject to that rule.
 */
export function entityFullNode(record, registry, route) {
  const node = {
    "@id": record.id,
    "@type": record.schemaType || "Organization",
    name: record.canonicalName,
  };
  if (record.sameAs?.length) node.sameAs = record.sameAs;
  // "supervised by X" was previously baked into the name string. It is a
  // relation, so it renders as one.
  if (record.regulator) {
    const regulator = registry.byKey.get(record.regulator);
    if (regulator) {
      // Define the regulator inline when this route owns it, so the reference
      // is never left dangling.
      node.parentOrganization =
        regulator.definedOn === route && !seenOnRoute(registry, route, regulator.id)
          ? entityFullNode(regulator, registry, route)
          : entityReference(regulator);
    }
  }
  return node;
}

/**
 * What to emit for `name` on `route`: the full definition if this is the page
 * that owns the entity, otherwise a reference. Returns null when the name is
 * not in the registry, so callers can fall back to their previous behaviour
 * rather than dropping data.
 */
export function emitEntity(registry, name, route) {
  const record = resolveEntity(registry, name);
  if (!record) return null;
  if (record.definedOn !== route) return entityReference(record);

  // Define once per route. HPWKI, for example, sits in both memberOf and
  // hasCredential.recognizedBy on /verify-jvto/legal; emitting the full object
  // twice is redundant, since consumers merge on @id anyway.
  if (!registry.emitted.has(route)) registry.emitted.set(route, new Set());
  const seen = registry.emitted.get(route);
  if (seen.has(record.id)) return entityReference(record);
  seen.add(record.id);
  return entityFullNode(record, registry, route);
}
