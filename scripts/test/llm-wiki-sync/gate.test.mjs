import assert from "node:assert/strict";
import {
  gateBundle,
  gateClaimCount,
  bundleFingerprint,
  UNMANAGED_FILES,
} from "../../lib/llm-wiki-sync/gate.mjs";

const REQUIRED_FILES = [
  "claims.json",
  "faq.json",
  "aeo-snippets.json",
  "schema/organization.json",
  "schema/faq-page.json",
  "schema/tourist-trip.json",
  "_manifest.json",
];

function manifest(overrides = {}) {
  return {
    schema_version: "trust-bundle/v1.0",
    compiled_at: "2026-08-22T22:02:40+00:00",
    compiler_version: "1.0.0",
    outputs: { claims: 9, schema_files: 3, faq_items: 9, aeo_snippets: 9 },
    validation: { F1: "pass", F2: "pass", F3: "pass", F4: "pass", F5: "pass", F6: "pass", F7: "pass", F8: "pass" },
    input_hashes: {
      "claim-registry.yml": "sha256:6a5e2552a305f456",
      "evidence-registry.yml": "sha256:8b41e7f8e98bfe66",
    },
    sync_contract: { required_files: REQUIRED_FILES },
    clean: true,
    ...overrides,
  };
}

// Happy path
{
  assert.equal(gateBundle(manifest(), REQUIRED_FILES), null, "a clean, complete bundle passes");
}

// Negative: manifest absent entirely
{
  const err = gateBundle(null, REQUIRED_FILES);
  assert.equal(typeof err, "string");
  assert.match(err, /_manifest\.json missing/);
}

// Negative: wrong schema_version — the §0 signal that llm-wiki PR #47 is unmerged
{
  const err = gateBundle(manifest({ schema_version: "trust-bundle/v0.9" }), REQUIRED_FILES);
  assert.match(err, /schema_version/);
  assert.match(err, /PR #47/);
  assert.equal(gateBundle(manifest({ schema_version: undefined }), REQUIRED_FILES) === null, false);
}

// Negative: clean false
{
  const err = gateBundle(manifest({ clean: false }), REQUIRED_FILES);
  assert.match(err, /clean is false/);
}

// Negative: a validation rule not passing. This is the check the first
// implementation lacked entirely, and the one jvto-web already performs.
{
  const failing = manifest();
  failing.validation.F5 = "fail";
  const err = gateBundle(failing, REQUIRED_FILES);
  assert.match(err, /F5/);

  const missingBlock = gateBundle(manifest({ validation: undefined }), REQUIRED_FILES);
  assert.match(missingBlock, /validation rules not passing/, "an absent validation block fails closed");
}

// Negative: a required file missing from disk
{
  const onDisk = REQUIRED_FILES.filter((f) => f !== "schema/faq-page.json");
  const err = gateBundle(manifest(), onDisk);
  assert.match(err, /schema\/faq-page\.json/);
}

// Negative: no sync contract at all
{
  const err = gateBundle(manifest({ sync_contract: {} }), REQUIRED_FILES);
  assert.match(err, /required_files/);
}

// Mass-change guard
{
  assert.equal(gateClaimCount(0, 9), null, "a first sync is never a mass removal");
  assert.equal(gateClaimCount(9, 9), null, "no change passes");
  assert.equal(gateClaimCount(9, 8), null, "one claim retired is within threshold");

  const emptied = gateClaimCount(9, 0);
  assert.match(emptied, /0 claims/, "an emptied bundle is refused");

  const collapsed = gateClaimCount(9, 5);
  assert.match(collapsed, /mass-removal threshold/, "a 44% drop is refused");
}

// Fingerprint ignores the restamped compiled_at, which is what makes the
// second run a no-op instead of a nightly noise commit.
{
  const a = manifest();
  const b = manifest({ compiled_at: "2026-09-01T00:00:00+00:00", compiler_version: "1.0.1" });
  assert.equal(bundleFingerprint(a), bundleFingerprint(b), "recompiling identical inputs is not a change");

  const c = manifest({ input_hashes: { "claim-registry.yml": "sha256:different" } });
  assert.notEqual(bundleFingerprint(a), bundleFingerprint(c), "changed inputs are a change");

  const d = manifest({ outputs: { claims: 8, schema_files: 3, faq_items: 9, aeo_snippets: 9 } });
  assert.notEqual(bundleFingerprint(a), bundleFingerprint(d), "changed record counts are a change");
}

// The unmanaged list must stay in step with the upstream manifest.
{
  for (const f of ["people.json", "policies.json", "destinations.json", "products.json", "operational.json"]) {
    assert.equal(UNMANAGED_FILES.includes(f), true, `${f} must be treated as unmanaged`);
  }
  assert.equal(UNMANAGED_FILES.includes("claims.json"), false, "claims.json is a managed artifact");
}

console.log("gate.test.mjs: all assertions passed");
