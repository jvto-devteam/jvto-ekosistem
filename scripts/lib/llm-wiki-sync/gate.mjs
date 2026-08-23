import { createHash } from "node:crypto";

export const SCHEMA_VERSION = "trust-bundle/v1.0";
export const VALIDATION_RULES = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"];

// A drop this large means the upstream compiler lost inputs, not that JVTO
// retired claims. Same guard class as MASS_REMOVAL_THRESHOLD in sync-booking-data.mjs.
export const MASS_REMOVAL_THRESHOLD = 0.3;

// Files the manifest lists under unmanaged_files: co-located in the bundle
// directory but written by no script and covered by neither the F1-F8
// validation nor the input hashes. Never read, never sync.
export const UNMANAGED_FILES = [
  "destinations.json",
  "operational.json",
  "people.json",
  "policies.json",
  "products.json",
  "extended-bundle-receipt.md",
];

/**
 * Implements the manifest's own sync_contract.failure_rule:
 *   "Refuse sync if schema_version mismatches, clean is not true, any required
 *    file is missing, or any rule in the validation block is not 'pass'."
 *
 * Pure: `filesOnDisk` is the caller's already-resolved set of bundle-relative
 * paths that exist, so this module does no I/O and stays unit-testable.
 *
 * Returns an error string, or null when the bundle may be synced.
 */
export function gateBundle(manifest, filesOnDisk = []) {
  if (!manifest || typeof manifest !== "object") {
    return "_manifest.json missing or unreadable — upstream trust-bundle was not compiled";
  }

  if (manifest.schema_version !== SCHEMA_VERSION) {
    return `schema_version is ${JSON.stringify(manifest.schema_version)}, expected ${JSON.stringify(SCHEMA_VERSION)} — upstream compiler version changed, or llm-wiki PR #47 is not merged`;
  }

  if (manifest.clean !== true) {
    return `clean is ${JSON.stringify(manifest.clean)}, expected true — the upstream compiler reported errors and its output must not be trusted`;
  }

  const validation = manifest.validation ?? {};
  const failed = VALIDATION_RULES.filter((rule) => validation[rule] !== "pass");
  if (failed.length > 0) {
    return `validation rules not passing: ${failed.join(", ")} — re-run the llm-wiki compiler and fix the findings before syncing`;
  }

  const required = manifest.sync_contract?.required_files;
  if (!Array.isArray(required)) {
    return "sync_contract.required_files is absent or not an array — the manifest does not carry a sync contract";
  }

  const present = new Set(filesOnDisk);
  const missing = required.filter((file) => !present.has(file));
  if (missing.length > 0) {
    return `required files missing from the upstream bundle: ${missing.join(", ")} — the compiler run was incomplete`;
  }

  return null;
}

/**
 * Guards against an upstream regression that empties the bundle. Runs after the
 * manifest gate because it needs the parsed claims.
 */
export function gateClaimCount(previousCount, currentCount) {
  if (previousCount > 0 && currentCount === 0) {
    return `claims.json contains 0 claims, previous sync held ${previousCount} — refusing to erase the downstream trust claims`;
  }
  if (previousCount > 0 && previousCount - currentCount > previousCount * MASS_REMOVAL_THRESHOLD) {
    const removed = previousCount - currentCount;
    return `claims dropped from ${previousCount} to ${currentCount} (${removed} removed), above the ${MASS_REMOVAL_THRESHOLD * 100}% mass-removal threshold — treat as upstream degradation, not an intentional retirement`;
  }
  return null;
}

/**
 * Identity of the bundle's *content*.
 *
 * Deliberately excludes `compiled_at`, `generated_by` and `compiler_version`:
 * the upstream compiler restamps `compiled_at` on every run even when the
 * inputs are byte-identical, so hashing the whole manifest would report a
 * change nightly and commit noise forever. `input_hashes` covers the six
 * source registries and `outputs` covers the record counts, which together
 * change if and only if the compiled content changes.
 */
export function bundleFingerprint(manifest) {
  const material = {
    schema_version: manifest.schema_version,
    input_hashes: manifest.input_hashes ?? {},
    outputs: manifest.outputs ?? {},
  };
  return createHash("sha256").update(JSON.stringify(canonicalize(material))).digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}
