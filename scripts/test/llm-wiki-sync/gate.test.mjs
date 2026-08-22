import assert from "node:assert/strict";
import { gateBundle, diffBundle, hashManifest } from "../../lib/llm-wiki-sync/gate.mjs";

// Test gate validation
const validManifest = {
  schema_version: "trust-bundle/v1.0",
  clean: true,
  sync_contract: {
    required_files: ["claims.json", "people.json"],
  },
};

const result1 = gateBundle(validManifest);
assert.strictEqual(result1, null, "valid manifest should pass gate");

const badSchema = { ...validManifest, schema_version: "trust-bundle/v2.0" };
const result2 = gateBundle(badSchema);
assert.strictEqual(typeof result2, "string", "invalid schema should fail gate");

const notClean = { ...validManifest, clean: false };
const result3 = gateBundle(notClean);
assert.strictEqual(typeof result3, "string", "clean=false should fail gate");

// Test diffing
const diff1 = diffBundle({}, validManifest);
assert.strictEqual(diff1.added.length, 1, "new manifest should be added");
assert.strictEqual(diff1.removed.length, 0, "no removals on first diff");

const diff2 = diffBundle(validManifest, validManifest);
assert.strictEqual(diff2.added.length, 0, "unchanged manifest has no additions");
assert.strictEqual(diff2.removed.length, 0, "unchanged manifest has no removals");
assert.strictEqual(diff2.updated.length, 0, "unchanged manifest has no updates");

console.log("gate.test.mjs: all assertions passed");
