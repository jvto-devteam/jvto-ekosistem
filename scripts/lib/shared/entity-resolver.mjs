/**
 * entity-resolver.mjs
 * 
 * Unified entity registry and resolution for organizations, people, and credentials.
 * Used by both jvto-ekosistem (schema building) and llm-wiki (ingestion).
 * 
 * Prevents dangling references and maintains canonical @id mappings across routes.
 * 
 * Exports:
 * - loadRegistry(filepath, loader): load registry from file (JSON or custom)
 * - resolveEntity(registry, name): resolve name to registry record via alias map
 * - entityReference(record): emit bare reference object
 * - entityFullNode(record, registry, route): emit full definition (once per route)
 * - emitEntity(registry, name, route): smart emit (full on owned route, reference elsewhere)
 */

/**
 * Load an entity registry from a file.
 * 
 * Registry file format (default JSON):
 *   { records: [ { key, canonicalName, aliases, id, definedOn, ... } ] }
 * 
 * Returns cached registry with lookup maps:
 *   { data, byKey, byAlias, emitted }
 * 
 * @param {string} filepath - Path to registry file
 * @param {function} loader - Async function to load and parse file (default: JSON)
 * @returns {Promise<object>} Registry object with lookup maps
 */
export async function loadRegistry(filepath, loader = defaultJsonLoader) {
  const data = await loader(filepath);
  const byKey = new Map();
  const byAlias = new Map();

  for (const record of data.records ?? []) {
    byKey.set(record.key, record);
    // Canonical name and every alias resolve to the same record.
    for (const name of [record.canonicalName, ...(record.aliases ?? [])]) {
      if (name) byAlias.set(normalize(name), record);
    }
  }

  return { data, byKey, byAlias, emitted: new Map() };
}

/**
 * Default JSON loader for registry files.
 */
async function defaultJsonLoader(filepath) {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(filepath, "utf8");
  return JSON.parse(raw);
}

/**
 * Normalize a name for lookup: trim, lowercase.
 */
function normalize(name) {
  return String(name).trim().toLowerCase();
}

/**
 * Resolve a raw name to a registry record, or null if not found.
 * Uses the byAlias map for fast lookup.
 * 
 * @param {object} registry - Loaded registry
 * @param {string} name - Entity name to resolve
 * @returns {object|null} Registry record or null
 */
export function resolveEntity(registry, name) {
  if (!name) return null;
  return registry.byAlias.get(normalize(name)) ?? null;
}

/**
 * Emit a bare @id reference: { "@id": "..." }.
 * Used when the entity is defined elsewhere.
 * 
 * @param {object} record - Registry record
 * @returns {object} Reference object
 */
export function entityReference(record) {
  return { "@id": record.id };
}

/**
 * Emit a full entity definition.
 * Only called on the route that owns the entity (record.definedOn === route).
 * 
 * Nested entities (regulator, parent) are emitted inline to avoid root-level
 * singleton violations in schema.org validation.
 * 
 * @param {object} record - Registry record
 * @param {object} registry - Registry object
 * @param {string} route - Current route being rendered
 * @returns {object} Full entity node
 */
export function entityFullNode(record, registry, route) {
  const node = {
    "@id": record.id,
    "@type": record.schemaType || "Organization",
    name: record.canonicalName,
  };

  if (record.sameAs?.length) node.sameAs = record.sameAs;

  // Parent/regulator relationship, rendered inline to avoid dangling refs.
  if (record.regulator) {
    const regulator = registry.byKey.get(record.regulator);
    if (regulator) {
      node.parentOrganization =
        regulator.definedOn === route && !seenOnRoute(registry, route, regulator.id)
          ? entityFullNode(regulator, registry, route)
          : entityReference(regulator);
    }
  }

  return node;
}

/**
 * Smart entity emit: full definition if owned, reference otherwise.
 * Returns null if entity not in registry (caller falls back).
 * 
 * Tracks emitted entities per route to avoid redundant definitions
 * (e.g., HPWKI in both memberOf and hasCredential.recognizedBy).
 * 
 * @param {object} registry - Registry object
 * @param {string} name - Entity name to emit
 * @param {string} route - Current route
 * @returns {object|null} Emitted node or null if not found
 */
export function emitEntity(registry, name, route) {
  const record = resolveEntity(registry, name);
  if (!record) return null;

  // Reference if owned by another route
  if (record.definedOn !== route) return entityReference(record);

  // Track emissions per route to avoid duplication
  if (!registry.emitted.has(route)) registry.emitted.set(route, new Set());
  const seen = registry.emitted.get(route);
  if (seen.has(record.id)) return entityReference(record);
  seen.add(record.id);

  return entityFullNode(record, registry, route);
}

/**
 * Internal: check if an @id has already been fully defined on this route.
 */
function seenOnRoute(registry, route, id) {
  if (!registry.emitted.has(route)) registry.emitted.set(route, new Set());
  const seen = registry.emitted.get(route);
  if (seen.has(id)) return true;
  seen.add(id);
  return false;
}
