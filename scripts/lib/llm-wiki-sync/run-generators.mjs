import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateTrustClaims } from "./generators/trust-claims.mjs";

// Deliberately separate from scripts/run-generators.mjs, which belongs to
// booking-sync. Wiring these into that list made every booking sync try to load
// an llm-wiki snapshot it has no reason to need.
export const TRUST_CLAIMS_PATH =
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/trust-claims.json";

const SNAPSHOT_BUNDLE = "archive/llm-wiki-snapshot/trust-bundle";

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readJsonIfExists(file, fallback) {
  try {
    return await readJson(file);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

/**
 * Read the snapshot written by layer 1 and compose the downstream core files.
 * Returns the written paths plus any frozen-field conflicts, which the sync
 * persists to archive/llm-wiki-snapshot/conflicts.json.
 */
export async function runGenerators({ archiveRoot = process.cwd() } = {}) {
  const bundleDir = path.join(archiveRoot, SNAPSHOT_BUNDLE);

  const claims = (await readJson(path.join(bundleDir, "claims.json"))).claims;
  const aeoSnippets = (await readJson(path.join(bundleDir, "aeo-snippets.json"))).snippets;
  const faq = (await readJson(path.join(bundleDir, "faq.json"))).items;

  const target = path.join(archiveRoot, TRUST_CLAIMS_PATH);
  const previous = await readJsonIfExists(target, null);

  const { file, conflicts } = generateTrustClaims({ claims, aeoSnippets, faq, previous });

  await writeFile(target, JSON.stringify(file, null, 2) + "\n");

  return { written: [TRUST_CLAIMS_PATH], conflicts };
}
