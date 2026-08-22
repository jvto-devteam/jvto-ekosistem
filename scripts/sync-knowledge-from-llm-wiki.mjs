import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  readManifest as defaultReadManifest,
  readBundle as defaultReadBundle,
} from "./lib/llm-wiki-sync/read.mjs";
import { gateBundle, diffBundle } from "./lib/llm-wiki-sync/gate.mjs";
import { runGenerators } from "./run-generators.mjs";

export async function runSync({
  dryRun = false,
  now = new Date(),
  archiveRoot = process.cwd(),
  llmWikiRoot = path.join(process.cwd(), "..", "llm-wiki"),
  readManifest = defaultReadManifest,
  readBundle = defaultReadBundle,
} = {}) {
  const snapshotDir = path.join(archiveRoot, "archive/llm-wiki-snapshot");

  // Read the upstream manifest and validate the gate
  const manifest = await readManifest(llmWikiRoot);
  const gateError = gateBundle(manifest);
  if (gateError) {
    throw new Error(`llm-wiki sync gate failed: ${gateError}`);
  }

  // Read the upstream bundle
  const bundle = await readBundle(llmWikiRoot);

  // Read previous state for diffing
  let previousManifest = {};
  try {
    const prevContent = await readFile(path.join(snapshotDir, "manifest.json"), "utf8");
    previousManifest = JSON.parse(prevContent);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  // Diff the manifest to detect changes
  const diff = diffBundle(previousManifest, manifest);

  // Report without writing on dry-run
  const report = {
    generatedAt: now.toISOString(),
    schemaVersion: manifest.schema_version,
    clean: manifest.clean,
    added: diff.added,
    removed: diff.removed,
    updated: diff.updated,
    unchangedCount: diff.unchanged.length,
  };

  const hasChanges = diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0;

  // A run with nothing to sync must leave the working tree byte-identical
  if (dryRun || !hasChanges) {
    return { diff, report, bundle };
  }

  // Write snapshot and manifest
  await mkdir(snapshotDir, { recursive: true });

  // Snapshot the entire bundle for reference
  await writeFile(
    path.join(snapshotDir, "bundle.json"),
    JSON.stringify(bundle, null, 2) + "\n"
  );

  // Store the manifest for next run's diff
  await writeFile(
    path.join(snapshotDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );

  // Store the sync report
  await writeFile(
    path.join(snapshotDir, "sync-report.json"),
    JSON.stringify(report, null, 2) + "\n"
  );

  // Run generators to create derived outputs
  await runGenerators({ archiveRoot });

  return { diff, report, bundle };
}

const isMainModule = path.resolve(process.argv[1] ?? "") === path.resolve(new URL(import.meta.url).pathname);
if (isMainModule) {
  const dryRun = process.argv.includes("--dry-run");
  const result = await runSync({ dryRun });
  console.log(JSON.stringify(result.report, null, 2));
  if (dryRun) {
    console.log(`[dry-run] would sync ${result.diff.added.length + result.diff.updated.length} file(s); no files written.`);
  } else if (result.report.added.length === 0 && result.report.removed.length === 0 && result.report.updated.length === 0) {
    console.log("No changes detected; nothing written.");
  }
}
