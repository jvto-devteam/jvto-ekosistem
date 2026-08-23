import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runSync } from "../../sync-knowledge-from-llm-wiki.mjs";
import { TRUST_CLAIMS_PATH } from "../../lib/llm-wiki-sync/run-generators.mjs";

const REQUIRED_FILES = [
  "claims.json",
  "faq.json",
  "aeo-snippets.json",
  "schema/organization.json",
  "schema/faq-page.json",
  "schema/tourist-trip.json",
  "_manifest.json",
];

function fakeManifest(overrides = {}) {
  return {
    schema_version: "trust-bundle/v1.0",
    compiled_at: "2026-08-22T22:02:40+00:00",
    compiler_version: "1.0.0",
    outputs: { claims: 1, schema_files: 3, faq_items: 1, aeo_snippets: 1 },
    validation: { F1: "pass", F2: "pass", F3: "pass", F4: "pass", F5: "pass", F6: "pass", F7: "pass", F8: "pass" },
    input_hashes: { "claim-registry.yml": "sha256:aaaa" },
    sync_contract: { required_files: REQUIRED_FILES },
    clean: true,
    ...overrides,
  };
}

function fakeBundle(manifest) {
  return {
    "_manifest.json": JSON.stringify(manifest, null, 2) + "\n",
    "claims.json": JSON.stringify({
      version: "1.0",
      compiled_at: manifest.compiled_at,
      claims: [
        {
          id: "C5",
          name: "Proof-First Trust",
          canonical_text: "Every claim is document-backed.",
          last_verified: "2026-08-22",
          evidence: [{ id: "E027", type: "official_authority", source_file: "b.md", description: "AHU", proof_ids: ["ahu-0010187-ptjvr"] }],
          derived_artifacts: [],
          narrative: { ai_snippet: "a", short: "b", cs_reply: "c" },
          decisions: [],
          tags: ["trust-signal"],
        },
      ],
    }, null, 2) + "\n",
    "faq.json": JSON.stringify({ version: "1.0", items: [{ question: "q", answer: "a", source_claim_id: "C5", target_pages: [] }] }, null, 2) + "\n",
    "aeo-snippets.json": JSON.stringify({ version: "1.0", snippets: [{ topic: "trust-signal", tldr: "t", claim_ids: ["C5"], use_for: [] }] }, null, 2) + "\n",
    "schema/organization.json": JSON.stringify({ "@type": "TravelAgency" }, null, 2) + "\n",
    "schema/faq-page.json": JSON.stringify({ "@type": "FAQPage", mainEntity: [] }, null, 2) + "\n",
    "schema/tourist-trip.json": JSON.stringify([{ "@type": "TouristTrip" }], null, 2) + "\n",
  };
}

function harness(manifest = fakeManifest(), presentFiles = REQUIRED_FILES) {
  const bundle = fakeBundle(manifest);
  return {
    readManifest: async () => manifest,
    readBundle: async () => bundle,
    listPresentFiles: async () => presentFiles,
  };
}

async function withTempRoot(fn) {
  const root = await mkdtemp(path.join(tmpdir(), "llm-wiki-sync-"));
  try {
    await mkdir(path.join(root, path.dirname(TRUST_CLAIMS_PATH)), { recursive: true });
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function treeSnapshot(dir) {
  const out = {};
  async function walk(current, prefix) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (err) {
      if (err.code === "ENOENT") return;
      throw err;
    }
    for (const entry of entries) {
      const rel = path.join(prefix, entry.name);
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(abs, rel);
      else out[rel] = await readFile(abs, "utf8");
    }
  }
  await walk(dir, "");
  return out;
}

const now = new Date("2026-08-23T00:00:00Z");

// A dry run must write zero bytes — the workflow's git-status check depends on it.
await withTempRoot(async (root) => {
  const before = await treeSnapshot(root);
  const result = await runSync({ dryRun: true, now, archiveRoot: root, ...harness() });
  const after = await treeSnapshot(root);

  assert.deepEqual(after, before, "a dry run must leave the tree byte-identical");
  assert.equal(result.changed, true, "it still reports what a real run would do");
  assert.deepEqual(result.written, []);
});

// A real run writes the snapshot at the path the manifest's sync_contract names,
// and composes the downstream core file.
await withTempRoot(async (root) => {
  const result = await runSync({ now, archiveRoot: root, ...harness() });

  assert.deepEqual(result.written, [TRUST_CLAIMS_PATH]);

  const bundleDir = path.join(root, "archive/llm-wiki-snapshot/trust-bundle");
  for (const rel of REQUIRED_FILES) {
    await readFile(path.join(bundleDir, rel), "utf8");
  }

  const composed = JSON.parse(await readFile(path.join(root, TRUST_CLAIMS_PATH), "utf8"));
  assert.deepEqual(Object.keys(composed), ["claims", "aeoSnippets", "faq"]);
  assert.equal(composed.claims[0].evidence[0].id, "E019", "upstream E027 lands as downstream E019");

  const report = JSON.parse(await readFile(path.join(root, "archive/llm-wiki-snapshot/sync-report.json"), "utf8"));
  assert.equal(report.claimCount, 1);
  assert.equal(report.changed, true);
});

// The unmanaged files are never written, whatever else happens.
await withTempRoot(async (root) => {
  await runSync({ now, archiveRoot: root, ...harness() });
  const written = Object.keys(await treeSnapshot(path.join(root, "archive/llm-wiki-snapshot")));
  for (const forbidden of ["people.json", "policies.json", "destinations.json", "products.json", "operational.json"]) {
    assert.equal(
      written.some((f) => f.endsWith(forbidden)),
      false,
      `${forbidden} is unmanaged upstream and must never be synced`
    );
  }
});

// Idempotence: the second run is a no-op and the tree stays byte-identical.
await withTempRoot(async (root) => {
  await runSync({ now, archiveRoot: root, ...harness() });
  const afterFirst = await treeSnapshot(root);

  const second = await runSync({ now: new Date("2026-08-24T00:00:00Z"), archiveRoot: root, ...harness() });
  const afterSecond = await treeSnapshot(root);

  assert.equal(second.changed, false, "an unchanged upstream bundle is not a change");
  assert.deepEqual(second.written, []);
  assert.deepEqual(afterSecond, afterFirst, "the second run must not touch a single byte");
});

// A recompile that only restamps compiled_at is not a change. Without this the
// nightly job would commit noise forever.
await withTempRoot(async (root) => {
  await runSync({ now, archiveRoot: root, ...harness() });
  const afterFirst = await treeSnapshot(root);

  const restamped = fakeManifest({ compiled_at: "2026-09-01T12:00:00+00:00", compiler_version: "1.0.1" });
  const second = await runSync({ now, archiveRoot: root, ...harness(restamped) });

  assert.equal(second.changed, false, "a restamped recompile of identical inputs is not a change");
  assert.deepEqual(await treeSnapshot(root), afterFirst);
});

// Genuine upstream change is picked up.
await withTempRoot(async (root) => {
  await runSync({ now, archiveRoot: root, ...harness() });
  const changed = fakeManifest({ input_hashes: { "claim-registry.yml": "sha256:bbbb" } });
  const second = await runSync({ now, archiveRoot: root, ...harness(changed) });
  assert.equal(second.changed, true);
});

// Negative gates: each must refuse AND write zero bytes.
for (const [label, manifest, present] of [
  ["clean: false", fakeManifest({ clean: false }), REQUIRED_FILES],
  ["wrong schema_version", fakeManifest({ schema_version: "trust-bundle/v0.9" }), REQUIRED_FILES],
  ["a failing validation rule", fakeManifest({ validation: { F1: "pass", F2: "fail" } }), REQUIRED_FILES],
  ["a missing required file", fakeManifest(), REQUIRED_FILES.filter((f) => f !== "faq.json")],
  ["no manifest at all", null, REQUIRED_FILES],
]) {
  await withTempRoot(async (root) => {
    const before = await treeSnapshot(root);
    await assert.rejects(
      () => runSync({ now, archiveRoot: root, ...harness(manifest ?? fakeManifest(), present), readManifest: async () => manifest }),
      /llm-wiki sync refused/,
      `${label} must be refused`
    );
    assert.deepEqual(await treeSnapshot(root), before, `${label} must write zero bytes`);
  });

  // …and refused under --dry-run too, since the gate runs there as well.
  await withTempRoot(async (root) => {
    await assert.rejects(
      () => runSync({ dryRun: true, now, archiveRoot: root, ...harness(manifest ?? fakeManifest(), present), readManifest: async () => manifest }),
      /llm-wiki sync refused/,
      `${label} must be refused under --dry-run`
    );
  });
}

// The mass-removal guard fires on a collapsed bundle, after a good first sync.
await withTempRoot(async (root) => {
  await runSync({ now, archiveRoot: root, ...harness() });

  const emptied = fakeManifest({ input_hashes: { "claim-registry.yml": "sha256:cccc" }, outputs: { claims: 0 } });
  const bundle = fakeBundle(emptied);
  bundle["claims.json"] = JSON.stringify({ version: "1.0", claims: [] }, null, 2) + "\n";

  const before = await treeSnapshot(root);
  await assert.rejects(
    () =>
      runSync({
        now,
        archiveRoot: root,
        readManifest: async () => emptied,
        readBundle: async () => bundle,
        listPresentFiles: async () => REQUIRED_FILES,
      }),
    /0 claims/,
    "an emptied upstream bundle must be refused"
  );
  assert.deepEqual(await treeSnapshot(root), before, "a refused sync writes zero bytes");
});

// Frozen fields survive a real sync and are recorded in conflicts.json.
await withTempRoot(async (root) => {
  await writeFile(
    path.join(root, TRUST_CLAIMS_PATH),
    JSON.stringify(
      {
        _comment: "downstream note",
        claims: [{ id: "C5", evidence: [], derived_artifacts: [{ id: "E017", kind: "verification_dossier", title: "t", description: "d", source_file: "e.md" }] }],
        aeoSnippets: [],
        faq: [],
      },
      null,
      2
    ) + "\n"
  );

  await runSync({ now, archiveRoot: root, ...harness() });

  const composed = JSON.parse(await readFile(path.join(root, TRUST_CLAIMS_PATH), "utf8"));
  assert.equal(composed._comment, "downstream note", "downstream provenance survives");
  assert.equal(composed.claims[0].derived_artifacts[0].kind, "verification_dossier", "downstream shape survives");

  const conflicts = JSON.parse(await readFile(path.join(root, "archive/llm-wiki-snapshot/conflicts.json"), "utf8"));
  assert.ok(Array.isArray(conflicts.conflicts), "conflicts.json is always written on a real run");
});

console.log("sync.test.mjs: all assertions passed");
