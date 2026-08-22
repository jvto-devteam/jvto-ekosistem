import crypto from "node:crypto";

/**
 * Validate the trust-bundle manifest against sync requirements.
 * Returns an error string if validation fails, null if valid.
 */
export function gateBundle(manifest) {
  // Check schema_version
  if (!manifest.schema_version) {
    return "missing schema_version in manifest";
  }
  if (manifest.schema_version !== "trust-bundle/v1.0") {
    return `unexpected schema_version: ${manifest.schema_version} (expected trust-bundle/v1.0)`;
  }

  // Check clean flag
  if (manifest.clean !== true) {
    return `clean flag is not true: ${manifest.clean}`;
  }

  // Check sync_contract exists
  if (!manifest.sync_contract) {
    return "missing sync_contract in manifest";
  }

  // Check required files are listed
  if (!Array.isArray(manifest.sync_contract.required_files)) {
    return "sync_contract.required_files is not an array";
  }

  return null;
}

/**
 * Compute a content hash for diffing.
 */
export function hashManifest(manifest) {
  const str = JSON.stringify(manifest, null, 2);
  return crypto.createHash("sha256").update(str).digest("hex");
}

/**
 * Diff the previous manifest against the current one.
 * Returns {added, removed, updated, unchanged, manifest, hash}.
 */
export function diffBundle(previousManifest, currentManifest) {
  // Compute hashes for comparison
  const previousHash = previousManifest && Object.keys(previousManifest).length > 0
    ? hashManifest(previousManifest)
    : null;
  const currentHash = hashManifest(currentManifest);

  if (previousHash === currentHash) {
    // No changes
    return {
      added: [],
      removed: [],
      updated: [],
      unchanged: [currentManifest.schema_version],
      manifest: currentManifest,
      hash: currentHash,
    };
  }

  // For now, treat any manifest change as a full update
  // (the bundle is atomic; either it all changes or nothing does)
  return {
    added: [currentManifest.schema_version],
    removed: previousHash !== null ? [previousManifest.schema_version ?? "unknown"] : [],
    updated: [],
    unchanged: [],
    manifest: currentManifest,
    hash: currentHash,
  };
}
