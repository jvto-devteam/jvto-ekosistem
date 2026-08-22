/**
 * change-tracker.mjs
 * 
 * Canonical JSON serialization, SHA-256 hashing, and manifest diffing.
 * Used by both jvto-ekosistem (booking sync) and llm-wiki (ingestion tracking).
 * 
 * Exports:
 * - canonicalize(value): normalize object key order and array values for deterministic hashing
 * - hashRecord(record): return SHA-256 digest of canonicalized record
 * - diffManifest(previousManifest, currentRecords, options): compute added/updated/removed/unchanged sets
 */

import { createHash } from "node:crypto";

/**
 * Recursively canonicalize a value: sort object keys, recurse into arrays and objects.
 * Returns a deterministic structure suitable for hashing.
 * 
 * @param {*} value - Any value (object, array, primitive)
 * @returns {*} Canonicalized value
 */
function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

/**
 * Compute SHA-256 hash of a record.
 * 
 * Canonicalizes the record (deterministic key order) before hashing,
 * so identical data always produces the same hash regardless of key order.
 * 
 * @param {object} record - Object to hash
 * @returns {string} Hex-encoded SHA-256 digest
 */
export function hashRecord(record) {
  const canonical = JSON.stringify(canonicalize(record));
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Diff two manifest states: previous state and current records.
 * 
 * Manifest format (both input and output):
 *   { "<recordId>": { hash: string, ...metadata } }
 * 
 * @param {object} previousManifest - Previous manifest state (or empty object)
 * @param {array} currentRecords - Array of current records
 * @param {object} options - Configuration object:
 *   - idField: key name to extract record ID (default: "id")
 *   - hashFn: custom hash function (default: hashRecord)
 *   - metadataFn: custom metadata extractor (default: () => ({}))
 * @returns {object} Diff object:
 *   { added: [ids], updated: [ids], unchanged: [ids], removed: [ids], manifest: { <nextManifest> } }
 */
export function diffManifest(previousManifest, currentRecords, options = {}) {
  const {
    idField = "id",
    hashFn = hashRecord,
    metadataFn = () => ({}),
  } = options;

  const added = [];
  const updated = [];
  const unchanged = [];
  const nextManifest = {};
  const seenIds = new Set();

  for (const record of currentRecords) {
    const recordId = String(record[idField]);
    seenIds.add(recordId);
    const hash = hashFn(record);
    const metadata = metadataFn(record);
    nextManifest[recordId] = { hash, ...metadata };

    const previous = previousManifest[recordId];
    if (!previous) {
      added.push(recordId);
    } else if (previous.hash !== hash) {
      updated.push(recordId);
    } else {
      unchanged.push(recordId);
    }
  }

  const removed = Object.keys(previousManifest).filter((id) => !seenIds.has(id));

  return { added, removed, updated, unchanged, manifest: nextManifest };
}

/**
 * Export canonicalize for direct use when needed (e.g., custom hashing or inspection).
 */
export { canonicalize };
