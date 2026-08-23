import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  readManifest as defaultReadManifest,
  readBundle as defaultReadBundle,
  listPresentFiles as defaultListPresentFiles,
  resolveLlmWikiRoot,
} from "./lib/llm-wiki-sync/read.mjs";
import { gateBundle, gateClaimCount, bundleFingerprint } from "./lib/llm-wiki-sync/gate.mjs";
import { runGenerators } from "./lib/llm-wiki-sync/run-generators.mjs";

const SNAPSHOT_DIR = "archive/llm-wiki-snapshot";
// sync_contract.targets["jvto-ekosistem"] in the upstream manifest.
const SNAPSHOT_BUNDLE_DIR = `${SNAPSHOT_DIR}/trust-bundle`;

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

export async function runSync({
  dryRun = false,
  now = new Date(),
  archiveRoot = process.cwd(),
  llmWikiRoot = undefined,
  readManifest = defaultReadManifest,
  readBundle = defaultReadBundle,
  listPresentFiles = defaultListPresentFiles,
} = {}) {
  const wikiRoot = resolveLlmWikiRoot(llmWikiRoot);
  const snapshotDir = path.join(archiveRoot, SNAPSHOT_DIR);
  const snapshotBundleDir = path.join(archiveRoot, SNAPSHOT_BUNDLE_DIR);

  // --- Gate. Everything below runs under --dry-run too. ---
  const manifest = await readManifest(wikiRoot);
  const presentFiles = await listPresentFiles(wikiRoot);

  const gateError = gateBundle(manifest, presentFiles);
  if (gateError) {
    throw new Error(`llm-wiki sync refused: ${gateError}`);
  }

  const bundle = await readBundle(wikiRoot);
  const claims = JSON.parse(bundle["claims.json"]).claims;

  const previousManifest = await readJsonIfExists(
    path.join(snapshotBundleDir, "_manifest.json"),
    null
  );
  const previousClaims = await readJsonIfExists(
    path.join(snapshotBundleDir, "claims.json"),
    null
  );
  const previousCount = previousClaims?.claims?.length ?? 0;

  const countError = gateClaimCount(previousCount, claims.length);
  if (countError) {
    throw new Error(`llm-wiki sync refused: ${countError}`);
  }

  // --- Change detection on content identity, not on compiled_at. ---
  const fingerprint = bundleFingerprint(manifest);
  const previousFingerprint = previousManifest ? bundleFingerprint(previousManifest) : null;
  const changed = fingerprint !== previousFingerprint;

  const report = {
    generatedAt: now.toISOString(),
    schemaVersion: manifest.schema_version,
    clean: manifest.clean,
    compiledAt: manifest.compiled_at,
    fingerprint,
    previousFingerprint,
    changed,
    claimCount: claims.length,
    previousClaimCount: previousCount,
    syncedFiles: Object.keys(bundle),
  };

  // A run with nothing to sync must leave the working tree byte-identical, so
  // the workflow's git-status check finds nothing and makes no empty commit.
  if (dryRun || !changed) {
    return { report, changed, conflicts: [], written: [] };
  }

  await mkdir(path.join(snapshotBundleDir, "schema"), { recursive: true });
  for (const [rel, contents] of Object.entries(bundle)) {
    await writeFile(path.join(snapshotBundleDir, rel), contents);
  }

  const { written, conflicts } = await runGenerators({ archiveRoot });

  await writeFile(
    path.join(snapshotDir, "sync-report.json"),
    JSON.stringify({ ...report, written }, null, 2) + "\n"
  );
  await writeFile(
    path.join(snapshotDir, "conflicts.json"),
    JSON.stringify(
      {
        _comment:
          "Fields where upstream and downstream disagree and the sync deliberately keeps the downstream value. Owner decision 2026-08-23. Resolving one of these means editing the downstream file and removing its entry from FROZEN_FIELDS in scripts/lib/llm-wiki-sync/generators/trust-claims.mjs.",
        generatedAt: now.toISOString(),
        conflicts,
      },
      null,
      2
    ) + "\n"
  );

  return { report, changed, conflicts, written };
}

const isMainModule =
  path.resolve(process.argv[1] ?? "") === path.resolve(new URL(import.meta.url).pathname);
if (isMainModule) {
  const dryRun = process.argv.includes("--dry-run");
  const result = await runSync({ dryRun });
  console.log(JSON.stringify(result.report, null, 2));
  if (dryRun) {
    console.log(
      result.changed
        ? "[dry-run] upstream bundle has changed; a real run would rewrite the snapshot and trust-claims.json. No files written."
        : "[dry-run] upstream bundle unchanged; a real run would write nothing."
    );
  } else if (!result.changed) {
    console.log("No change in the upstream bundle; nothing written.");
  } else {
    console.log(`Wrote ${result.written.join(", ")}`);
    if (result.conflicts.length > 0) {
      console.log(
        `${result.conflicts.length} frozen-field conflict(s) kept at the downstream value — see ${SNAPSHOT_DIR}/conflicts.json`
      );
    }
  }
}
